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
var Glossary = mongoose.model('Glossary');
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

	if(req.method === 'POST') {
        req.glossScope = req.body.glossScope;
    }

    else if (req.method === 'GET') {
		req.glossScope = decodeURIComponent(req.query.glossScope);
		console.log("testing are we here: ", JSON.stringify(req.glossScope, null, 4));
	}

	else {
		return next(new Error('The HTTP verb: {' + req.method + '} is not supported'));
	}

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
// glossary=glossary.abbrev, no default
// Abstraction of "default", Glossary Entry search
var executeGlossarySearch = function (req) {
	log.info("querying mongo for terms with: '" + req.ktSearchTerm + "' in glossary: " + req.glossary.name);
	console.log("test");
	var exactParam = (req.query.exact === 'true') || false;
	var glossaryParam = req.query.glossary || null;

	return Promise.resolve()
	.then( function () {
		// only query mongo for Glossary if searching outside of current glossary
		if (glossaryParam === null) {
			return req.glossary;
		} else {
			return Glossary.findOne({abbreviation: glossaryParam}).lean().exec()
			.then( function (glossary) {
				// check to see if the glossary is globally blocked
				if (glossary.globalBlock) {
					throw new Error('Cannot query globally blocked glossaries from outside that glossary');
				} else {
					return glossary;
				}
			});
		}
	})
	.then( function (glossary) {

		return elastic.searchGlossaryIndex(req.ktSearchTerm, req.langCode, glossary._id, exactParam);
	})
	.then( function (resp) {
		//console.log("Response: ", resp);
		var entryIds = getIdDict(resp);

		var searchQuery = { _id: {$in: Object.keys(entryIds)}, viewScope: {$in: ['any', 'glossary']} };

        return Entry.findAndPopulateForGui(searchQuery)
		.then( function (entries) {
            return processMongoQuery(entries, entryIds);
		});
	});
};
exports.executeGlossarySearch = executeGlossarySearch;

var executeDefaultSearch = function (req) {
	log.info(`executing default search for terms with ${ req.ktSearchTerm }`);

	var glossScope = req.glossScope.value;
	var userGlossaries = req.user.glossaries;
	var userCurrentGlossary = req.user.currentGlossary;

	var exactParam = (req.query.exact === 'true') || false;

	// Find all Glossaries to check for the global block flag
	return Glossary.find({globalBlock: true}).select('globalBlock').lean().exec()
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
                            {glossary: req.glossary._id, viewScope: {$in: ['any', 'glossary']}},				// Entry is in user's glossary and viewScope is at least "this glossary"
                            {glossary: req.glossary._id, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active glossary
                        ]
					};
					break;

				case 'my':

                    var searchQuery = {
                        _id: {$in: Object.keys(entryIds)},
                        isDraft: false,
                        $or: [
                            {glossary: {$in: userGlossaries}, viewScope: {$in: ['any', 'glossary']}},				// Entry is in user's glossary and viewScope is at least "this glossary"
                            {glossary: {$in: userGlossaries}, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active glossary
                        ]
                    };
                    break;

				case 'all':

                    var searchQuery = {
                        _id: {$in: Object.keys(entryIds)},										// Entry has to have been returned from Elastic
                        isDraft: false,														// Never return Entries that are Drafts
                        $or: [
                            {glossary: {$nin: blocked}, viewScope: 'any'},							// Entry is in a non-blocked glossary and viewScope is anyone
                            {glossary: req.glossary._id, viewScope: {$in: ['any', 'glossary']}},				// Entry is in user's glossary and viewScope is at least "this glossary"
                            {glossary: req.glossary._id, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active glossary
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
			// 		{glossary: {$nin: blocked}, viewScope: 'any'},							// Entry is in a non-blocked glossary and viewScope is anyone
			// 		 {glossary: req.glossary._id, viewScope: {$in: ['any', 'glossary']}},				// Entry is in user's glossary and viewScope is at least "this glossary"
			// 		 {glossary: req.glossary._id, createdBy: req.user._id, viewScope: 'me'}		// Entry is a personal term associated in active glossary
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

// This is the restful endpoint version of "glossary" search on an user's glossary
var searchGlossaryEntries = function (req, res, next) {

	executeGlossarySearch(req)
	.then( function (docs) {

		res.json(docs);
	})
	.catch(next);
};
exports.searchGlossaryEntries = searchGlossaryEntries;

// This is the restful endpoint version of "glossary" search on an user's glossary
// This is currently the default search handler
var searchSharedEntries = function (req, res, next) {

	executeDefaultSearch(req)
	.then( function (docs) {

		res.json(docs);
	})
	.catch(next);
};
exports.searchSharedEntries = searchSharedEntries;
