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

mongoose.Promise = require('bluebird');

var log = require('../utils/logger').logger;

var config = {};
if (/test/i.test(process.env.NODE_ENV)) {
	config = require('../../test/testConfig').db;
} else {
	config = require('../../config').db;
}

//var mongoUri = "mongodb://" + config.host + ":" + config.port + "/" + config.db;
var mongoUri = `mongodb://${config.secured ? config.user + ':' + config.pass + '@' : ''}${config.host}:${config.port}/${config.db}`;
//var conn = mongoose.createConnection(mongoUri);

var defaultOptions = {
	performCheck: true
};

var initDb = function (_options) {

	return new Promise( function (resolve, reject) {
		mongoose.connect(mongoUri);

		var options = _options || defaultOptions;

		mongoose.connection.once('open', function () {
			log.info('Mongo connection established to: ' + mongoUri);

			if (!options.performCheck) { return resolve(true); }

			var requiredCollections = ['entries', 'nominations', 'organizations', 'sessions', 'terms', 'tags', 'users'];

			log.info('Checking for required collections');

			mongoose.connection.db.listCollections().toArray( function(err, collections) {
				if (err) {
					log.error('ERROR: Could not retrieve collection list from Mongo');
					process.exit();
				}

				collections = collections.map(c => c.name);
				var warnings = 0;
				for (let requiredColl of requiredCollections) {
					log.info('Verifying collection: ' + requiredColl);

					if (collections.indexOf(requiredColl) === -1) {
						log.warn('Was unable to locate collection: ' + requiredColl);
						warnings++;
						//process.exit();
					}
				}

				if (warnings > 0) { log.warn('If this is a fresh install, you can ignore collection warnings'); }

				// if for loop is exited, all collections exist
				log.info('All required collections verified');
				resolve(true);
			});
		});

		// Checks for initial mongo connection failure and prints a pretty error message
		mongoose.connection.on('error', function (err) {
			if (/failed to connect to server \[(.*)\] on first connect/.test(err.message)) {
				log.error(`Could not establish connection to mongo db [${ mongoUri }]. Exiting...`);
				process.exit();
			}
			else {
				console.log('Connection error...');
				reject(err);
			}
		});
	});
};

module.exports = initDb;
