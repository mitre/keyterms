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

var log = require('../../utils/logger').logger;

var Entry = mongoose.model('Entry');
var Nomination = mongoose.model('Nomination');
var Glossary = mongoose.model('Glossary');
var $Entry = require('../../db').interfaces.$Entry;

// requires the Express middleware format of req, res, next
var createNominationEP = require('./nominations').create;

// Middleware which fetches and entry from it's _id attribute
// Bound to ':id' param only
exports.param = function () {
	$Entry.validateParam.apply(this, arguments);
};

// Error handling middleware for entries
exports.errorHandlers = function (err, req, res, next) {
	var msg = err.message || '';
	if (err.name === 'ValidationError') {
		var typeMsg = '';
		if (!!err.errors.type && !!err.errors.type.message) {
			typeMsg = err.errors.type.message;
		}
		log.error(err.name);
		log.error(err.message);
		return res.status(400).send(msg + ': ' + typeMsg);
	}
	else if (err.name === 'CastError') {
		log.error(err.name);
		log.error(err.message);
		return res.status(400).send('Bad /:id parameter - not an ObjectId');
	}
	else {
		// Only print/log error if it's un-handled
		log.error(err);
		next(err);
	}
};

// (C)RUD Operation
// POST /entry/create
exports.create = function (req, res, next) {
	if (!req.body.createdBy) {
		req.body.createdBy = req.user._id.toString();
	}
	else {
		req.body.createdBy = new mongoose.Types.ObjectId(req.body.createdBy);
	}

	$Entry.createEntry(req.body, req.glossary)
	.then( function (doc) {
		return doc.populateForGUI();
	})
	.then( function (doc) {
		res.status(201).json(doc);
	}).catch(next);
};

// C(R)UD Operation
// GET /entry/:entry - returns the entry object associated with passed _id value
// NOTE: uses :entry as the :id param variable to avoid calls to entryRouter.param('id', ...)
exports.read = function (req, res, next) {
	Entry.findOne({_id: req.params.entry}).exec()
	.then( function (doc) {
		return doc.populateForGUI();
	})
	.then( function (ent) {
		var entry = ent.toObject();

		var failedAuthorization = false;
		switch (entry.viewScope) {
			case 'me':
				failedAuthorization = entry.createdBy._id.toString() !== req.user._id.toString();
				break;
			case 'glossary':
				failedAuthorization = entry.glossary._id.toString() !== req.glossary._id.toString();
				break;
			case 'any':
				// purposely do nothing, no authorization required
				break;
		}
		if (failedAuthorization) { return res.sendStatus(403); }

		return Nomination.count({'originalEntry': entry._id, 'type': 'mod'}).exec()
		.then(function(modNoms) {
			entry.modNoms = modNoms;
			return Nomination.count({'originalEntry': entry._id, 'type': 'del'}).exec();
		})
		.then(function(delNoms){
			entry.delNoms = delNoms;
			res.json(entry);
		});
	})
	.catch(next);
};

// CR(U)D Operation
// POST /entry/:id
exports.update = function (req, res, next) {
	$Entry.updateEntry(req.params.id, req.body, req.glossary._id)
	.then( function (doc) {
		return doc.populateForGUI();
	})
	.then( function (doc) {
		res.json(doc);
	}).catch( function (err) {
		log.error(err);
		next();
	});
};

// CRU(D) Operation
// DELETE /entry/:id - removes the entry from the database
exports.delete = function (req, res, next) {
	$Entry.removeEntry(req.params.id, req.glossary)
	.then( function () {
		res.sendStatus(204);
	}).catch(next);
};

// This function is used to populate requests from GET /myentries
// and GET /mydrafts. It contains a small amount of logic to determine
// which endpoint was called
exports.getUserEntries = function (req, res, next) {
	var match = {};
	// every entry must belong to the current user
	match.createdBy = req.user._id;

	if (req.path === '/myentries') {
		match.isDraft = false;
	}
	else if (req.path === '/mydrafts') {
		match.isDraft = true;
	}
	else {
		return next(new Error('Invalid status field in getUserEntries'));
	}

	// http://mongoosejs.com/docs/api.html#model_Model.populate
	// http://stackoverflow.com/questions/19222520/populate-nested-array-in-mongoose
	Glossary.populate(req.glossary, {
		path: 'entries',
		match: match,
		model: 'Entry',
		populate: [
			{
				path: 'terms',
				model: 'Term'
			},
			{
				path: 'tags',
				model: 'Tag'
			},
			{
				path: 'glossary',
				model: 'Glossary',
				select: 'name abbreviation'
			}
		]
	})
	.then( function (glossary) {
		res.json(glossary.entries);
	}).catch(next);
};

exports.publishDraft = function (req, res, next) {
	Entry.findOne({_id: req.params.id}).exec()
	.then( function (entry) {
		// Additional checks specific to drafts
		if (entry.isDraft && entry.createdBy.toString() === req.user._id.toString()) {

			// nominated entry or auto-approve
			// if ?nominate=false, nom should equal false, otherwise default to true
			var nom = !(!!req.query && !!req.query.nominate && req.query.nominate === 'false');

			if (nom) {
				// create nomination for new Entry

				// create a request body to create the nomination
				req.body = {
					originalEntry: entry._id.toString(),
					type: 'add',
					createdBy: req.user._id.toString()
				};

				// manually call the nomination.create endpoint handler
				createNominationEP(req, res, next);
				return true;	// always return true to avoid the .catch block below (error will be handled inside createNominationEP)
			}
			else {
				if (entry.viewScope !== 'me') {
					// TODO: ensure user has QC authority
				}

				entry.isDraft = false;
				entry.save()
				.then( function () {
					res.json(entry);
				});
			}
		}
		else {
			return res.sendStatus(403);
		}
	})
	.catch(next);
};
