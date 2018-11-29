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

var CONSTANTS = require('constants');

try {
	var _config = require('../config');
}
catch (e) {
	_config = null;
}

var config = {};

// Server configurations
config.server = {
	useHTTPS: false,
	cookieExpiration: 1000 * 60 * 60 * 24,		// one day in milliseconds
	sessionSecret: 'shhh dont tell anyone',
	location: 'localhost:4000',					// the location of the server where this instance of
												//   KeyTerms is being deployed, including port number
												//   (e.g. 'keyterms.mycompany.org:4000')
	prod: {
		http: 5000,
		https: 5443,
		// NOTE: Make sure to use the correct protocol (http or https), and include port
		allowedCorsDomains: ['http://localhost:8080']
	},
	dev: {
		http: 4000,
		https: 4443,
		// NOTE: Make sure to use the correct protocol (http or https), and include port
		allowedCorsDomains: ['http://localhost:8080']
	},
	SSLCerts: {
		key: __dirname+ '/certs/default.key',
		passphrase: '',
		cert: __dirname+ '/certs/default.crt',
		ca: [__dirname+ '/certs/ca/ca.cert.pem']
	},
	TLSOptions: {
		requestCert: true,
		rejectUnauthorized: true,
		secureProtocol: 'TLSv1_2_method',
		secureOptions: CONSTANTS.SSL_OP_NO_SSLv3 || CONSTANTS.SSL_OP_NO_SSLv2 ||
			CONSTANTS.SSL_OP_NO_TLSv1 || CONSTANTS.SSL_OP_NO_TLSv1_1,
		ciphers: 'ECDHE-RSA-AES128-SHA256:AES128-GCM-SHA256:HIGH:!RC4:!MD5:!aNULL:!EDH',
		honorCipherOrder: true
	}
};

// Common (default) Glossary configuration
config.commonGlossary = {
	name: 'Default Glossary',
	abbreviation: 'gloss',
	description: 'Glossary that all users belong to by default'
}

// Logging configurations

// Winston log levels via winston documentation:
// error=0, warn=1, info=2, verbose=3, debug=4, silly=5

config.enableLogFile = false;
config.logSetup = {
	name: 'console-log',
	level: (process.env.NODE_ENV && process.env.NODE_ENV.match(/prod/i)) ? 'verbose' : 'silly',
	json: false,
	colorize: true,
	prettyPrint: true,
	handleExceptions: false
};
config.logFileSetup = {
	name: 'file-log',
	level: (process.env.NODE_ENV && process.env.NODE_ENV.match(/prod/i)) ? 'verbose' : 'silly',
	json: false,
	colorize: false,
	prettyPrint: true,
	handleExceptions: true,
	filename: './logs/daily-log',
	datePattern: '-yyyy-MM-dd.log'
};


// Database (Mongo) configurations
config.db = {
	host: 'localhost',
	port: 27017,
	db: 'KeyTerms',
	secured: false,		// set to true if Mongo instance is username/password protected
	user: '',
	pass: ''
};

// NLP Services configurations

config.nlp = {
	// base url for the NLP Services server
	// url: 'http://localhost:8080/NLPServices/svc',
	// url: 'https://localhost:8443/NLPServices/svc',

        // if false, http is used rather than https
	 useHTTPS: false,
	 protocol: 'http:',
     hostname: 'localhost',
     port: 8080,
	 endpoint: '/NLPServices/svc',

	// these are the certs for NLP Services, only used if useHTTPS=true
	// by default, we re-use the same certs the KeyTerms API is served with
	certs: config.server.SSLCerts

	// uncomment this to include specific certs for NLP
	// certs: {
	// 	key: __dirname+ '/certs/key.pem',
	// 	cert: __dirname+ '/certs/cert.pem',
	// 	ca: [__dirname+ '/certs/ca.pem']
	// 	}
};

// ElasticSearch configurations
config.elastic = {
	host: 'localhost',
	port: 9200,
	protocol: 'http'
};

config.tempDirectory = 'tmp';


module.exports = (_config != null) ? _config : config;
