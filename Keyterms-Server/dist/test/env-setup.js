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

var envRegex = /test/i;

if (!(envRegex.test(process.env.NODE_ENV))) {
	process.env.NODE_ENV = 'TEST';
}

var app = require('../app/app.js').app;

var mongoose = require('mongoose');
var Promise = require('bluebird');
var defaults = require('superagent-defaults');
var testAgent = require('supertest').agent(app);

var request = defaults(testAgent);

var expect = require('expect.js');

var log = require('../app/utils/logger').logger;
var elastic = require('../app/utils/elasticSearch');

var Entry = require('../app/db/interfaces').$Entry;

var mock = require('./mock-data');
var config = require('./testConfig');

request.set('Origin', 'http://localhost:4000');
///////////////////////////////////////////////////////////////////

var init = function (done) {

	return mongoose.model('Glossary').countDocuments({})
	.then( function (glossaryCount) {
		if (glossaryCount == 0)
			return mongoose.model('Glossary').create(mock.standard.glossary);
		else
			return mongoose.model('Glossary').findOne(mock.standard.glossary).exec();
	})
	.then( function (glossary) {
		return mongoose.model('User').countDocuments({})
		.then( function (usrCount) {
			if (usrCount == 0) {
				var usr = deepCopy(mock.standard.user);
				usr.glossaries = [];
				usr.glossaries.push(glossary._id);
				usr.currentGlossary = glossary._id;

				return mongoose.model('User').create(usr);
			}
			else
				return mongoose.model('User').findOne({email: mock.standard.user.email}).exec();
		});
	})
	.then(() => done()).catch(done);
};

// NOTE: mongoose.connection methods interface with the mongodb native driver directly, therefore do not return Promises
var dropDb = function () {
	return new Promise( function (resolve, reject) {
		mongoose.connection.db.dropDatabase( function (err) {
			if (!!err) return reject(err);

			return resolve(true);
		})
	})
};

// crude deep copy utility function
var deepCopy = function (obj) {
	return JSON.parse(JSON.stringify(obj));
};

///////////////////////////////////////////////////////////////////

var env = class Env {

	constructor () {
		if (!envRegex.test(process.env.NODE_ENV)) {
			throw new Error(`Bad NODE_ENV [${process.env.NODE_ENV}] variable detected, exiting...`);
		}

		console.log(`Test started at ${new Date().toLocaleString()}`);

		this.app = app;
		this.request = request;
		this.expect = expect;

		this.termDocs = [];
		this.nomDocs = [];
		this.modNomDocs = [];
		this._onInit();
	}

	_onInit () {
		var self = this;

		before( function (done) {
			self._before(done);
		});

		after( function (done) {
			self._after(done);
		});

		beforeEach( function () {
			self._beforeEach();
		});

		afterEach( function () {
			self._afterEach();
		});
	}

	_before (done) {
        var dbOptions = {preformCheck: false};
        var self = this;

		return mongoose.disconnect()
		.catch(function(err){
			log.error(err);
			return true
		})
		.then(function(){

			return require('../app/db').init(dbOptions)
		})
		.then(function() {
			return dropDb();
		})
		.then(function(){
			return mongoose.model('Glossary').create(mock.standard.glossary)
		})
		.then( function(glossary) {
			return mongoose.model('Glossary').createIndexes()
			.then(function () {
				return glossary;
			})
		})
		.then( function (glossary) {
			self.glossary = glossary;
            var usr = deepCopy(mock.standard.user);
            usr.glossaries = [];
            usr.glossaries.push(glossary._id);
            usr.currentGlossary = glossary._id;

            return mongoose.model('User').create(usr)
			.then( function(user) {
				return mongoose.model('User').createIndexes()
				.then(function(){
					return user;
				})
			});
		})
		.then( function (user) {
			self.user = user;

			self.glossary.addQC(self.user);
			self.glossary.addAdmin(self.user);

			console.log('logging in...', self.user._id);

			self.request
			.post('/login')
			.send(config.testUser)
			.expect(200, done);
		})
		.catch(done);
	}

	_after (done) {
		return elastic.deleteGlossaryIndex(this.glossary._id.toString())
		.catch( function (err) {
			//This error is expected from tests 01-server, 04-glossaries, 05-users because no elastic index is created.
			log.warn('Error removing Elastic Index');
			log.error(err);
			//console.log('Error removing Elastic Index');
			return true;
		})
		.then(function () {
			return dropDb();
		})
		.then( function () {
			return mongoose.disconnect();
		})
		.catch( function (err) {
			log.error(err);
			console.log('Problem cleaning up Test Env after test execution');
		})
		.finally( function () {
			console.log(`Test ended at ${new Date().toLocaleString()}`);
			done();
		});

	}

	_beforeEach () {
		// log.info(this.currentTest.fullTitle());
		// mongoose.model('Glossary').findOne(mock.standard.glossary).exec()
		// .then( function (glossary) {
		// 	console.log(glossary.entries);
		// })
	}

	_afterEach () {

	}

	static get config () { return deepCopy(config) }

	static get mock () { return deepCopy(mock) }

	static get mockEntry () { return deepCopy(mock.entries.valid[1]) }
	static get mockEntry2 () {return deepCopy(mock.entries.valid[0]) }
	static get mockNom () {return deepCopy(mock.nominations.valid[0])}

	static get mockMongoId () { return (new mongoose.Types.ObjectId()).toString(); }

	addSingleTerm () {
		var self = this;

		before( function (done) {
			// must be deep copy
			var rawEntry = deepCopy(mock.entries.valid[1]);
			rawEntry.createdBy = self.user._id;

			Entry.createEntry(rawEntry, self.glossary)
			.then( function (doc) {
				self.termDocs.push(doc);
				done();
			})
			.catch(done);
		});
	}

	addTerms () {
		var self = this;

		before( function (done) {
			Promise.mapSeries(mock.entries.valid, function (entryData) {
				entryData = deepCopy(entryData);
				entryData.createdBy = self.user._id;

				Entry.createEntry(entryData, self.glossary)
				.then(function (doc){
					self.termDocs.push(doc);

				})
			})
			done().catch(done);
		});
	}

	addNomination () {
		var self = this;

		before( function (done) {
			var newNomination = deepCopy(mock.nominations.valid.add);
			newNomination.createdBy = self.user._id;

			mongoose.model('Nomination').create(newNomination)
			.then( function (doc) {
				self.glossary.addNom(doc._id);
				self.nomDocs.push(doc);
				done();
			})
			.catch(done);

		})
	}

	addModNomination () {
		var self = this;

		before( function (done) {
			var modNomination = deepCopy(mock.nominations.valid.nom);

			modNomination.createdBy = self.user._id;

			mongoose.model('Nomination').create(modNomination)
			.then( function (doc) {

				doc.originalEntry = doc._id;

				self.glossary.addNom(doc._id);
				self.modNomDocs.push(doc);

				done();
			})
			.catch(done);

		})
	}

	// Added to force an index refresh in the search tests
	refreshIndex () {
		var self = this;

		before( function (done){
			elastic.manualRefresh('kt_' + self.glossary._id)
			.then(function (res) {
				done();
			})
			.catch(done);

		})

	}
};

///////////////////////////////////////////////////////////////////

exports.TestEnv = env;
