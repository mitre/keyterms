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

var testConfig = TestEnv.config;

/**
 *`01-01 Testing server response from ${testConfig.server.protocol}://${testConfig.server.host} on port ${testConfig.server.port}`
 */
describe(`01-01 Testing server response from ${testConfig.server.url}$`, function () {
    var env = new TestEnv();

    var request = env.request;
    var expect = env.expect;

    it('should get the name of the server if it is running', function(done) {
		request
		.get('/api')
		.expect(302)
		.expect('Content-Type', 'text/plain; charset=utf-8', done);
	});

	it('should get server status information', function(done) {
		request
		.get('/api/status')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {

			// Test that all fields exist
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('mode');
			expect(res.body).to.have.property('mongoDbVersion');
			expect(res.body).to.have.property('keyTermsVersion');
			expect(res.body).to.have.property('keyTermsEntries');

			// Test that fields are correct
			expect(res.body.mode).to.match(/test/i);
			expect(res.body.mongoDbVersion).to.not.be.empty();
			expect(res.body.keyTermsVersion).to.not.be.empty();
			expect(res.body.keyTermsEntries).to.be.above(-1);
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	it('should get the entry schema', function(done) {
		request
		.get('/api/schema')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('_id');
			expect(res.body).to.have.property('glossary');
			expect(res.body).to.have.property('createdBy');
			expect(res.body).to.have.property('terms');
			expect(res.body).to.have.property('termLinks');
			expect(res.body).to.have.property('tags');
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	it('should get system enums', function(done) {
		request
		.get('/api/enums')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('objectsStatuses');
			expect(res.body).to.have.property('entryTypes');
			expect(res.body).to.have.property('noteTypes');
			expect(res.body).to.have.property('orthographyTypes');
			expect(res.body).to.have.property('nominationTypes');
			expect(res.body).to.have.property('viewScopeTypes');
			expect(res.body).to.have.property('editScopeTypes');
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	it('should get langcodes', function(done) {
		request
		.get('/api/langcodes')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('object');
			expect(res.body).to.have.property('languageCodes');
			expect(res.body.languageCodes).to.have.property('eng');
		})
		.end(function(err, res) {
	        done(err);
	    });
	});

	// it('should log into a test user account', function(done) {
	// 	request
	// 	.post('/login')
	// 	.send(users.user0)
	// 	.expect(200)
	// 	.expect('Content-Type', /json/)
	// 	.expect(function(res) {
	// 		expect(res.body).to.be.an('object');
	// 		expect(res.body).to.have.property('username', users.user0.username);
	// 		expect(res.body).to.have.property('email', users.user0.email);
	// 		expect(res.body).to.have.property('fullName', users.user0.fullName);
	// 		expect(res.body).to.have.property('isAdmin', users.user0.isAdmin);
	// 	})
	// 	.end(function(err, res) {
	//         done(err);
	//     });
	// });
});
