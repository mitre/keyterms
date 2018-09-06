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

var inc = require('../../includes');
var log = inc.log;

var xmlParser = require('../xmlAbstract');

try {
	var langCodes = require('../../../../utils/langCodes.json');
}
catch (e) {
	log.error('Failed to load langCodes');
	throw e;
}

// build map for mapping ISO codes
// built here to save memory when a XliffParser is initialized
langCodes = langCodes.languageCodes;
var ISO6391 = {};
Object.keys(langCodes).forEach(code => {
	var isoCode = langCodes[code].ISO6391;
	if (isoCode) {
		ISO6391[isoCode] = code;
	}
});

// NOTE: Abstract Class
class xliffParser extends xmlParser {
	constructor (req, base) {
		super(req, base);

		log.verbose('Initializing xliff Parser...');

		this.ptype = 'xliffParser';
	}

	// converts a ISO-6391 language code to a KeyTerm's language code
	static mapISO (code) {
		return ISO6391[code.slice(0, 2)];
	}

	// Inherited from xmlParser
	// parseFile () {}
	// parse () {}
}

module.exports = xliffParser;
