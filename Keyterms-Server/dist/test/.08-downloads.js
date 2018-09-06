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

// WIP

var app = require('../app/app.js');
var testConfig = require('./testConfig');
var request = require('supertest').agent(app);
var expect = require('expect.js');

var mongoose = require('mongoose');
var Entry = mongoose.model('Entry');
var Organization = mongoose.model('Organization');
var Tag = mongoose.model('Tag');
var Term = mongoose.model('Term');

var common = require('common');
var entries = common.entries;

var entry = {}
var tag = { content: 'tag1' };
var term = { termText: 'test crud 1', langCode: 'eng' };

var entry_id = '';
var org_id = '';
var tag_id = '';
var term_id = '';

describe('08-01 Testing APIs downloads endpoints', function() {

    /**
     * Before hook: create test data, login to test user account.
     */
    before(function(done) {

        // Find starter org
        Organization.findOne().then(function(response) {
            org_id = response._id;
            entry.org = org_id;
            tag.org = org_id;

            // Insert tag
            return Tag.create(tag).then(function(response) {
                tag_id = response._id;
            });

        // Insert term
        }).then(function(response) {
            return Term.create(term).then(function(response) {
                term_id = response._id;
            });

        // Insert entry
        }).then(function(response) {
            entry.tags = [tag_id];
            entry.terms = [term_id];
            return Entry.create(entry).then(function(response) {
                entry_id = response._id;
            });

        // Update tag with entry
        }).then(function(response) {
            return Tag.update({ _id: tag_id }, { $set: { entries: entry_id }});

        // Update org with entry
        }).then(function(response) {
            return Organization.update({ _id: org_id }, { $set: { entries: entry_id }});

        // Login
        }).then(function(response) {
            request
            .post('/login')
            .send(testConfig.testUser)
            .expect(200, done);
        });
    });

    /**
     * After hook: undo important changes to the database
     */
    after(function(done) {

        // clear out entry, tag, and term collections
        mongoose.connection.db.dropCollection('entries', function(err, response) {
            mongoose.connection.db.dropCollection('tags', function(err, response) {
                mongoose.connection.db.dropCollection('terms', function(err, response) {
                    // reset org
                    Organization.update({ _id: org_id}, { $unset: { "entries": [] }}).then(function(response) {
                        done();
                    });
                });
            });
        });
    });

    it('should download all Entries in Org', function(done) {
        request
        .get('/api/download/org?file=false')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(1);
            expect(res.body[0]).to.be.an(Entry);
            expect(res.body[0]).to.have.property('_id', entry_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should download Org search results', function(done) {
        request
        .get('/api/download/query?file=false&langCode=eng&searchTerm=test+crud+1')
        .expect(200)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(1);
            expect(res.body[0]).to.be.an(Entry);
            expect(res.body[0]).to.have.property('_id', entry_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should download Org search results with inexact match', function(done) {
        request
        .get('/api/download/query?file=false&langCode=eng&searchTerm=test')
        .expect(200)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(1);
            expect(res.body[0]).to.be.an(Entry);
            expect(res.body[0]).to.have.property('_id', entry_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should return 0 entries when the limit is 0', function(done) {
        request
        .get('/api/download/query?file=false&limit=0&langCode=eng&searchTerm=test+crud+1')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(0);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should not find any entries for Terms that don\'t exist', function(done) {
        request
        .get('/api/download/query?file=false&langCode=eng&searchTerm=hello+world')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(0);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should download selected Entries', function(done) {
        request
        .get('/api/download/selected?file=false&entries=' + entry_id)
        .expect(200)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(1);
            expect(res.body[0]).to.have.property('_id', entry_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should not find any Entries from invalid ids', function(done) {
        request
        .get('/api/download/selected?file=false&entries=' + org_id)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(0);
        })
        .end(function(err, res) {
            done(err);
        });
    });
});
