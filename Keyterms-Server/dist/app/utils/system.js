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

var git = require('git-rev-sync');
var fs = require('fs');
var path = require('path');
var elastic = require('./elasticSearch');
var log = require('./logger').logger;

var SCHEMA_VERSION = '3.1.0';

// returns the date when the current git commit was committed
var getLastCommitDate = function () {
	return new Date(git.date()).toISOString().slice(0, 10).replace(/-/g, '');
};

var storeVersion = function (version) {
	var fileName = path.join(__dirname, './serverInfo.json');
	var file = require('./serverInfo.json');

	file.keyTermsVersion = version;

	fs.writeFileSync(fileName, JSON.stringify(file, null, 4));
};

exports.getKeyTermsVersion = function () {
	try {
		var hash = git.short();
		var commitDate = getLastCommitDate();

		var versionStr = `3.${ commitDate }-${ hash }`;

		try {
			storeVersion(versionStr);
		} catch (e) {
			// do nothing - but don't interrupt execution
		}

		return versionStr;
	}
	catch (err) {
		// if git is not available, use the serverInfo.json file
		try {
			var file = require('./serverInfo.json');
		}
		catch (e) {
			if (e.message === "Cannot find module './serverInfo.json'") {
				return '3.x.x-UNKNOWN';
			}
		}

		return file.keyTermsVersion;
	}
};

exports.testElasticConnection = function () {
	var PING_INTERVAL = 1000 * 45;	// 45 seconds

	return elastic.ping()
	.then( function () {
		log.verbose('Verified ElasticSearch connection...');
	})
	.catch( function () {
		log.warn('Unable to connection to ElasticSearch...');
	})
	.then( function () {
		return setInterval( function () {
			elastic.ping()
			.catch( function () {
				log.warn('Unable to connection to ElasticSearch...');
			});
		}, PING_INTERVAL);
	});
};

exports.verifyIndexTemplate = function () {
	log.verbose('Verifying index template exists...');
	return elastic.termIndexTemplate.exists()
	.then( function (exists) {
		if (!exists) {
			log.warn('No index template found, attempting to create...');
			return elastic.termIndexTemplate.set();
		}

		return true;
	})
	.then( function (existed) {
		if (existed !== true) {
			log.verbose('Index template was successfully created');
		}

		return true;
	})
	.catch( function (err) {
		log.warn('Unable to create Index template');

		throw err;
	});
};

exports.SchemaVersion = SCHEMA_VERSION;
