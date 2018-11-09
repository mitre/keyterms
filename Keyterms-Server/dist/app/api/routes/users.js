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
var User = mongoose.model('User');

// POST /api/user/create
exports.create = function (req, res, next) {
	User.create(req.body)
	.then( function (user) {

		res.status(201).json(user);
	})
	.catch( function (err) {
		if (!!err.code && err.code === 11000) {
			log.error('That username already exists!');
			res.sendStatus(409);
		}
		else {
			err.status = 400;
			next(err);
		}
	});
};

exports.idParam = function (req, res, next, id) {
	User.findOne({_id: id}).exec()
	.then( function (user) {

		if (!user) { return res.sendStatus(404); }

		// update the req.params field
		req.userDoc = user;
		next();
	})
	.catch(next);
};

// GET /api/user/u/:id
exports.read = function (req, res, next) {
	req.userDoc.populate({
		path: 'glossaries',
		model: 'Glossary',
		select: 'name abbreviation admins qcs langList'
	}).execPopulate()
	.then( function (user) {
		res.json(user);
	})
	.catch(next);
};

// POST /api/user/u/:id
exports.update = function (req, res, next) {
	if ( (req.userDoc.isDeactivated !== req.body.isDeactivated) && (req.user._id.toString() === req.body._id) ) {
		// user is trying to deactivate themselves, prevent this
		return res.sendStatus(400);
	}

	Object.assign(req.userDoc, req.body);

	req.userDoc.save()
	.then( function (user) {
		res.json(user);
	})
	.catch( function (err) {
		if (!!err.code && err.code === 11000) {
			log.error('That username already exists!');
			res.sendStatus(409);
		}
		else {
			next(err);
		}
	});
};

// DELETE /api/user/u/:id
exports.delete = function (req, res, next) {
	req.userDoc.remove()
	.then( function () {
		res.sendStatus(204);
	})
	.catch(next);
};

// POST /api/user/defaultGlossary/:glossary
exports.updateDefaultGlossary = function (req, res, next) {
	var glossaryId = req.params.glossary === 'false' ? null : req.params.glossary;

	req.user.updateDefaultGlossary(glossaryId)
		.then(function (user) {
			return user.populate({
				path: 'glossaries',
				model: 'Glossary',
				select: 'name langList'
			}).execPopulate();
		})
		.then(function (user) {
			res.json(user);
		})
		.catch(function (err) {
			if (!!err.notAMember) {
				log.error(`User is not a member of target Glossary [${glossaryId}]`);
				res.sendStatus(400);
			}
			else {
				next(err);
			}
		});
};

// POST /api/user/activeGlossary/:glossary
exports.switchActiveGlossary = function (req, res, next) {
	req.user.switchActiveGlossary(req.params.glossary)
	.then(function(user){
        return user.populate({
            path: 'glossaries',
            model: 'Glossary',
            select: 'name langList'
        }).execPopulate();
	})
	.then( function (user) {
		res.json(user);
	})
	.catch( function (err) {
		if (!!err.notAMember) {
			log.error(`User is not a member of target Glossary [${req.params.glossary}]`);
			res.sendStatus(400);
		}
		else {
			next(err);
		}
	});
};

// POST /api/user/password-check/:id
exports.checkAndChangePassword = function (req, res, next) {
	req.userDoc.comparePassword(req.body.old)
	.then( function(isMatch) {
		if (isMatch) {
			req.userDoc.changePassword(req.body.new)
			.then( function () {
				res.sendStatus(200);
			});
		} else {
			res.sendStatus(400);
		}
	})
	.catch(next);
};

exports.listUsers = function (req, res, next) {
	User.find({}).exec()
	.then( function (users) {
		res.json(users);
	})
	.catch(next);
};
