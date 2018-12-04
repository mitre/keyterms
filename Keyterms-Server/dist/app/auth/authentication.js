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
var config = require('../../config').server;

var mongoose = require('mongoose');
var Glossary = mongoose.model('Glossary');
var User = mongoose.model('User');

exports.verifyRequest = function (req, res, next) {
	log.debug('verifying request');

	// verify request comes from a user with a current session
	if (!!req.user && typeof req.user === 'object') {
		log.debug('Request has corresponding session');

		// retrieve the Glossary
		Glossary.findOne({_id: req.user.currentGlossary}).exec()
		.then( function (glossary) {
			req.glossary = glossary;
			next();
		}).catch( function () {
			log.error('Glossary doc not found!');
			res.sendStatus(500);
		});
	} else {
		// Send 401 to signify to client that a login process needs to be preformed via the /login endpoint
		return res.sendStatus(401);
	}
};

// Middleware to process user certs
exports.processCert = function (req, res, next) {
	// skip processing the cert, if the user has already been deserialized
	if (!!req.user) {
		return next();
	}

	// req.connection.getPeerCertificate only exists when using https
	if (config.useHTTPS) {
		log.debug('HTTPS in uses, parsing cert...');

		var peerCert = req.connection.getPeerCertificate();
		//console.log(peerCert);
		// ensure the cert has the necessary fields
		if (Object.keys(peerCert) < 1 || (!peerCert.subjectaltname || !peerCert.subject.CN)) {
			// No cert available, try normal authentication method
			log.debug('No cert found, skipping...');
			return next();
		}
		else {
			// At this point, the cert exists and has the necessary fields

			// parse the cert, the based on old KeyTerms version, I'm assuming
			// the format is "othername:<whatever>, email:user@server.here"
			var regex = /.*(,\s)?email\s?:\s?(.+).*/i;
			var emailStr = regex.exec(peerCert.subjectaltname)[2];
			log.debug(`Parsing results: email=${emailStr}, username=${peerCert.subject.CN}`);

			// query the User object from the cert data
			User.findOne({username: peerCert.subject.CN, email: emailStr})
			.then( function (user) {
				if (user == null) {
					log.debug('No user found, skipping...');
					next();
				}
				else {
					log.debug(`Logging in as ${user.username} (${user.email})...`);
					req.login(user, function (err) {
						if (err) {
							throw new Error('Log in via cert failed');
						}
						else {
							return next();
						}
					});
				}
			})
			.catch( function (err) {
				//console.log(err.message);
				log.debug('Error while querying for user object from cert data, skipping...');
				return next(err);
			});
		}
	}
	else {
		return next();
	}
};

exports.ensureAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.sendStatus(401);
    }
};
