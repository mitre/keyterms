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
var auth = require('../auth').middleware;

var router = express.Router();

// Middleware
router.use('/static', express.static(path.join(__dirname, 'public')));

router.use(auth.authenticate.processCert);
router.use(auth.authenticate.verifyRequest);

router.get('/logout', (req, res) => res.redirect('/logout'));

/**
 * @api {get} /admin admin web client
 * @apiName Administration Client
 * @apiGroup Administration
 * @apiVersion 3.0.0
 * @apiDescription Returns the admin web client, viewable by a browser
 *
 */
router.get('/(*)?', function(req, res, next) {
	req.user.populate([
		{
			path: 'currentOrg',
			model: 'Organization',
			select: 'name abbreviation'
		}, {
			path: 'organizations',
			model: 'Organization',
			select: 'name abbreviation'
		}
	]).execPopulate()
	.then( function (_user) {
		var user = _user.toObject();
		user.password = undefined;
		user.isOrgAdmin = (req.org.admins.indexOf(user._id) !== -1);
		user.isOrgQC = (req.org.qcs.indexOf(user._id) !== -1);

		res.render('admin', {user: JSON.stringify(user)});
	})
	.catch(next);
});

module.exports = router;
