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

var Parsers = {
	v2: {
		0: require('./formats/v2.0.js')
	},
	v1: {
		2: require('./formats/v1.2.js')
	}
};

var route = function (req) {
	var ParserClass = null;

	switch (req.body.format) {
		case 'v1.2':
			ParserClass = Parsers.v1[2];			break;
		case 'v2.0':
			ParserClass = Parsers.v2[0];			break;
	}

	if (!ParserClass) {
		throw new Error(`Invalid Parser format [${req.body.format}] for ext [${req.body.ext}]`);
	}

	var base = {
		viewScope: req.body.vs,
		createdBy: req.user._id,
		notes: [{
			createdBy: req.user._id,
			type: 'source',
			text: `THIS ENTRY WAS IMPORTED FROM ${req.originalFileName} BY ${req.user.fullName} (${req.user.email}) ON ${(new Date()).toLocaleString()}`
		}]
	};

	var parser = new ParserClass(req, base);
	return parser.parse();
};

module.exports = {
	Parsers: Parsers,
	route: route
};
