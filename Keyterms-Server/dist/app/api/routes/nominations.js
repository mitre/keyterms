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

var $Entry = require('../../db').interfaces.$Entry;
var log = require('../../utils/logger').logger;

var Nomination = mongoose.model('Nomination');
var Entry = mongoose.model('Entry');

// GET /nominations - returns a list of nominations for an organization
exports.getNominations = function (req, res, next) {
	Nomination.populate(req.org, {
		path: 'nominations',
		model: 'Nomination',
		populate: [
			{
				path: 'createdBy',
				model: 'User',
				select: 'username email fullName'
			},
			{
				path: 'data.createdBy',
				model: 'User',
				select: 'username email fullName'
			},
			{
				path: 'originalEntry',
				model: 'Entry',
				populate: [
					{
						path: 'terms',
						model: 'Term'
					},
					{
						path: 'createdBy',
						model: 'User',
						select: 'username email fullName'
					}
				]
			}
		]
	})
	.then( function (doc) {
		doc.nominations.forEach( function (nom) {
			if (nom.type === 'add' && !!nom.originalEntry) {
				// convert publish nomination to "Add" nomination format
				nom.data = nom.originalEntry;
				nom.originalEntry = undefined;
			}
		});

		res.json(doc.nominations);
	}).catch(next);
};

// Middleware to verify the requested nomination exists in the database
exports.param = function (req, res, next, nomId) {
	Nomination.count({_id: nomId})
	.then( function (count) {
		if (count === 1) {
			if (req.org.nominations.indexOf(nomId) === -1) {
				// if the nom id is not listed within the current org
				// the user is working in, return 403 - the request isn't
				// bad and their creds aren't necessarily bad, they just don't
				// have permission at this moment
				return res.sendStatus(403);
			}

			// confirmed to be a member of the user's current org
			return next();
		}
		else {
			return res.sendStatus(404);
		}
	}).catch( function(err) {
		log.error(JSON.stringify(err, null, 4));
		next();
	});
};

// Middleware which verifies if the data passed is valid to create an Entry
exports.validateEntry = function (req, res, next) {
	if (!req.body.originalEntry) {
		// originalEntry is not required for every Nomination type
		return next();
	}
	else {
		// behaves the same as the :id parameter within the Entry methods
		$Entry.validateParam(req, res, next, req.body.originalEntry);
	}
};

exports.errorHandlers = function (err, req, res, next) {
	log.warn('Error detected');
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

	// Only print/log error if it's un-handled
	log.error(err);
	next();

};

exports.create = function (req, res, next) {
	Nomination.create(req.body)
	.then( function (doc) {
		res.status(201).json(doc);
		return req.org.addNom(doc._id);
	})
	.then( function () {
		log.debug('Nomination added to org');
	}).catch(next);
};

exports.read = function (req, res, next) {
	Nomination.findOne({_id: req.params.id})
	.populate([
		{
			path: 'originalEntry',
			model: 'Entry',
			populate: [{
				path: 'terms',
				model: 'Term'
			},
			{
				path: 'notes.createdBy',
				model: 'User',
				select: 'username email fullName'
			},
			{
				path: 'createdBy',
				model: 'User',
				select: 'username email fullName'
			},
			{
				path: 'tags',
				model: 'Tag',
				select: 'content'
			}]
		},
		{
			path: 'createdBy',
			model: 'User',
			select: 'username email fullName'
		},
		{
			path: 'data.createdBy',
			model: 'User',
			select: 'username email fullName'
		}
	]).exec()
	.then( function (doc) {
		if (doc.type === 'mod') {
			return doc.populateDelta();
		}
		else if (doc.type === 'add' && !!doc.originalEntry) {
			// if this is a draft publish addition convert publish nomination to "Add" nomination format

			doc = doc.toObject();
			doc.data = doc.originalEntry;

			return doc;
		}
		else {
			return doc.toObject();
		}
	})
	.then( function (nom) {
		res.json(nom);
	})
	.catch(next);
};

exports.reject = function (req, res, next) {
	Nomination.findOne({_id: req.params.id}).remove().exec()
	.then( function () {
		res.json({wasSuccessful: true});
		return req.org.removeNom(req.params.id);
	})
	.then( function () {
		log.debug('Nomination removed from org');
	}).catch(next);
};

exports.approve = function (req, res, next) {
	Nomination.findOne({_id: req.params.id}).exec()
	.then( function (nom) {

		log.debug('Approve Type: ' + nom.type);

		if (nom.type === 'add') {
			if (!!nom.originalEntry) {
				return approveDraftPublish(req, nom);
			}

			if (!nom.data || typeof nom.data !== 'object') {
				return new Error('Bad Approve Request : bad data field');
			}
			return approveAdd(req, nom);
		}
		else if (nom.type === 'del') {
			if (!nom.originalEntry) {
				return new Error('Bad Approve Request : bad entryId');
			}
			return approveDel(req, nom);
		}
		else if (nom.type === 'mod') {

			if (!nom.data || typeof nom.data !== 'object') {

				return new Error('Bad Approve Request : bad data field');
			}
			if (!nom.originalEntry) {

				return new Error('Bad Approve Request : bad entryId');
			}
			return approveMod(req, nom);
		}
		else {
			return new Error('Bad Approve Request');
		}
	})
	// .catch(next)
	.then( function (result) {
		res.json(result);
		return Promise.all([
			req.org.removeNom(result._id),
			Nomination.findOne({_id: req.params.id}).remove().exec()
		]);
	})
	.then( function () {
		// potential to create "orphaned" nomination docs
		log.debug('Nomination removed!');
	}).catch(next);
};

var approveDraftPublish = function (req, nom) {
	return Entry.findOne({_id: nom.originalEntry})
	.then( function (entry) {
		entry.isDraft = false;
		return entry.save();
	});
};

var approveAdd = function (req, nom) {
	var entryData = {};

	// NOTE: commented out the ability for QCs to update the Entry
	// if (req.body.updatedByQC) {
	// 	entryData = req.body.updates;
	// 	console.log('here');
	// }
	// else
	if (typeof nom.data === 'object') {
		entryData = nom.data;
	}
	else {
		entryData = nom.data.toObject();
	}

	delete entryData._id;
	entryData.nominatedBy = nom.createdBy;
	entryData.approvedBy = req.user._id;

	return $Entry.createEntry(entryData, req.org);
};

var approveDel = function (req, nom) {
	return $Entry.removeEntry(nom.originalEntry, req.org)
	.then( function () {
		return {wasSuccessful: true};
	});
};

var approveMod = function (req, nom) {
	return new Promise( function (resolve, reject) {
		var updateAsync = null;

		var delta = req.body.delta || nom.delta || null;

		if (!!delta) {
			updateAsync = $Entry.applyDelta(nom.originalEntry, delta, req.org._id);
		}
		else {
			var entryData = {};

			// NOTE: commented out the ability for QCs to update the Entry
			// if (!!req.body.updatedByQC) {
			// 	entryData = req.body.updates;
			// } else {
			// 	entryData = nom.data;
			// }

			entryData = nom.data;
			updateAsync = $Entry.updateEntry(nom.originalEntry, entryData, req.org._id);
		}

		if (!updateAsync) {
			return reject(new Error('Unable to apply modification with "approveMod" function'));
		}

		updateAsync.then( function (doc) {
			doc.nominatedBy = nom.createdBy;
			doc.approvedBy = req.user._id;
			return doc.save();
		})
		.then( function (doc) {
			return resolve(doc);
		});
	});
};
