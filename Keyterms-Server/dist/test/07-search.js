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


describe("07-01 Testing Search API", function() {

    var env = new TestEnv();

    var request = env.request;
    var expect = env.expect;

    var mock = TestEnv.mock;

    var tag = '';
    var tagContent = '';
    var entry_id = '';
    var org_id = '';
    var tag_id = '';
    var term_id = '';
    var entry = '';
    var term = '';

    env.addSingleTerm();
    env.refreshIndex();

	it('should search for Entries by Tag', function(done) {

		tag = env.termDocs[0].tags[0];
		tagContent = 'tag1';
		request
		.get('/api/tags/search/' + tagContent)
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('array');
			expect(res.body.length).to.be(1);
			expect(res.body[0]).to.have.property('tags');
			expect(res.body[0].tags[0]).to.have.property('_id', tag.toString());
		})
		.end(function(err, res) {
			done(err);
		})
	});

	it('should find no Entries when Tag is not linked to any Entries', function(done) {
		done()
	});

	it('should find no Entries when Tag does not exist', function(done) {
		done();
	});

	// it('should search org for Entries by Term (get)', function(done) {
	// 	entry = env.termDocs[0];
	// 	term = entry.terms[0];
    //
	// 	request
	// 	.get('/api/search/org?langCode=eng&searchTerm=PANCAKES')
	// 	.expect(200)
	// 	.expect('Content-Type', /json/)
	// 	.expect(function(res) {
	// 		expect(res.body).to.be.an('array');
	// 		expect(res.body.length).to.be(1);
	// 		expect(res.body[0]).to.have.property('terms');
	// 		expect(res.body[0].terms[0]).to.have.property('termText', term.termText);
	// 	})
	// 	.end(function(err, res) {
	// 		done(err);
	// 	});
	// });
    //
	// it('should search org for Entries by Term (post)', function(done) {
    //
	// 	request
	// 	.post('/api/search/org')
	// 	.send({ langCode: term.langCode, searchTerm: term.termText })
	// 	.expect(200)
	// 	.expect('Content-Type', /json/)
	// 	.expect(function(res) {
	// 		expect(res.body).to.be.an('array');
	// 		expect(res.body.length).to.be(1);
	// 		expect(res.body[0]).to.have.property('terms');
	// 		expect(res.body[0].terms[0]).to.have.property('termText', term.termText);
	// 	})
	// 	.end(function(err, res) {
	// 		done(err);
	// 	})
	// });

	it('should find no Entries when Term is not linked to any Entries', function(done) {
		done()
	});

	it('should find no Entries when Term does not exist', function(done) {
		done();
	});

	// The difference between 'default' and 'org' search is well not documented
	it('should search default for Entries by Term (get)', function(done) {
        entry = env.termDocs[0];
		term = entry.terms[0];
		request
		.get('/api/search/default?langCode=eng&searchTerm=PANCAKES')
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('array');
			expect(res.body.length).to.be(1);
			expect(res.body[0]).to.have.property('terms');
			expect(res.body[0].terms[0]).to.have.property('termText', '<b class="search-hit">' + term.termText + '</b>');
		})
		.end(function(err, res) {
			done(err);
		})
	});

	it('should search default for Entries by Term (post)', function(done) {
		request
		.post('/api/search/default')
		.send({ langCode: term.langCode, searchTerm: term.termText })
		.expect(200)
		.expect('Content-Type', /json/)
		.expect(function(res) {
			expect(res.body).to.be.an('array');
			expect(res.body.length).to.be(1);
			expect(res.body[0]).to.have.property('terms');
			expect(res.body[0].terms[0]).to.have.property('termText', '<b class="search-hit">' + term.termText + '</b>');
		})
		.end(function(err, res) {
			done(err);
		})
	});

	it('should find no Entries when Term is not linked to any Entries', function(done) {
		done()
	});

	it('should find no Entries when Term does not exist', function(done) {
		done();
	});
});
