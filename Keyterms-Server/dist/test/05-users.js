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



describe('05-01 Testing User API', function () {

    var env = new TestEnv();

    var request = env.request;
    var expect = env.expect;

    var mock = TestEnv.mock;

    var rawEntryData = TestEnv.mockEntry;

    var entryId = '';
    var glossaryId = '';
    var user = '';
    var currentUser = '';
    var glossary0_id = '';
    var glossary1_id = '';
    var user_id = '';
    var user1_id = '';
    var user3_id = '';

    it('should fail to create an invalid user', function(done) {
        request
        .post('/api/user/create')
        .send({ password: 'test' }) // no username
        .expect(400, done);
    });

    it('should create a valid user', function(done) {

        //user = Object.assign({}, mock.users.valid[0]);
        user = JSON.parse(JSON.stringify(mock.users.valid[0]));
        request
        .post('/api/user/create')
        .send(user)
        .expect(201)
        .expect('Content-Type', /json/)
        .expect(function(res) {

            user_id = res.body._id;

            // Test that all fields exist and are correct
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('username', user.username);
            expect(res.body).to.have.property('email', user.email);
            expect(res.body).to.have.property('fullName', user.fullName);
            expect(res.body).to.have.property('isAdmin', user.isAdmin);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should fail to create a user that already exists', function(done) {

        request
        .post('/api/user/create')
        .send(user)
        .expect(409, done);
    });

    it('should read the current user', function(done) {

        currentUser = env.user;

        request
        .get('/whoami')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('_id', currentUser._id.toString());
            expect(res.body).to.have.property('username', currentUser.username);
            expect(res.body).to.have.property('email', currentUser.email);
            expect(res.body).to.have.property('fullName', currentUser.fullName);
            expect(res.body).to.have.property('isAdmin', currentUser.isAdmin);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should read an existing user', function(done) {
        request
        .get('/api/user/u/' + user_id)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            // Test that all fields exist and are correct
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('_id', user_id.toString());
            expect(res.body).to.have.property('username', user.username);
            expect(res.body).to.have.property('email', user.email);
            expect(res.body).to.have.property('fullName', user.fullName);
            expect(res.body).to.have.property('isAdmin', user.isAdmin);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should fail to read a non-existant user', function(done) {
        request
        .get('/api/user/u/' + glossary0_id)
        .expect(404, done);
    });

    it('should fail to read a garbage id', function(done) {
        request
        .get('/api/user/u/garbage')
        .expect(404, done);
    });

    it('should read a list of all users', function(done) {
        request
        .get('/api/user/list')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {

            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.greaterThan(0);
            expect(res.body[1].username).to.be(user.username);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should update a user', function(done) {
        var update = {};
        update.username = 'keeper4lyfe';
        update.email = 'rbweasley@hogwarts.edu';
        update.fullName = 'Ronald Bilius Weasley';

        request
        .post('/api/user/u/' + user_id)
        .send(update)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('_id', user_id.toString());
            expect(res.body).to.have.property('username', update.username)
            expect(res.body).to.have.property('email', update.email);
            expect(res.body).to.have.property('fullName', update.fullName);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should fail to update a non-existant user', function(done) {
        var update = {};
        update.username = 'test';

        request
        .post('/api/user/u/' + glossary0_id)
        .send(update)
        .expect(404, done);
    });

    it('should fail to update a garbage id', function(done) {
        var update = {};
        update.username = 'test';

        request
        .post('/api/user/u/garbage')
        .send(update)
        .expect(404, done);
    });

    it('should change the active glossary', function(done) {

        glossary1_id = env.glossary._id;

        request
        .post('/api/user/activeGlossary/' + glossary1_id)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.have.property('currentGlossary', glossary1_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should fail to change a user\'s username to one that already exists', function(done) {
        var update = {};
        update.username = 'starkidpotter';

        request
        .post('/api/user/u/' + user_id)
        .send(update)
        .expect(409, done);
    });

    it('should remove a user', function(done) {
        request
        .delete('/api/user/u/' + user_id)
        .expect(204, done);
    });

    it('should fail to remove a non-existant user', function(done) {
        request
        .delete('/api/user/u/' + glossary0_id)
        .expect(404, done);
    });

    it('should fail to remove a garbage id', function(done) {
        request
        .delete('/api/user/u/garbage')
        .expect(404, done);
    });

    // it('should change a user\'s password', function(done) {
    //
    //     // change password
    //     request
    //     .post('/api/user/passwrd/' + currentUser._id)
    //     .send({ newPassword: 'newPassword' })
    //     .expect(200)
    //     .expect('Content-Type', /json/)
    //     .expect(function(res) {
    //         expect(res.body).to.be.an('object');
    //         expect(res.body).to.have.property('_id', currentUser._id.toString());
    //     })
    //     .end(function(err, res) {
    //         if (err) return done(err);
    //
    //         // logout
    //         request.get('/logout')
    //         .end(function(err, res) {
    //
    //             // log in as user3 with new password
    //             request
    //             .post('/login')
    //             .send({ username: currentUser.username, password: 'newPassword' })
    //             .expect(200)
    //             .expect(function(res) {
    //                 expect(res.body).to.have.property('username', currentUser.username);
    //             })
    //             .end(function(err, res) {
    //                 done(err);
    //             });
    //         });
    //     });
    // });
});
