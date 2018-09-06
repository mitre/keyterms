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

var TestEnv = require('./env-setup').TestEnv;


describe('03-01 Testing APIs Nomination endpoints and operations', function () {

    var env = new TestEnv();

    var request = env.request;
    var expect = env.expect;

    var mock = TestEnv.mock;

    var rawEntryData = TestEnv.mockEntry;

    env.addSingleTerm();
    env.addNomination();
    env.addModNomination();

    var addId = '';
    var modId = '';
    var delId = '';
    var nomId = '';
    var entry1_id = '';
    var entry2_id = '';
    var orgId = '';
    var entryId = '';
    var originialEntry = '';

	it('should fail to insert an invalid Nomination', function(done) {
		request
		.post('/api/nomination/create')
		.send({ data: rawEntryData }) // no type
		.expect(400, done);
	});

	it('should insert a valid Add Nomination', function(done) {
		var addNomination = {
			type: 'add',
			data: rawEntryData
		};

		request
		.post('/api/nomination/create')
		.send(addNomination)
		.expect(201)
		.expect('Content-Type', /json/)
		.expect(function(res) {

			// Test that all fields exist and are correct
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('type', 'add');
			expect(res.body).to.have.property('data');
		})
		.end(function(err, res) {
			if (err) return done(err);

			addId = res.body._id;
			// Test that org contains nom
			request
			.get('/api/org/o/' + env.org._id)
			.expect(function(response) {
				expect(response.body).to.have.property('nominations');
				expect(response.body.nominations).to.be.greaterThan(0);
			})
			.end(function(error, response) {
				done(error);
			});
		});
	});

	it('should approve an Add Nomination', function(done) {
		request
		.post('/api/nomination/approve/' + addId)
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			entryId = res.body._id;
			// Test that all fields exist and are correct

			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('_id', entryId.toString());
		})
		.end(function(err, res) {
			done(err);
		});
	});

	it('should insert a valid Mod Nomination', function (done) {
		var modNomination = {};
		modNomination.type = 'mod';
		modNomination.originalEntry = entryId;
		modNomination.data = rawEntryData;
		modNomination.data.notes = [{ text: 'Test modification', type: 'general' }];

		request
		.post('/api/nomination/create')
		.send(modNomination)
		.expect(201)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			// Test that all fields exist and are correct
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('type', modNomination.type);
			expect(res.body).to.have.property('originalEntry', entryId);
			expect(res.body).to.have.property('data');
			expect(res.body).to.have.property('notes');
			expect(res.body.data.notes).to.not.be.empty();
		})
		.end(function(err, res) {
			modId = res.body._id;
			originialEntry = res.body.originalEntry;

			done(err);
		});
	});

	it('should insert a valid Delete Nomination', function (done) {
		var delIdination = {
			type: 'del',
			originalEntry: entryId
		};

		request
		.post('/api/nomination/create')
		.send(delIdination)
		.expect(201)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			// Test that all fields exist and are correct
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('type', delIdination.type);
			expect(res.body).to.have.property('originalEntry', entryId);
		})
		.end(function(err, res) {
			delId = res.body._id;

			done(err);
		});
	});

	it('should read an existing Nomination', function(done) {

		nomId = env.nomDocs[0]._id;

		request
		.get('/api/nomination/' + nomId)
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {

			// Test that all fields exist and are correct
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('_id', nomId.toString());
			expect(res.body).to.have.property('type', 'add');
			expect(res.body).to.have.property('data');
		})
		.end(function(err, res) {
			done(err);
		});
	});

	it('should fail to read a non-existant Nomination', function(done) {
		request
		.get('/api/nomination/' + orgId)
		.expect(404, done);
	});

	it('should fail to read a garbage id', function(done) {
		request
		.get('/api/nomination/garbage')
		.expect(400, done);
	});

	it('should read all Nominations currently in database', function(done) {
		request
		.get('/api/nominations')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('array');
			expect(res.body.length).to.be.greaterThan(0);
			expect(res.body[0]._id).to.be(nomId.toString());
		})
		.end(function(err, res) {
			done(err);
		});
	});

	it('should approve a Mod Nomination', function(done) {

		request
		.post('/api/nomination/approve/' + modId)
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {

			// Test that all fields exist
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('id', originialEntry.toString());
			expect(res.body).to.have.property('terms');
			expect(res.body).to.have.property('termLinks');
			expect(res.body).to.have.property('tags');
			expect(res.body).to.have.property('notes');

			// Test that fields are correct
			expect(res.body.terms).to.not.be.empty();
			expect(res.body.termLinks).to.not.be.empty();
			expect(res.body.tags.length).to.be(rawEntryData.tags.length);
			expect(res.body.notes.length).to.be(rawEntryData.notes.length);
			expect(res.body.notes[0].text).to.be(rawEntryData.notes[0].text);
		})
		.end(function(err, res) {
			done(err);
		});
	});

	it('should approve a Del Nomination', function(done) {
		request
		.post('/api/nomination/approve/' + delId)
		.expect(200)
		.end(function(err, res) {
			done(err);
		})
	});

	it('should fail to approve a non-existant Nomination', function(done) {
		request
		.post('/api/nomination/approve/' + orgId)
		.expect(404, done);
	});

	it('should fail to approve a garbage id', function(done) {
		request
		.post('/api/nomination/approve/garbage')
		.expect(400, done);
	});

	it('should reject a Nomination', function (done) {
		entry2_id = env.termDocs[0]._id;
		modId = env.modNomDocs[0]._id;
		request
		.post('/api/nomination/reject/' + modId)
		.expect(200)

		// Test that entry was unchanged
		.end(function(err, res) {
			if (err) return done(err);

			request
			.get('/api/entry/' + entry2_id)
			.expect(200)
			.expect(function(response) {
				expect(response.body).to.be.an('object');
				expect(response.body.terms.length).to.be(5); //hardcoded to account for nlp terms added after entry is created
				expect(response.body.termLinks).to.not.be.empty();
				expect(response.body.tags.length).to.be(env.termDocs[0].tags.length);
				expect(response.body.notes.length).to.be(env.termDocs[0].notes.length);
			})
			.end(function(error, response) {
				done(error);
			});
		});
	});

	it('should fail to reject a non-existant Nomination' , function(done) {
		request
		.post('/api/nomination/reject/' + orgId)
		.expect(404, done);
	});

	it('should fail to reject a garbage id', function(done) {
		request
		.post('/api/nomination/reject/garbage')
		.expect(400, done);
	});
});
