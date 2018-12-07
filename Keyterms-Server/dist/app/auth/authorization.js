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

var log = require('../utils/logger').logger;

var mongoose = require('mongoose');
var Glossary = mongoose.model('Glossary');

exports.ensureAdmin = function(req, res, next) {
	// ensure authenticated user exists with admin role,
	// otherwise send 401 response status
	if (req.user && req.user.isAdmin) {
		return next();
	} else {
		log.warn('ensureAdmin threw 403');
		return res.sendStatus(403);
	}
};

exports.ensureGlossaryAdmin = function(req, res, next){
	//check the Glossary to see if the user is an admin
	if(req.glossary.admins.indexOf(req.user._id) > -1){
		return next();
	}
	else{
		log.warn('ensureGlossaryAdmin threw 403');
		return res.sendStatus(403);
	}
};

exports.ensureGlossaryQc = function(req, res, next){

	if(req.glossary.qcs.indexOf(req.user._id) > -1){
		return next();
	}
	else{
		log.warn('ensureGlossaryQc threw 403');
		return res.sendStatus(403);
	}
};

exports.ensureSysAdminOrGlossaryAdmin = function (req, res, next) {
	// Check if sys admin
	if (!!req.user && req.user.isAdmin) {
        return next();
    }
	// check if glossary admin
	else if (req.glossary.admins.indexOf(req.user._id) > -1) {
        return next();
    }
	else {
        return res.sendStatus(403);
    }
};

exports.ensureQcOfAny = function (req, res, next) {
	Glossary.find({_id: {$in: req.user.glossaries}}).select('name abbreviation qcs').exec()
	.then( function (glossaryDocs) {
		var isQC = false;
		var qcOf = [];

		for (let glossary of glossaryDocs) {

			if (glossary.qcs.indexOf(req.user._id) !== -1) {
				isQC = true;
				qcOf.push(glossary);
			}
		}

		if (isQC) {

			req.qcOf = qcOf;
			return next();
		}
		else {
			return res.sendStatus(403);
		}
	})
	.catch(next);
};
