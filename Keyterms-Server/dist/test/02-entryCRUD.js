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


describe('02-01 Testing APIs Entry CRUD endpoints and operations', function() {

    var env = new TestEnv();

    var request = env.request;
    var expect = env.expect;

    var mock = TestEnv.mock;

    var rawEntryData = TestEnv.mockEntry;

    var entryId = '';
    var glossaryId = '';

    var entryUpdate = TestEnv.mockEntry2;
    entryUpdate.viewScope = 'any';
    entryUpdate.editScope = 'any';

	it('should fail to insert an invalid Entry', function(done) {
		request
		.post('/api/entry/create')
		.send(mock.entries.invalid)
		.expect(400, done);
	});

	it('should insert a valid Entry', function(done) {
		request
		.post('/api/entry/create')
		.send(rawEntryData)
		.expect(201)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			entryId = res.body._id;
			glossaryId = res.body.glossary._id || res.body.glossary;
			glossaryBody = res.body.glossary;
			//console.log(glossaryId);
			//console.log(res.body);
			// Test that all fields exist
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('editScope', rawEntryData.editScope);
			expect(res.body).to.have.property('viewScope', rawEntryData.viewScope);
			expect(res.body).to.have.property('isDraft', false);
			expect(res.body).to.have.property('schemaVersion');
			expect(res.body).to.have.property('modificationDate');
			expect(res.body).to.have.property('type', 'term');
			expect(res.body).to.have.property('glossary', glossaryBody);

			expect(res.body).to.have.property('terms');
			expect(res.body).to.have.property('termLinks');
			expect(res.body).to.have.property('tags');
			expect(res.body).to.have.property('notes');

			// Test that fields are correct
			expect(res.body.terms.length).to.be.greaterThan(rawEntryData.terms.length - 1); // may have created extra transliterations
			expect(res.body.termLinks.length).to.be.greaterThan(rawEntryData.termLinks.length - 1); // may have created extra links
			expect(res.body.tags.length).to.be(rawEntryData.tags.length);
			expect(res.body.notes.length).to.be(rawEntryData.notes.length);
		})

		.end(function(err, res) {
	        if (err) return done(err);

			// TODO: revisit this test
	        // Test that glossary contains entry
	        request
	        .get('/api/glossary/g/' + glossaryId)
	        .expect(function(response) {
				expect(response.body).to.have.property('entries');
				expect(response.body.entries).to.be.greaterThan(0);
	        })
	        .end(function(error, response) {
				done(error);
	        });
	    });
	});

	it('should read an existing Entry', function(done) {
		request
		.get('/api/entry/' + entryId)
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {

			// Test that all fields exist and are correct
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('_id', entryId.toString());
			expect(res.body).to.have.property('editScope', 'glossary');
			expect(res.body).to.have.property('viewScope', 'glossary');
			expect(res.body).to.have.property('isDraft', false);
			expect(res.body).to.have.property('schemaVersion');
			expect(res.body).to.have.property('modificationDate');
			expect(res.body).to.have.property('type', 'term');
			expect(res.body.glossary).to.have.property('_id', glossaryId.toString());
		})
		.end(function(err, res) {
			//entryUpdate = Object.assign({}, res.body);

	        done(err);
	    });
	});

	it('should read all Entries by this user', function(done) {
		request
		.get('/api/myentries')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('array');
			expect(res.body).to.not.be.empty();
			//expect(res.body[0]._id).to.be(entryId.toString());
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	it('should insert a draft Entry', function (done) {
		var draftData = Object.assign({}, rawEntryData);
		draftData.isDraft = true;

		request
		.post('/api/entry/create')
		.send(draftData)
		.expect(201)
		.expect('Content-Type', /json/)
		.end(function(err, res) {
			done(err);
		});
	});

	it('should read all draft Entries by this user', function(done) {
		request
		.get('/api/mydrafts')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('array');
			expect(res.body).to.not.be.empty();
			//expect(res.body[0]._id).to.be(entryId.toString());
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	it('should fail to read a non-existant Entry', function(done) {
		request
		.get('/api/entry/' + glossaryId)
		.expect(404, done);
	});

	it('should fail to read a garbage id', function(done) {
		request
		.get('/api/entry/garbage')
		.expect(400, done);
	});

	it('should update an Entry', function(done) {


		request
		.post('/api/entry/' + entryId)
		.send(entryUpdate)
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('_id', entryId.toString());
			expect(res.body).to.have.property('editScope', entryUpdate.editScope);
			expect(res.body).to.have.property('viewScope', entryUpdate.viewScope);
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	it('should fail to update an entry in an invalid way', function(done) {
		var invalidUpdate = {};
		invalidUpdate.viewScope = 'bloop';

		request
		.post('/api/entry/' + entryId)
		.send(invalidUpdate)
		.expect(404, done);
	});

	it('should fail to update a non-existant Entry', function(done) {
		request
		.post('/api/entry/' + glossaryId)
		.send(entryUpdate)
		.expect(404, done);
	});

	it('should fail to update a garbage id', function(done) {
		request
		.post('/api/entry/garbage')
		.send(entryUpdate)
		.expect(400, done);
	});

	it('should delete an Entry document', function(done) {
		request
		.delete('/api/entry/' + entryId)
		.expect(204)
		.end(function(err, res) {
	        if (err) return done(err);

	        // Test that glossary no longer contains entry
	        request
	        .get('/api/glossary/g/' + glossaryId)
	        .expect(function(response) {
				expect(response.body).to.have.property('entries');
				expect(response.body.entries).to.not.contain(entryId);
	        })
	        .end(function(error, response) {
				done(error);
	        });
	    });
	});

	it('should fail to delete a non-existant Entry', function(done) {
		request
		.delete('/api/entry/' + glossaryId)
		.expect(404, done);
	});

	it('should fail to delete a garbage id', function(done) {
		request
		.delete('/api/entry/garbage')
		.expect(400, done);
	});
});
