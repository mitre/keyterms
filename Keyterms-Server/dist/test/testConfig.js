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

"use strict";
var path = require('path');

var config = require('../config').server;
var env = process.env.NODE_ENV || 'TEST';
process.env.NODE_ENV = env;
var testConfig = {};

// Node automatically rejects self signed certs
// turns this feature off in development mode
if (/prod/i.test(env))
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Database (Mongo) configurations
testConfig.db = {
	host: 'kttest02.mitre.org',
	port: 27017,
	db: 'KeyTermsTest',
	secured: false,		// set to true if Mongo instance is username/password protected
	user: '',
	pass: ''
};

testConfig.logSetup = {
	level: 'silly',
	label: 'testLog',
	colorize: false,
	timestamp: false,
	filename: path.join(__dirname, '../logs/unittest.log'),
	json: false,
	handleExceptions: false,
	options: { flags: 'w' }
};

testConfig.testUser = {
	username: 'starkidpotter',
	password: 'alohomora'
};

testConfig.server = {
	protocol: "http" + (config.useHTTPS ? "s" : ""),
	host: "localhost",
	port: (env.match(/prod/i) ?
		(config.useHTTPS ? config.prod.https : config.prod.http) :
		(config.useHTTPS ? config.dev.https : config.dev.http))
};

testConfig.server.url = testConfig.server.protocol + "://" + testConfig.server.host + ":" + testConfig.server.port;

module.exports = testConfig;
