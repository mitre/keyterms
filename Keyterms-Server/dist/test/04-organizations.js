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



describe('04-01 Testing Organizaion API endpoints and operations', function() {

    var env = new TestEnv();

    var request = env.request;
    var expect = env.expect;

    var mock = TestEnv.mock;

    var entryId = '';
    var orgId = '';
    var validOrg = '';
    var org = '';
    var user = '';
    var org0_id = '';
    var org1_id = '';
    var user0_id = '';
    var user1_id = '';

    it('should fail to insert an invalid Organization', function(done) {
        request
        .post('/api/org/create')
        .send({ name: 'test' }) // no abbreviation
        .expect(400, done);
    });

    it('should insert a valid Organization', function(done) {

        user = env.user;
        user0_id = env.user._id;

        validOrg = Object.assign({}, mock.organizations.valid[1]);
        validOrg.admins.push(env.user);

        request
        .post('/api/org/create')
        .send(validOrg)
        .expect(201)
        .expect('Content-Type', /json/)
        .expect(function(res) {

            // Test that all fields exist
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('name', validOrg.name);
            expect(res.body).to.have.property('description', validOrg.description);
            expect(res.body).to.have.property('abbreviation', validOrg.abbreviation);
            expect(res.body).to.have.property('admins');
            expect(res.body).to.have.property('qcs');

            // Test that fields are correct
            expect(res.body.admins).to.contain(user0_id.toString());
            expect(res.body.qcs).to.be.empty();
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should fail to read a non-existant Organizaion', function(done) {
        request
        .get('/api/org/o/' + user0_id)
        .expect(404, done);
    });

    it('should fail to read a garbage id', function(done) {
        request
        .get('/api/org/o/garbage')
        .expect(404, done);
    });

    it('should read an existing Organizaion', function(done) {

        org = env.org;

        orgId = org._id;

        request
        .get('/api/org/o/' + orgId)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            // Test that all fields exist and are correct
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('_id', orgId.toString());
            expect(res.body).to.have.property('name', org.name);
            expect(res.body).to.have.property('abbreviation', org.abbreviation);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should read all Organizaions', function(done) {
        request
        .get('/api/org/list')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.greaterThan(0);
            expect(res.body[1].name).to.be(validOrg.name);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should read the common Organization', function(done) {
        org = env.org;
        orgId = org._id;

        request
        .get('/api/org/getCommon')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('_id', orgId.toString());
            expect(res.body).to.have.property('name', org.name);
            expect(res.body).to.have.property('abbreviation', org.abbreviation);
            expect(res.body).to.have.property('isCommon', true);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should read the permissions for the current Organization', function(done) {
        request
        .get('/api/orgPermissions')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('isOrgAdmin', org.isOrgAdmin);
            expect(res.body).to.have.property('isOrgQC', org.isOrgQC);
            expect(res.body).to.have.property('orgName', org.name);
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should update an Organization', function(done) {
        done();
    });

    it('should add a User to the Organization', function(done) {

        request
        .post('/api/org/members/' + orgId)
        .send([user0_id])
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            // check that adding user to org did not make them an admin or QC by default

            expect(res.body.admins).to.not.contain(user0_id.toString());
            expect(res.body.qcs).to.not.contain(user0_id.toString());
        })
        .end(function(err, res) {
            if (err) return done(err);

            // check that user contains this org
            request
            .get('/api/user/u/' + user0_id)
            .expect(function(response) {
                expect(response.body.organizations[0]).to.have.property('_id', orgId.toString());
            })
            .end(function(error, response) {
                done(error);
            });
        });
    });

    it('should read the Users in the Organization', function(done) {
        request
        .get('/api/org/members/' + orgId)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.greaterThan(0);
            expect(res.body[0]).to.be.an('object');
            expect(res.body[0]).to.have.property('_id', user0_id.toString());
            expect(res.body[0]).to.have.property('username', user.username);
        })
        .end(function(err, res) {
            done(err);
        })
    });

    /*it('should update the Users in the Organization', function(done) {
        request
        .post('/api/org/members/' + org1_id)
        .send() // something
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {

        })
        .end(function(err, res) {
            done(err);
        })
    })*/

    it('should add a QC', function(done) {
        request
        .post('/api/org/addQC/' + orgId)
        .send({qcID : user0_id})
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.have.property('qcs');
            expect(res.body.qcs).to.contain(user0_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should remove a QC', function(done) {
        request
        .post('/api/org/removeQC/' + orgId)
        .send({qcID : user0_id})
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.have.property('qcs');
            expect(res.body.qcs).to.not.contain(user0_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should not add a QC twice', function(done) {

        // add QC the first time
        request
        .post('/api/org/addQC/' + orgId)
        .send({qcID : user0_id})
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
            if (err) return done(err);

            // attempt to add QC the second time
            request
            .post('/api/org/addQC/' + orgId)
            .send({qcID : user0_id})
            .expect(200) // something else?
            .expect('Content-Type', /json/)
            .expect(function(response) {
                expect(response.body).to.have.property('qcs');
                expect(response.body.qcs).to.contain(user0_id.toString());
                var index = response.body.qcs.indexOf(user0_id.toString());
                response.body.qcs.splice(index, 1);
                expect(response.body.qcs).to.not.contain(user0_id.toString());
            })
            .end(function(error, response) {
                done(error);
            });
        });
    });

    it('should add an admin', function(done) {
        request
        .post('/api/org/addAdmin/' + orgId)
        .send({adminID : user0_id})
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.have.property('admins');
            expect(res.body.admins).to.contain(user0_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should remove an admin', function(done) {
        request
        .post('/api/org/removeAdmin/' + orgId)
        .send({adminID : user0_id})
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(function(res) {
            expect(res.body).to.have.property('admins');
            expect(res.body.admins).to.not.contain(user0_id.toString());
        })
        .end(function(err, res) {
            done(err);
        });
    });

    it('should not add an admin twice', function(done) {

        // add admin the first time
        request
        .post('/api/org/addAdmin/' + orgId)
        .send({adminID : user0_id})
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
            if (err) return done(err);

            // attempt to add admin the second time
            request
            .post('/api/org/addAdmin/' + orgId)
            .send({adminID : user0_id})
            .expect(200) // something else?
            .expect('Content-Type', /json/)
            .expect(function(response) {
                expect(response.body).to.have.property('admins');
                expect(response.body.admins).to.contain(user0_id.toString());
                var index = response.body.admins.indexOf(user0_id.toString());
                response.body.admins.splice(index, 1);
                expect(response.body.admins).to.not.contain(user0_id.toString());
            })
            .end(function(error, response) {
                done(error);
            });
        });
    });

    it('should delete an existing Organization', function(done) {
        request
        .delete('/api/org/o/' + orgId)
        .expect(204, done);
    });

    it('should fail to delete a non-existant Organization', function(done) {
        request
        .delete('/api/org/o/' + user0_id)
        .expect(404, done);
    });

    it('should fail to delete a garbage id', function(done) {
        request
        .delete('/api/org/o/garbage')
        .expect(404, done);
    });
});
