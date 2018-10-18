/*
 * NOTICE
 * This software was produced for the U.S. Government and is subject to the
 * Rights in Data-General Clause 5.227-14 (May 2014).
 * Copyright 2018 The MITRE Corporation. All rights reserved.
 * Approved for Public Release; Distribution Unlimited. Case 18-2165
 *
 * This project contains content developed by The MITRE Corporation.
 * If this code is used in a deployment or embedded within another project,
 * it is requested that you send an email to opensource@mitre.org
 * in order to let us know where this software is being used.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');

var NLP = require('../../utils/nlpServices');
var elastic = require('../../utils/elasticSearch');
var log = require('../../utils/logger').logger;
var Entry = mongoose.model('Entry');
var Organization = mongoose.model('Organization');
var escape = require('escape-html');


// On server start-up - loads langCodes into memory
var langCodeMap = {};
var onStartUp = function () {
	try {
		var lc = JSON.parse(fs.readFileSync(path.join(__dirname, '/../../utils/langCodes.json')));
		langCodeMap = lc.languageCodes;
	} catch (e) {
		throw new Error('failed to load langCodes > ' + e);
	}
};
onStartUp();

// NOTE: This middleware function MUST be mounted BEFORE searchTermParam
exports.langCodeParam = function (req, res, next) {
	var langCode = null;
	if (req.method === 'POST') {
		if ( !req.body.langCode ) {
            return next(new Error('Badly formed request body. langCode is a required field'));
        }

		langCode = req.body.langCode;
	}
	else if (req.method === 'GET') {
		if ( !req.query.langCode ) {
            return next(new Error('Badly formed request parameter. langCode is a required field'));
        }
		langCode = req.query.langCode;
	}
	else {
        return next(new Error('The HTTP verb: {' + req.method + '} is not supported'));
    }

	if ( !(langCode in langCodeMap) ) {
		return next(new Error('Bad langCode submitted'));
	} else {
		req.langCode = langCode;
		return next(); // valid langCode
	}
};

// NOTE: This middleware function MUST be mounted AFTER langCodeParam
exports.searchTermParam = function (req, res, next) {
	var searchTerm = null;

	if (req.method === 'POST') {
		if ( !req.body.searchTerm ) {
            return next(new Error('Badly formed request body. searchTerm is a required field'));
        }
		searchTerm = req.body.searchTerm;
	}
	else if (req.method === 'GET') {
		if ( !req.query.searchTerm ) {
            return next(new Error('Badly formed request parameter. searchTerm is a required field'));
        }
		searchTerm = decodeURIComponent(req.query.searchTerm);
	}
	else {
        return next(new Error('The HTTP verb: {' + req.method + '} is not supported'));
    }

	NLP.callService(searchTerm, req.langCode, true)
	.then( function (normalizedTerm) {
		// TODO: TEMP until tokenization is added to NLP Services
		req.ktSearchTerm = normalizedTerm[0].Text;
		next();
	}).catch(next);
};

exports.glossScopeParam = function (req, res, next) {

	req.glossScope = req.body.glossScope;
	return next();

};

// Cleans the response from elastic and returns a dictionary of scores keyed with mongoIds
var getIdDict = function (resp) {
	// Remove dups
	resp = Array.from(new Set(resp));

	var entryIds = {};

	// Converts Elastic's response to a dictionary keyed by mongo Entry _ids
	resp.forEach( function (entry) {
		// Convert highlight array to object as well
		if(!entryIds[entry._source.mongoEntry]){
			entryIds[entry._source.mongoEntry] = entry;
			entryIds[entry._source.mongoEntry].highlightTermText = {};
		}

		// Store the highlighted term text in an object
		if(!!entry.highlight && entry.highlight.termText.length > 0){
			entryIds[entry._source.mongoEntry].highlightTermText[entry._id] = entry.highlight.termText[0];
		}
	});

	return entryIds;
};

var processMongoQuery = function (entries, entryDict) {
	log.debug(`Search returned ${entries.length} results...`);

/*	entries.forEach(entry => {
		entry._score = entryDict[entry._id]._score;
	});*/

	entries.forEach(function (entry) {
		entry._score = entryDict[entry._id]._score;
		// Loop through each term to see if there's a matching highlight
		entry.terms.forEach(term => {

			var termId = term._id.toString();

			// If we've got a highlight text, populate that onto the term itself
			if (!!entryDict[entry._id].highlightTermText[termId]) {
				term.highlightTermText = entryDict[entry._id].highlightTermText[termId];
			}

		});
	});

	// return sorted (by sort), populated array of Entries
	return entries.sort( function (a, b) {
		if (a._score < b._score){ return 1; }
		if (a._score > b._score){ return -1; }
		return 0;
	});
};

