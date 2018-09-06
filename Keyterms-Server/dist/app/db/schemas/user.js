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

'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var log = require('../../utils/logger').logger;

var SALT_WORK_FACTOR = 10;

/* eslint-disable key-spacing, comma-style */
var UserSchema = new Schema({
    username:           {type: String, required: true, index: {unique: true}},
    password:           {type: String, required: true},
    email:              {type: String, required: true},
    fullName:           {type: String, required: true},
    isAdmin:            {type: Boolean, default: false},
    certOnly:           {type: Boolean, default: false},
    organizations:      [{type: Schema.Types.ObjectId, ref: 'Organization'}],
    currentOrg:         {type: Schema.Types.ObjectId, ref: 'Organization'},
    defaultOrg:         {type: Schema.Types.ObjectId, ref: 'Organization'},
    isDeactivated:   	{type: Boolean, default: false}
});
/* eslint-enable key-spacing, comma-style */

var transformUser = function (doc, ret) {
    delete ret.password;
    delete ret.certOnly;

    return ret;
};

// Prevents password from being sent to client via JSON response
UserSchema.set('toJSON', {
    transform: transformUser
});

UserSchema.set('toObject', {
    transform: transformUser
});

UserSchema.pre('validate', function (next) {
    if (!this.password) {
        this.password = new mongoose.Types.ObjectId();
        this.certOnly = true;
    }

    next();
});

UserSchema.pre('save', function (next) {
    var user = this;

// only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) { return next(); }

// generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) { return next(err); }

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) { return next(err); }

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function (candidatePassword) {
    var self = this;
    return new Promise(function (resolve, reject) {
        bcrypt.compare(candidatePassword, self.password, function (err, isMatch) {
            if (err) {
                log.error(err);
                reject(err);
            }
            else {
                resolve(isMatch);
            }
        });
    });
};

UserSchema.methods.changePassword = function (newPassword) {
    this.password = newPassword;
    return this.save();
};

UserSchema.methods.updateDefaultOrg = function (targetOrg) {
	if (this.organizations.indexOf(targetOrg) === -1 && targetOrg !== null) {
		var err = new Error('User is not a member of the target Organization');
		err.notAMember = true;
		return Promise.reject(err);
	}

	this.defaultOrg = targetOrg;
	return this.save()
		.then(function (user) {
			return user.populate({
				path: 'organizations',
				model: 'Organization',
				select: 'name abbreviation admins qcs langList'
			}).execPopulate();
		});
};

UserSchema.methods.switchActiveOrg = function (targetOrg) {
    if (this.organizations.indexOf(targetOrg) === -1) {
        var err = new Error('User is not a member of the target Organization');
        err.notAMember = true;
        return Promise.reject(err);
    }

    this.currentOrg = targetOrg;
    return this.save()
    .then(function (user) {
        return user.populate({
            path: 'organizations',
            model: 'Organization',
            select: 'name abbreviation admins qcs langList'
        }).execPopulate();
    });
};

UserSchema.methods.joinOrg = function (orgId) {
    var index = this.organizations.indexOf(orgId);

    if (index !== -1) { return Promise.resolve(this); }

    this.organizations.push(orgId);

    return this.save();
};

UserSchema.methods.leaveOrg = function (orgId) {
    var index = this.organizations.indexOf(orgId);

    if (index === -1) { return Promise.resolve(this); }

    this.organizations.pull(orgId);
    return this.save();
};

module.exports = mongoose.model('User', UserSchema);


