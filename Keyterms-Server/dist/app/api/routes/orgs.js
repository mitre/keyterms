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

var Organization = mongoose.model('Organization');
var User = mongoose.model('User');

exports.idParam = function(req, res, next, id){
	Organization.findOne({'_id': id}).exec()
	.then(function(org) {
		if (!org){ return res.sendStatus(404); }

		req.orgDoc = org;
		next();
	}).catch(next);
};

exports.create = function(req, res, next){
    log.debug('creating org!');

    Organization.create(req.body)
    .then(function (result) {
        res.status(201).json(result);
    })
	.catch(function (err) {
    	err.status = 400;
		next(err);
	});
};

exports.read = function(req, res) {
	var org = req.orgDoc.toObject();
	org.entries = org.entries.length || 0;
	org.nominations = org.nominations.length || 0;

	res.json(org);
};

exports.update = function (req, res, next) {
	req.orgDoc.updateMetadata(req.body)
	.then( function (org) {
		res.json(org);
	})
	.catch(next);
};

exports.delete = function(req, res, next){
    req.orgDoc.removeOrganization()
    .then( function () {
		res.sendStatus(204);
	})
    .catch(next);
};

exports.addQC = function(req, res, next){
   req.orgDoc.addQC(req.body.qcID)
   .then( function (org) {
	   res.json(org);
   })
   .catch(next);
};

exports.addAdmin = function(req, res, next){
    req.orgDoc.addAdmin(req.body.adminID)
	.then( function (org) {
		res.json(org);
	})
	.catch(next);
};

exports.removeQC = function(req, res, next){
    req.orgDoc.removeQC(req.body.qcID)
	.then( function (org) {
		res.json(org);
	})
	.catch(next);
};

exports.removeAdmin = function(req, res, next){
   req.orgDoc.removeAdmin(req.body.adminID)
   .then( function (org) {
	   res.json(org);
   })
	.catch(next);
};

exports.list = function(req, res, next){
    Organization.find({}, '-entries -nominations').exec()
	.then(function(data){
        res.json(data);
    }).catch(next);
};

exports.getCommon = function(req, res, next) {
	Organization.findOne({'isCommon': true}).exec()
	.then(function(org) {
		if (!org) { return res.sendStatus(404); }
		res.json(org);
	}).catch(next);
};

// GET /api/org/members/:orgId
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

					// if member of org
					if (user.organizations.indexOf(req.orgDoc._id) !== -1) {
						userObj.qc = req.orgDoc.qcs.indexOf(user._id) !== -1;
						userObj.admin = req.orgDoc.admins.indexOf(user._id) !== -1;
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
			return User.find({ organizations: req.orgDoc._id }).select('-password').exec();
		}
	})
	.then( function (users) {
		res.json(users);
	}).catch(next);
};

// PUT /api/org/members/:orgId	 =>  req.body = []
exports.addMembers = function (req, res, next) {
	var userIds = req.body.map( user => user._id );

	User.find({_id: {$in: userIds}}).exec()
	.then( function (userDocs) {
		return Promise.mapSeries(userDocs, user => user.joinOrg(req.orgDoc._id));
	})
	.then( function () {
		// NOTE: user.admin reference to OrgAdmin (not sys admin aka user.isAdmin)
		var admins = req.body.filter( user => user.admin ).map( user => user._id );
		var qcs = req.body.filter( user => user.qc ).map( user => user._id );

		req.orgDoc.admins = req.orgDoc.admins.concat(admins);
		req.orgDoc.qcs = req.orgDoc.qcs.concat(qcs);

		return req.orgDoc.save();
	})
	.then( function (org) {
		org.entries = org.entries.length || 0;
		org.nominations = org.nominations.length || 0;

		res.json(org);
	})
	.catch(next);
};

// POST /api/org/members/:orgId  =>   req.body = [];
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
				return user.leaveOrg(req.orgDoc._id);
			}
			// otherwise check if the user's orgAdmin or orgQC status needs updating
			else {
				currentUsers.push(user);
				return user;
			}
		});
	})
	.then( function () {
		// NOTE: user.admin reference to OrgAdmin (not sys admin aka user.isAdmin)
		req.orgDoc.admins = currentUsers.filter( user => user.admin ).map( user => user._id );
		req.orgDoc.qcs = currentUsers.filter( user => user.qc ).map( user => user._id );

		// NOTE: setting the admins/qcs arrays as the value above will remove any users which were removed from the org as well

		return req.orgDoc.save();
	})
	.then( function (org) {
		org.entries = org.entries.length || 0;
		org.nominations = org.nominations.length || 0;

		res.json(org);
	})
	.catch(next);
};

// This needs to be mounted AFTER verifyRequest middleware
exports.checkOrgPermissions = function (req, res) {
	var creds = {
		isOrgAdmin: (req.org.admins.indexOf(req.user._id) !== -1),
		isOrgQC: (req.org.qcs.indexOf(req.user._id) !== -1),
		orgName: req.org.name || '',
		langList: req.org.langList || []
	};
	res.json(creds);
};
