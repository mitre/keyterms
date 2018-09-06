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

var mongoose = require('mongoose');

var BaseSchema = require('./base-schema');
var noteSchema = require('./note').NoteSchema;

var enums = require('../../utils/enums');

/* eslint-disable key-spacing, comma-style */
var termSchema = BaseSchema.extendSchema({
	langCode: 				{type: String, trim: true, required: true, lowercase: true}
	, termText:				{type: String, trim: true, required: true}
	, isLabel: 				{type: Boolean, default: false}
	, preferenceOrder: 		{type: Number, default: 0}
	, modificationDate: 	{type: Date, default: Date.now}
	, status:				{type: String, enum: enums.statuses}
	, script:				{type: String}
	, isSrcScript:			{type: Boolean, default: false}
	, variety:				{type: String}
	, originalText:			{type: String}
	, indexText:			{type: String}
	, tokenization:			[{type: String}]
	, src:					{type: String, enum: enums.entrySources, default: () => 'user'}
	, notes:				[noteSchema]
});
/* eslint-enable key-spacing, comma-style */

//termSchema.set('autoIndex', true);

// Updates mod date per save
termSchema.pre('save', function (next) {
	this.modificationDate = Date.now();

	// Loop through all notes, if there's no 'created by' value steal it from the 'nominatedBy'
	this.notes.forEach(function (note) {
		note.createdBy = !!note.createdBy ? note.createdBy : note.nominatedBy;
	});
	next();
});

termSchema.methods.isRawEqual = function (raw) {
	return (this.termText !== raw.termText || this.langCode !== raw.langCode);
};

termSchema.statics.DELTA_FIELDS = ['termText', 'langCode', 'isLabel', 'variety'];

exports.termSchema = termSchema; // needed for Entry model
exports.Term = mongoose.model('Term', termSchema);
