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

var config = require('./testConfig');

// Namespace of objects to create documents needed for all tests
exports.standard = {
	glossary: {
		name: 'Hogwarts School of Witchcraft and Wizardry',
		abbreviation: 'Hogwarts',
		isCommon: true
	},
	user: {
		username: config.testUser.username,
		password: config.testUser.password,
		email: 'hpotter@hogwarts.edu',
		fullName: 'Harry Potter',
		isAdmin: true
	}
};

exports.terms = {
	invalid: {
		termText: 'Invalid'
	},
	valid: {
		langCode: 'eng',
		termText: 'Voldemort'
	}
};

exports.tags = {
	invalid: '!NV@L!D',
	valid: [{content: 'person'}, {content: 'place'}]
};

exports.notes = {

};

var entries = {
	invalid: {
		schemaVersion: '3.0.0',
		label: 'testing entry creation'
	},
	valid: [
		{
			terms: [
				{
					termText: 'simple term',
					langCode: 'eng'
				}
			]
		},
		{
			terms: [
				{
					termText: 'PANCAKES',
					langCode: 'eng'
				},
				{
					termText: 'test crud 2',
					langCode: 'nld'	// Don't test on Chinese (zho) until NLP Services is updated
				},
				{
					termText: 'test crud 3',
					langCode: 'ara'
				}
			],
			termLinks: [
				{
					lhs: 1,
					rhs: 0,
					relationType: 'orthoVariant',
					notes: [{
						text: 'testing a note on a Link',
						type: 'general'
					}]
				}
			],
			tags: ['tag1', 'tag2', 'tag3'],
			notes: [
				{text: 'testing a note on an Entry', type: 'general'},
				{text: 'testing a note on an Entry2', type: 'general'}
			]
		}
	]
};
exports.entries = entries;

exports.nominations = {
	invalid: {
		type: '!NV@L!D',
		data: Object.assign({}, entries.valid[1])
	},
	valid: {
		add: {
			type: 'add',
			data: Object.assign({}, entries.valid[1])
		},
		nom: {
			type: 'mod',
			data: {
				terms: [
					{
						termText: 'Voldemort',
						langCode: 'eng'
					},
					{
						termText: 'TheDarkLord',
						langCode: 'eng'
					}
				],
				termLinks: [],
				tags: ['villain'],
				notes: [{ text: 'Voldy', type: 'general' }]
			}

		}
	}
};

exports.glossaries = {
	invalid: {
		name: 'This is an Invalid Glossary'
	},
	valid: [
		{
			name: 'Beauxbatons Academy of Magic',
			abbreviation: 'Beauxbatons'
		},
		{
			name : 'Durmstrang Institute',
			description : 'A Scandinavian school of wizardry known for its dark magic',
			abbreviation: 'Durmstrang',
			admins: [],
			qcs: []
		}
	]
};

exports.users = {
	invalid: {
		username: 'hello',
		email: 'world'
	},
	valid: [
		{
			username: 'roonilwazlib',
			password: 'pigwidgeon',
			email: 'rweasley@hogwarts.edu',
			fullName: 'Ron Weasley',
			isAdmin: true
		},
		{
			username: 'hgranger',
			password: 'timeturner',
			email: 'hgranger@hogwarts.edu',
			fullName: 'Hermione Granger'
		},
		{
			username: 'neville',
			password: 'trevor',
			email: 'nlongbottom@hogwarts.edu',
			fullName: 'Neville Longbottom'
		}
	]
};
