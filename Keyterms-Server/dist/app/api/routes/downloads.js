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

var mongoose = require('mongoose');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');

var Entry = mongoose.model('Entry');
var Tag = mongoose.model('Tag');
var search = require('./search');
var log = require('../../utils/logger').logger;
var exportUtil = require('../../export/exports');

// shortcut to calling the Entry method "populatedForGUI" on each Entry returned from a query
var populateEntries = function (entries) {
	return Promise.mapSeries(entries, function (e) {
		return e.populateForGUI();
	});
};

// respond to the user, either via a json file or raw json (application/json - in req.body)
var sendFileOrBody = function (req, res, json) {

	//TODO add logic to get filetype from query and handle the filetypes

	// defaults to JSON
	var fileType = !!req.query.fileType ? req.query.fileType.toUpperCase() : 'JSON';

	if (fileType === 'JSON') {

		// determine whether to serve file or simply a raw JSON RESTful response
		var fileRequested = req.query.file !== 'false';

		// determine whether the request wants the results to be limited
		var limit = !!req.query.limit ? parseInt(req.query.limit, 10) : json.length;
		json = json.slice(0, limit);

		if (fileRequested) {
			res.set('Content-Disposition', 'attachment; filename="keyterms.json"');
			res.set('Content-Type', 'text/json');
			return res.status(200).send(JSON.stringify(json, null, 4)).end();
		}
		else {
			return res.status(200).json(json);
		}
	}
	else {

		switch (fileType){
			case 'XLSX2D':

				var wb = exportUtil.exportFile(json);
                wb.then( function (filename) {

                    // done writing to file
                    var p = path.join(__dirname, '../../export/' + filename);
                    var stream = fs.createReadStream(p);

                    stream.on('open', function () {
                        res.set('Content-Disposition', 'attachment; filename="export.workbook.xlsx"');
                        res.set('Content-Type', 'application/vnd.ms-excel');
                        res.status(200);
                        stream.pipe(res);
                    });

                    stream.on('error', function(err) {
                        log.error(err);
                        res.set('Content-Type', 'text/plain');
                        res.sendStatus(404);
                    });

                    stream.on('close', function(){
						fs.unlink(p, function(err){
                            if(err){
                                log.error(err);
                            }
						});
					});
                });

                break;
			case 'SIMPLE':
				//TODO add support for Excel simple schema
				break;
			default:
				//Filetype not found
				break;
		}
	}
};

// download every Entry which belongs to a specific glossary
// defaults to current glossary if none is specified
exports.glossaryToJSON = function (req, res, next) {
	// removes extra quotations around the date fields
	Object.keys(req.query).forEach( function (key) {
		req.query[key] = req.query[key].replace(/"/g, '');
	});

	// Parse out the various date ranges and add them to the mongoose query
	var query = {};

	if (!!req.query['creationStartDate']) {
		query.creationDate = {};
		query.creationDate['$gte'] = new Date(req.query['creationStartDate']);
	}

	if (!!req.query['creationEndDate']) {
		query.creationDate = query.creationDate || {};
		query.creationDate['$lte'] = new Date(req.query['creationEndDate']);
	}

	if (!!req.query['modifiedStartDate']) {
		query.modificationDate = {};
		query.modificationDate['$gte'] = new Date(req.query['modifiedStartDate']);
	}

	if (!!req.query['modifiedEndDate']) {
		query.modificationDate = query.modificationDate || {};
		query.modificationDate['$lte'] = new Date(req.query['modifiedEndDate']);
	}

	if(!!req.query['classification']) {
		query.classification = req.query['classification'];
	}

	Promise.resolve()
	.then( function () {
		if (!!req.query.glossary) {
			mongoose.model('Glossary').findOne({abbreviation: req.query.glossary}).exec()
			.then( function (glossary) {
				if (glossary.globalBlock) {
                    return next(new Error('Cannot request Entries of a globally restricted Glossary without membership'));
                }
				else {
                    return glossary;
                }
			});
		}
		else {
			return req.glossary;
		}
	})
	.then( function (glossary) {
        log.debug('Additional query parameters: ', query);

        if(!!req.query['tags'])
		{
            return Tag.findOne({content: req.query['tags'], glossary: glossary._id})
                .then(function (tagDoc) {
                    var entries = []
                    tagDoc.entries.forEach(function (entry) {
                        entries.push(entry);
                    })

                    return entries;
                })
		}
        else
		{
        	return glossary.entries;
		}

    })
	.then(function (entries) {
		query['_id'] = {$in: entries};
		var mongooseQuery = Entry.find(query);

		if (!!req.query['langCode']) {
			if (req.query['langCode'] !== 'und') {

				return mongooseQuery.populate({
					path: 'terms',
					match: {langCode: req.query['langCode']}
				})
					.exec()
					.then( function (entries) {
						return entries.filter(e => e.terms.length);
					});
			}

			// else - if langCode == 'und' (aka Any), do nothing
		}

		// execute the query and return a promise
		return mongooseQuery.exec();
	})

	.then( populateEntries )
	.then( function (populatedEntries) {
		log.debug('Length of results: ', populatedEntries.length);
		return sendFileOrBody(req, res, populatedEntries);
	})
	.catch(next);
};

// download a json file of the search which was just executed
// NOTE: /api/download/query?file=false will return identical results as /api/search
// NOTE: the same "pre-search" middleware is required to be mounted before this call
exports.queryToJSON = function (req, res, next) {
	search.executeGlossarySearch(req)
	.then( function (searchResults) {
		// Entry's are pre-populated via search.executeGlossarySearch
		return sendFileOrBody(req, res, searchResults);
	})
	.catch(next);
};

exports.selectedToJSON = function (req, res, next) {
	if (!req.query.entries) {
        return next(new Error('Badly formed requested parameter. entries is required'));
    }

	Entry.find({_id: {$in: req.query.entries.split(',')}})
	.then( populateEntries )
	.then( function (populatedEntries) {
		return sendFileOrBody(req, res, populatedEntries);
	})
	.catch(next);
};
