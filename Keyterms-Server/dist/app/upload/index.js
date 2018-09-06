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

var path = require('path');
var express = require('express');
var fileUploader = require('express-fileupload');
var fs = require('fs');
var Promise = require('bluebird');

var auth = require('../auth').middleware;

var tmp = require('../../config').tempDirectory;
var log = require('../utils/logger').logger;
var enums = require('../utils/enums');

var parsers = require('./parsers');
var formats = parsers.formats;

var router = express.Router();

// Middleware
router.use('/static', express.static(path.join(__dirname, 'public')));
router.use('/plugin', express.static(path.join(__dirname, 'plugin')));

router.use(auth.authenticate.processCert);

// ensure the user is an qc of *any* organization
router.use(auth.authorize.ensureQcOfAny);

router.use(fileUploader());

// Look for controller override plugin
var ctrlPath = path.join('static', 'js', 'upload.js');
var pluginPath = path.join(__dirname, 'plugin');
try {
	var pluginFiles = fs.readdirSync(pluginPath);
	pluginFiles.forEach(function(file) {
		if (file[0] !== '.' && file.slice(-3) === '.js') {
			try {
				ctrlPath = path.join('plugin', file);
				log.verbose(`Loading upload plugin: ${ file }...`);
			}
			catch (err) {
				log.warn(`Problem loading upload plugin: ${file}, skipping...`);
			}
		}
	})
}
catch (e) {
	log.warn('Problem loading upload plugin, skipping...');
}

/**
 * @api {get} /upload upload web client
 * @apiName File Upload Client
 * @apiGroup Upload
 * @apiVersion 3.0.0
 * @apiDescription Returns the upload web client, viewable by a browser
 *
 */
// GET /upload
router.get('/', function (req, res) {

	var includes = {
		fileTypes: formats.fileTypes,
		fileFormats: formats.fileTypeMap,
		user: req.user,
		orgs: req.qcOf
	};

	res.render('upload', {
		includes: JSON.stringify(includes),
		orgs: includes.orgs,
		viewScopes: enums.viewScopeTypesINFO,
		ctrlPath: ctrlPath
	});
});

/**
 * Note:
 * All endpoints after this point require organization authorization
 */
router.use(auth.authenticate.verifyRequest);

// POST /upload
router.post('/',
	function (req, res, next) {
		// ensure files have been uploaded to the server via this request
		if (!req.files) {
			log.error('No files were uploaded...');
			return res.status(400).send('No files were uploaded');
		}

		// ensure the tmp directory has been created
		try {
			fs.statSync(tmp);
		} catch(e) {
			fs.mkdirSync(tmp);
		}

		log.debug('File uploaded, processing...');
		var fileName = req.user.username + (new Date()).getTime().toString();
		req.filePath = tmp + '/' + fileName;
		req.originalFileName = req.files.file.name;
		var mimeType = req.files.file.mimetype;

		if (
			mimeType === 'application/vnd.ms-excel' ||
			mimeType === 'application/xliff+xml' ||
            mimeType === 'application/json' ||
			mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		{

			req.files.file.mv(req.filePath, function (err) {
				if (err) return next(err);
			});

			next();
		} else {
			log.error('User attempted to upload an invalid file type: ' + mimeType);
			return res.status(415).send('Only JSON, Excel, and Xliff files are supported.');
		}


	},
	function (req, res, next) {
		// console.log(req.body);
		// console.log(req.filePath);

		var async = Promise.resolve();

		switch (req.body.ext){
			case 'json':
				async = parsers.json.route(req);		break;
			case 'xls':
				async = parsers.xls.route(req);			break;
			case 'xliff':
				async = parsers.xliff.route(req);		break;
			default:
				async.then(() => new Error('Invalid file extension'));
		}

		async.then( function (errors) {
				var warnings = {};

			Object.keys(errors).forEach( function (key) {
				if ( Object.keys(errors[key]) > 0 ) {
					warnings[key] = errors[key];
				}
			});

			log.warn(warnings);
			res.json(errors);
		})
		.catch( function (err) {
			log.warn(`Error within upload logic: ${ err.message || err }`);

			return next(err);
		})
		.finally( function () {
			fs.unlink(req.filePath, function (err) {
				if(err){
					log.error(err);
				}
			});
		});
	});

module.exports = router;
