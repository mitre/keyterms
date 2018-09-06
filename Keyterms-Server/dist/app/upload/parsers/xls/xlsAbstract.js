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

var log = require('../includes').log;
var ImporterBase = require('../importerBase');

class xlsParser extends ImporterBase {
	constructor (ws, org, base) {
		super(org, base);

		log.verbose('Initializing xls Parser...');

		this.ws = ws;
		this.headers = {};

		this.parseHeader();
	}

	parseHeader () {
		log.verbose('Parsing header row...');
		var self = this;
		this.ws.getRow(1).values.forEach( function (val, index) {
			// creates mapping of header names to their column position
			if (index === 0) { return; }	// exceljs does not use the zero index
			self.headers[val] = index;
		});
		log.verbose('headers: ', self.headers);
	}

	parse () {
		throw new Error('xls Parser is meant to be an abstract class');
	}
}

module.exports = xlsParser;
