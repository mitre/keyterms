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
var config = require('../../../config');

var log = require('../../utils/logger').logger;

var Glossary = mongoose.model('Glossary');
var User = mongoose.model('User');

exports.idParam = function(req, res, next, id){
	Glossary.findOne({'_id': id}).exec()
	.then(function(glossary) {
		if (!glossary){ return res.sendStatus(404); }

		req.glossaryDoc = glossary;
		next();
	}).catch(next);
};

exports.create = function(req, res, next){
    log.debug('creating glossary!');

    Glossary.create(req.body)
    .then(function (result) {
        res.status(201).json(result);
    })
	.catch(function (err) {
    	err.status = 400;
		next(err);
	});
};

exports.read = function(req, res) {
	var glossary = req.glossaryDoc.toObject();
	glossary.entries = glossary.entries.length || 0;
	glossary.nominations = glossary.nominations.length || 0;

	res.json(glossary);
};

exports.update = function (req, res, next) {
	req.glossaryDoc.updateMetadata(req.body)
	.then( function (glossary) {
		res.json(glossary);
	})
	.catch(next);
};

exports.delete = function(req, res, next){
    req.glossaryDoc.removeGlossary()
    .then( function () {
		res.sendStatus(204);
	})
    .catch(next);
};

exports.addQC = function(req, res, next){
   req.glossaryDoc.addQC(req.body.qcID)
   .then( function (glossary) {
	   res.json(glossary);
   })
   .catch(next);
};

exports.addAdmin = function(req, res, next){
    req.glossaryDoc.addAdmin(req.body.adminID)
	.then( function (glossary) {
		res.json(glossary);
	})
	.catch(next);
};

exports.removeQC = function(req, res, next){
    req.glossaryDoc.removeQC(req.body.qcID)
	.then( function (glossary) {
		res.json(glossary);
	})
	.catch(next);
};

exports.removeAdmin = function(req, res, next){
   req.glossaryDoc.removeAdmin(req.body.adminID)
   .then( function (glossary) {
	   res.json(glossary);
   })
	.catch(next);
};

exports.list = function(req, res, next){
    Glossary.find({}, '-entries -nominations').exec()
	.then(function(data){
        res.json(data);
    }).catch(next);
};

exports.getCommon = function(req, res, next) {
	Glossary.findOne({'isCommon': true}).exec()
	.then(function(glossary) {
		if (!glossary) { return res.sendStatus(404); }
		res.json(glossary);
	}).catch(next);
};

// GET /api/glossary/members/:glossaryId
exports.getMembers = function (req, res, next) {
	var async = Promise.resolve();

	async.then( function () {
		// if ?all=true
		if (!!req.query.all && req.query.all === 'true') {
			return User.find({}).select('-password').exec()
			.then( function (users) {
				var resp = {
					members: [],
					nonMembers: []
				};

				users.forEach(user => {
					var userObj = user.toObject();
					var list = resp.nonMembers;

					// if member of glossary
					if (user.glossarys.indexOf(req.glossaryDoc._id) !== -1) {
						userObj.qc = req.glossaryDoc.qcs.indexOf(user._id) !== -1;
						userObj.admin = req.glossaryDoc.admins.indexOf(user._id) !== -1;
						list = resp.members;
					}
					else {
						userObj.qc = false;
						userObj.admin = false;
					}

					// the object-ified version of the document must be pushed to maintain the .qc and .admin fields
					// serving the Mongoose Document strips the fields during the JSON conversion
					list.push(userObj);
				});

				return resp;
			});
		}
		else {
			return User.find({ glossarys: req.glossaryDoc._id }).select('-password').exec();
		}
	})
	.then( function (users) {
		res.json(users);
	}).catch(next);
};

// PUT /api/glossary/members/:glossaryId	 =>  req.body = []
exports.addMembers = function (req, res, next) {
	var userIds = req.body.map( user => user._id );

	User.find({_id: {$in: userIds}}).exec()
	.then( function (userDocs) {
		return Promise.mapSeries(userDocs, user => user.joinGlossary(req.glossaryDoc._id));
	})
	.then( function () {
		// NOTE: user.admin reference to GlossaryAdmin (not sys admin aka user.isAdmin)
		var admins = req.body.filter( user => user.admin ).map( user => user._id );
		var qcs = req.body.filter( user => user.qc ).map( user => user._id );

		req.glossaryDoc.admins = req.glossaryDoc.admins.concat(admins);
		req.glossaryDoc.qcs = req.glossaryDoc.qcs.concat(qcs);

		return req.glossaryDoc.save();
	})
	.then( function (glossary) {
		glossary.entries = glossary.entries.length || 0;
		glossary.nominations = glossary.nominations.length || 0;

		res.json(glossary);
	})
	.catch(next);
};

// POST /api/glossary/members/:glossaryId  =>   req.body = [];
exports.updateMembers = function (req, res, next) {
	var userIds = req.body.map(user => user._id);
	var currentUsers = [];

	User.find({_id: {$in: userIds}}).exec()
	.then( function (userDocs) {
		return Promise.mapSeries(userDocs, function (user, index) {
			user.marked = req.body[index].marked;
			user.admin = req.body[index].admin;
			user.qc = req.body[index].qc;

			// if the user is marked for removal, do so
			if (user.marked) {
				return user.leaveGlossary(req.glossaryDoc._id);
			}
			// otherwise check if the user's glossaryAdmin or glossaryQC status needs updating
			else {
				currentUsers.push(user);
				return user;
			}
		});
	})
	.then( function () {
		// NOTE: user.admin reference to GlossaryAdmin (not sys admin aka user.isAdmin)
		req.glossaryDoc.admins = currentUsers.filter( user => user.admin ).map( user => user._id );
		req.glossaryDoc.qcs = currentUsers.filter( user => user.qc ).map( user => user._id );

		// NOTE: setting the admins/qcs arrays as the value above will remove any users which were removed from the glossary as well

		return req.glossaryDoc.save();
	})
	.then( function (glossary) {
		glossary.entries = glossary.entries.length || 0;
		glossary.nominations = glossary.nominations.length || 0;

		res.json(glossary);
	})
	.catch(next);
};

// This needs to be mounted AFTER verifyRequest middleware
exports.checkGlossaryPermissions = function (req, res) {
	var creds = {
		isGlossaryAdmin: (req.glossary.admins.indexOf(req.user._id) !== -1),
		isGlossaryQC: (req.glossary.qcs.indexOf(req.user._id) !== -1),
		glossaryName: req.glossary.name || '',
		langList: req.glossary.langList || []
	};
	res.json(creds);
};
