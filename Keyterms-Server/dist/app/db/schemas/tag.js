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
var Schema = mongoose.Schema;
var Promise = require('bluebird');

/* eslint-disable key-spacing, comma-style */
var tagSchema = new Schema({
	glossary: {type: Schema.Types.ObjectId, ref: 'Glossary', required: true},
    content: {type: String, required: true},
    entries: [{type: Schema.Types.ObjectId, ref: 'Entry'}]
});
/* eslint-enable key-spacing, comma-style */

tagSchema.methods.addEntryToTag = function (entryId) {
	if (this.entries.indexOf(entryId) !== -1) {
		return Promise.resolve(this);
	}

	// else
	this.entries.push(entryId);
	return this.save();
};

tagSchema.methods.removeEntryFromTag = function (entryId) {
	if (this.entries.indexOf(entryId) === -1) {
		return Promise.resolve(this);
	}
	this.entries.pull(entryId);
	return this.save();
};

tagSchema.methods.rename = function (newTag) {
	newTag = normalizeTag(newTag);
	this.content = newTag;
	return this.save();
};

tagSchema.methods.removeOrReplaceFromEntries = function (replacementDoc) {
	var thisTag = this;
	// slice is used to create a swallow copy of the array
	var theseEntries = this.entries.slice();
	var replacementId = (replacementDoc === undefined) ? null : replacementDoc._id;

	// get all the Entry docs that are tagged with this tag
	return mongoose.model('Entry').find({
		_id: { $in: thisTag.entries }
	})
	.exec()
	.then( function (entryDocs) {
		// Removes this tag from all Entries that are currently tagged with
		// this tag OR "replaces" this tag on all Entries, which are tagged
		// with this tag, with a new tag
		return Promise.map(entryDocs, function (entryDoc) {
			return entryDoc.removeOrReplaceTag(thisTag._id, replacementId);
		});
	})
	.then( function () {
		// removes all Entry references from this tag
		thisTag.entries = [];
		return thisTag.save();
	})
	.then( function (tagDoc) {
		// determines whether the operation was a replacement or a removal
		// IF REPLACEMENT: concats the tag.entries list of the replacement tag
		// 		with the tag.entries list of this tag and returns the replacement
		//		tag document (with the updated entries list)
		// IF REMOVAL: returns this tag document (with an empty entries list)
		if (!!replacementId) {
			// Set object is used to prevent duplicates
			var temp = new Set(replacementDoc.entries);
			theseEntries.forEach( function (entryRef) {
				temp.add(entryRef);
			});
			replacementDoc.entries = Array.from(temp);
			return replacementDoc.save();
		}
		else {
			return tagDoc;
		}
	});
};

tagSchema.statics.findOrCreateTag = function (tag, glossaryId) {
	var Tag = this;

	return Tag.findOne({content: tag, glossary: glossaryId}).exec()
	.then( function (tagDoc) {
		if (tagDoc == null) {

			tag = normalizeTag(tag);

			return Tag.create({content: tag, glossary: glossaryId});
		}else {
            return tagDoc;
        }
	});
};

var normalizeTag = function(tag) {
	//TAG normalize logic here. String trimming, etc

	//makes tag lowercase and removes leading and trailing whitespace
	tag = tag.toLocaleLowerCase().trim();

	//removes any leading or trailing punctuation
	tag = tag.replace(/(^[^a-zA-Z0-9]+)|([^a-zA-Z0-9]+$)/g, '');

	//removes whitespaces around hyphens
    tag = tag.replace(/(\s*\-\s*)+/, '-');

	//removes whitespaces aroung underscores
    tag = tag.replace(/(\s*\_\s*)+/, '_');

    //replaces consecutive whitespaces with one whitespace
	tag = tag.replace(/(\s{2})+/, ' ');

	//removes nonprintable, nonspacing characters
	tag = tag.replace(/([^ -~]+)/g, '');


    return tag;
};

exports.tagSchema = tagSchema;
exports.Tag = mongoose.model('Tag', tagSchema);
