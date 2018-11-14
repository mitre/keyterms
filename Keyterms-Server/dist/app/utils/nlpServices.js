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

// An Interface for using NLP Services in conjunction with KeyTerms

/**
 * [NLPServices on HTTPS]
 *
 * var fs = require('fs');
 *
 * // append these fields to the requestLib.defaults anonymous object
 * 		cert: fs.readFileSync('<path/to/cert'),
 *  	key: fs.readFileSync('<path/to/key'),
 *  	passphrase: '<the passphrase of the key>'		// THIS MAY NOT BE NEEDED
 *  	ca: fs.readFileSync('<path/to/ca'),
 */

var config = require('../../config').nlp;

var requestLib = require('request');
var REQUEST_DEFAULTS = {
	method: 'GET',
	jar: true,
	json: true
};

if (config.useHTTPS) {
	var fs = require('fs');
	var certs = config.certs;

	REQUEST_DEFAULTS.cert = fs.readFileSync(certs.cert);
	REQUEST_DEFAULTS.key = fs.readFileSync(certs.key);
	REQUEST_DEFAULTS.ca = certs.ca.map(ca => fs.readFileSync(ca));
}

var request = requestLib.defaults(REQUEST_DEFAULTS);
var Promise = require('bluebird');

var log = require('./logger').logger;

var fetch = function (url) {
	return new Promise( function (resolve, reject) {
		request(url, function (err, resp, body) {
			log.debug('request to NLP returned a: ' + resp.statusCode);
			if (err) {
				reject(err);
			}
			else {
				resolve(body);
			}
		});
	});
};

// TODO: support HTTTPS as well??
exports.callService = function (termText, langCode, index) {
	log.debug('Calling NLP Services...' + termText);

	index = (index === undefined) ? false : index;
	termText = encodeURIComponent(termText);

	var url = `${config.url}?srctxt=${termText}&lang=${langCode}&index=${index}`;
	return fetch(url)
	.then( function (resp) {
		return resp;
	})
	.catch( function (err) {
		log.warn('Error while querying NLP Services!');
		log.error(err);
		return err;
	});
};

exports.getISO = function (language) {

    log.debug('Calling language lookup Services...' + language);

    //language = encodeURIComponent(language);
    var url = `${config.url}iso/language?query=${language}`;

	return fetch(url)
	.then( function (resp) {
		return resp;
    })
	.catch( function (err) {
        log.warn('Error while querying NLP Services!');
        log.error(err);
        return err;
    });
};
