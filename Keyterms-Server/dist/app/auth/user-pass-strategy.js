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

var User = require('mongoose').model('User');
var log = require('../utils/logger').logger;
var Strategy = require('passport-local').Strategy;

var validateUser = function (username, done, next) {
	User.findOne({'username': username})
	.then( function (user) {
		if (user == null) {

			return done(null, 'no user');
		}
		else if (user.isDeactivated) {
			return done(null, 'user is disabled');
		}

		return user;
	})
	.catch( function (err) {
		log.error(err);
		done(err);
	})
	.then( function (user) {

		if (!!user) {
			next(user);
		}
	});
};

exports.stratCB = new Strategy(function (username, password, done) {
    log.debug('Inside Strategy callback');

	var next = function (user) {
		log.debug('checking password for ' + user.username);
		user.comparePassword(password)
		.then(function (isValidPassword) {
			if (isValidPassword) {
				log.debug('Password correct for ' + user.username);
				user.populate({
					path: 'glossaries',
					model: 'Glossary',
					select: 'name langList'
				}).execPopulate()
				.then(function (_user) {
					done(null, _user);
				});
			}
			else {
				log.debug('Password incorrect');
				done(null, false);
			}
		})
		.catch(function (err) {
			log.error(err);
			done(err);
		});
	};

	validateUser(username, done, next);
});

exports.serializeUser = function (user, done) {
    log.debug('serializing user: ' + user.username);
    done(null, user.username);
};

exports.deserializeUser = function (req, username, done) {
    log.debug('deserializingUser: ' + username);

    var next = function (user) {
		log.debug('Successfully deseralized: ' + user.username);
		done(null, user);
    };

	validateUser(username, done, next);
};

exports.changePassword = function(req, res, next){
    log.debug('Changing user password');
    this.req.user.changePassword(req.body.newPassword)
        .then(res.sendStatus(200)).catch(next);
};