// Optional parameters:
// exact=true|false, default false
// org=org.abbrev, no default
// Abstraction of "default", organizational Entry search
var executeOrgSearch = function (req) {
	log.info("querying mongo for terms with: '" + req.ktSearchTerm + "' in organization: " + req.org.name);

	var exactParam = (req.query.exact === 'true') || false;
	var orgParam = req.query.org || null;

	return Promise.resolve()
	.then( function () {
		// only query mongo for Organization if searching outside of current org
		if (orgParam === null) {
			return req.org;
		} else {
			return Organization.findOne({abbreviation: orgParam}).lean().exec()
			.then( function (org) {
				// check to see if the org is globally blocked
				if (org.globalBlock) {
					throw new Error('Cannot query globally blocked organizations from outside that organization');
				} else {
					return org;
				}
			});
		}
	})
	.then( function (org) {

		return elastic.searchOrgIndex(req.ktSearchTerm, req.langCode, org._id, exactParam);
	})
	.then( function (resp) {
		//console.log("Response: ", resp);
		var entryIds = getIdDict(resp);

		var searchQuery = { _id: {$in: Object.keys(entryIds)}, viewScope: {$in: ['any', 'org']} };

        return Entry.findAndPopulateForGui(searchQuery)
		.then( function (entries) {
            return processMongoQuery(entries, entryIds);
		});
	});
};
exports.executeOrgSearch = executeOrgSearch;

var executeDefaultSearch = function (req) {
	log.info(`executing default search for terms with ${ req.ktSearchTerm }`);

	console.log(req.body);

	var glossScope = req.body.glossScope.value;
	var userOrgs = reg.body.user.organizations;
	var userCurrentOrg = req.body.user.currentOrg;

	var exactParam = (req.query.exact === 'true') || false;

	// Find all Organization's to check for the global block flag
	return Organization.find({globalBlock: true}).select('globalBlock').lean().exec()
	.then( function (blocked) {
		// Execute elastic query for Entries
		return elastic.searchDefault(req.ktSearchTerm, req.langCode, exactParam)
		.then(function (resp) {
			var entryIds = getIdDict(resp);

			switch (glossScope) {

				case 'current':

					var searchQuery = {
						_id: {$in: Object.keys(entryIds)},
						isDraft: false,
                        $or: [
                            {org: req.org._id, viewScope: {$in: ['any', 'org']}},				// Entry is in user's org and viewScope is at least "this org"
                            {org: req.org._id, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active org
                        ]
					};
					break;

				case 'my':

                    var searchQuery = {
                        _id: {$in: Object.keys(entryIds)},
                        isDraft: false,
                        $or: [
                            {org: {$in: userOrgs}, viewScope: {$in: ['any', 'org']}},				// Entry is in user's org and viewScope is at least "this org"
                            {org: {$in: userOrgs}, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active org
                        ]
                    };
                    break;

				case 'all':

                    var searchQuery = {
                        _id: {$in: Object.keys(entryIds)},										// Entry has to have been returned from Elastic
                        isDraft: false,														// Never return Entries that are Drafts
                        $or: [
                            {org: {$nin: blocked}, viewScope: 'any'},							// Entry is in a non-blocked org and viewScope is anyone
                            {org: req.org._id, viewScope: {$in: ['any', 'org']}},				// Entry is in user's org and viewScope is at least "this org"
                            {org: req.org._id, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active org
                        ]
                    };
                    break;

				default:
					console.log("Error");
			}

			// // $in > $or for value checks of the same field (https://stackoverflow.com/questions/14736656)
			// var searchQuery = {
			// 	_id: {$in: Object.keys(entryIds)},										// Entry has to have been returned from Elastic
			// 	 isDraft: false,														// Never return Entries that are Drafts
			// 	 $or: [
			// 		{org: {$nin: blocked}, viewScope: 'any'},							// Entry is in a non-blocked org and viewScope is anyone
			// 		 {org: req.org._id, viewScope: {$in: ['any', 'org']}},				// Entry is in user's org and viewScope is at least "this org"
			// 		 {org: req.org._id, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active org
			// 	]
			// };

			return Entry.findAndPopulateForGui(searchQuery)
			.then(function (entries) {
				// Do a find/replace on the {{{em}}} tags we get back from elastic search
				for (var key in entryIds) {
					// Skip protoype properties
					if(!entryIds.hasOwnProperty(key)) continue;

					for(var termKey in entryIds[key].highlightTermText) {

						// Skip prototype properties
						if(!entryIds[key].highlightTermText.hasOwnProperty(termKey)) continue;

						// Find/Replace the {{{em}}} tags that indicate a search match from elastic search
						// Escape HTML characters before the first regex replace
						entryIds[key].highlightTermText[termKey] = escape(entryIds[key].highlightTermText[termKey]).replace(new RegExp('{{{em}}}', 'g') , '<b class="search-hit">');
						entryIds[key].highlightTermText[termKey] = entryIds[key].highlightTermText[termKey].replace(new RegExp('{{{/em}}}', 'g'), '</b>');
					}
				}
				return processMongoQuery(entries, entryIds);
			});
		});
	});
};
exports.executeDefaultSearch = executeDefaultSearch;

// This is the restful endpoint version of "org" search on an user's organization
var searchOrgEntries = function (req, res, next) {

	executeOrgSearch(req)
	.then( function (docs) {

		res.json(docs);
	})
	.catch(next);
};
exports.searchOrgEntries = searchOrgEntries;

// This is the restful endpoint version of "org" search on an user's organization
// This is currently the default search handler
var searchSharedEntries = function (req, res, next) {
	executeDefaultSearch(req)
	.then( function (docs) {
		res.json(docs);
	})
	.catch(next);
};
exports.searchSharedEntries = searchSharedEntries;
