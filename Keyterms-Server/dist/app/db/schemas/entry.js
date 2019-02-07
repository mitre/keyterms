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

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');
var uuid = require('uuid/v1');
var fs = require('fs');
var path = require('path');

var log = require('../../utils/logger').logger;
var enums = require('../../utils/enums');
var SCHEMA_VERSION = require('../../utils/system').SchemaVersion;
var BaseSchema = require('./base-schema');
var noteSchema = require('./note').NoteSchema;

var Term = mongoose.model('Term');
var Tag = mongoose.model('Tag');

// dynamically load all Entry plugins
var plugins = [];
var pluginPath = path.join(__dirname, '../plugins');
try {
	var pluginFiles = fs.readdirSync(pluginPath);
	pluginFiles.forEach( function (file) {
		if (file[0] !== '.' && file.slice(-3) === '.js') {
			try {
				var plugin = require(path.join(pluginPath, file));
				log.verbose(`Loading Entry plugin: ${ file }...`);
				plugins.push(plugin);
			}
			catch (err) {
				log.warn(`Problem loading plugin: ${file}, Skipping...`);
			}
		}
	});
}
catch (e) {
	log.warn('Problem loading Entry Schema plugins, Skipping...');
}

/*********************************************************************************************/

// TODO: move this to a file directory rather than storing blobs in the db?
/* eslint-disable key-spacing, comma-style */
var imageSchema = BaseSchema.extendSchema({
	name: 					{type: String, trim: true}
	, blob: 				{type: Buffer, select: false}

});
/* eslint-enable key-spacing, comma-style */

//imageSchema.set('autoIndex', true);
exports.Image = mongoose.model('Image', imageSchema);

/*********************************************************************************************/

/* eslint-disable key-spacing, comma-style */
var termLinkSchema = BaseSchema.extendSchema({
	lhs: 				{type: Schema.Types.ObjectId, ref: 'Term'}
	, rhs: 				{type: Schema.Types.ObjectId, ref: 'Term'}
	, relationType:			{type: String, required: true, enum: enums.orthTypes}
	, isDirected: 			{type: Boolean, default: true}
	, attrs: 				[{
								key: {type: String, trim: true, required: true},
								val: {type: String, trim: true, required: true}
							}]
	, notes: 				[noteSchema]
});
/* eslint-enable key-spacing, comma-style */

//termLinkSchema.set('autoIndex', true);
exports.TermLink = mongoose.model('TermLink', termLinkSchema);

/*********************************************************************************************/

var defaultSchemaVersion = function () {
	return SCHEMA_VERSION;
};

/* eslint-disable key-spacing, comma-style */
var entrySchema = BaseSchema.extendSchema({
	editScope: 				{type: String, enum: enums.editScopeTypes, required: true, default: () => 'glossary'}
	, viewScope: 			{type: String, enum: enums.viewScopeTypes, required: true, default: () => 'glossary'}
	, isDraft:				{type: Boolean, default: false}
	, schemaVersion: 		{type: String, trim: true, required: true, default: defaultSchemaVersion}
	, modificationDate: 	{type: Date, default: Date.now}
		// type was added to support future-features. Defaulting to 'term' until these features are added
	, type: 				{type: String, required: true, enum: enums.entryTypes, default: () => 'term'}
	, glossary:				{type: Schema.Types.ObjectId, required: true}
	, isDeprecated: 		{type: Boolean, default: false}
	, terms: 				[{type: Schema.Types.ObjectId, ref: 'Term'}]
	, termLinks: 			[termLinkSchema]
	, tags: 				[{type:Schema.Types.ObjectId, ref:'Tag'}]
	, notes: 				[noteSchema]
	, images: 				[imageSchema]
	, bannerText: 			{type: String, trim: true, uppercase: true}
});
/* eslint-enable key-spacing, comma-style */

//entrySchema.set('autoIndex', true);
// Send along the list of labels as a virtual
entrySchema.virtual('labels').get(function () {
    return this.terms.filter(t => t.isLabel).map(t => t.termText);
});

entrySchema.path('terms').required(true);

entrySchema.set('toObject', {getters: true, virtuals: true});
entrySchema.set('toJSON', {getters: true, virtuals: true});

var entryDeltaFields = ['editScope', 'viewScope', 'type'];
entrySchema.statics.DELTA_FIELDS = entryDeltaFields;

entrySchema.pre('validate', function (next) {
	if (this.editScope === undefined || this.viewScope === undefined) {
		return next( new Error('Both `editScope` and `viewScope` are required fields'));
	}

	var editScope = enums.editScopeTypesINFO[enums.editScopeTypes.indexOf(this.editScope)];
	var viewScope = enums.viewScopeTypesINFO[enums.viewScopeTypes.indexOf(this.viewScope)];

	if (editScope === undefined) {
		return next( new Error('Bad enum value for `editScope`'));
	}
	if (viewScope === undefined) {
		return next( new Error('Bad enum value for `viewScope`'));
	}

	// Edit Scope cannot be great than the View Scope
	if (editScope.comparison > viewScope.comparison) {
		return next( new Error('`editScope` cannot be broader than `viewScope`') );
	}

	// View Scope cannot be less than the Edit Scope
	if (viewScope.comparison < editScope.comparison) {
		return next( new Error('`viewScope` cannot be more redefined than `editScope`') );
	}

	// if(this.terms.length <= 0){
     //    return next( new Error('Terms are required for an entry to be created') );
	// }
	// no errors, continue
	next();
});

// Updates mod date per save
entrySchema.pre('save', function (next) {
	this.modificationDate = Date.now();

	if (!!this.createdBy) {
		this.notes.forEach( note => {
			note.createdBy = this.createdBy;
		});
	}

	if (this.schemaVersion !== SCHEMA_VERSION) {
        this.isDeprecated = true;
    }

	next();
});

entrySchema.pre('remove', function (next) {
	Term.deleteMany({_id: {$in: this.terms}}).exec().then( function(stuff) {
		console.log(stuff);
		next();
	} );
});

var calcObjDelta = function (curr, nom, get) {

	var delta = {add: [], del: []};

	var map = {};
	curr.forEach( function (item) {
		var key = get(item);
		if (!!key) {
			map[key] = {found: 0, obj: item};
		}
	});

	nom.forEach( function (item) {
		var key = get(item);
		if (key in map) {
			map[key].found = 1;		// indicates the item was found
		}
		else {
			delta.add.push(item);	// indicates the item is new
		}
	});

	delta.del = Object.keys(map).filter(key => map[key].found === 0);

	return delta;
};

var calcTermDelta = function (curr, nom) {
	// probably cannot use calcObjDelta, because this would cause iteration over the same lists multiple times
	// var delta = calcObjDelta(curr, nom, getMongoId);
	var delta = {add: [], del: [], mod: {}};

	// create a map of each term (as they currently are) keyed by term._id
	var map = {};
	curr.forEach( function (term) {
		var key = term._id;
		map[key] = { found: false, term: term };
	});

	// iterate over the term list of the "nominated" new state
	nom.forEach( function (edit) {

		// does the "term" have an _id?
		if ('_id' in edit) {
			// nothing, edit or removal?
			if (edit._id in map) {
				// reach here if "term" exists in both current and nomination term lists
				map[edit._id].found = true;					// flag term found in term map

				var term = map[edit._id].term;				// shortcut to current term via term map
				var termDelta = {};

				// compare each "tracked" field within the current and nomination to detect changes
				Term.DELTA_FIELDS.forEach(field => {
					// if field is different, place change in modification object
					if (term[field] !== edit[field]) {
						termDelta[field] = edit[field];
					}
				});

				// Calculate a notes delta in reference to this term (not the hosting entry)
				var notesDelta = calcObjDelta(term.notes, edit.notes, getMongoId);
				if (notesDelta.add !== 0 || notesDelta.del.length !== 0) {
					termDelta.notes = notesDelta;
				}

				if (Object.keys(termDelta).length > 0) {
                    delta.mod[edit._id] = termDelta;
                }
			}
			else {
				// REVIEW: this is not a possible state

				// term removal
				delta.del.push(edit);
			}
		}
		else {
			// term addition, because "term" (edit) does not have an _id
			delta.add.push(edit);
		}
	});

	// determine which terms should be removed, because they do not exist in the nomination
	delta.del = Object.keys(map).filter(key => !map[key].found);

	return delta;
};

var getMongoId = function (obj) {
	if (typeof obj === 'object') {
		if (!!obj._id) {
			return obj._id;
		}
		else {
			return null;
		}
	}
	else {
		throw new Error('Expected type [object] not found');
	}
};

entrySchema.methods.calcDelta = function (edits) {
	var entry = this;

	var defaultEntry = (new (mongoose.model('Entry'))()).toObject();

	defaultEntry._id = undefined;

	// normalize purposed edits against a "default" entry
	edits = Object.assign(defaultEntry, edits);

	var delta = { entry: {} };

	entryDeltaFields.forEach( field => {
		if (edits[field] !== entry[field]) {
			delta.entry[field] = edits[field];
		}
	});

	delta.terms = calcTermDelta(entry.terms, edits.terms);

	// add uuids to prevent issues with mismatching indices
	delta.terms.add.forEach( function (term) {
		// this does add the uuid field to the data.terms object as well
		term.uuid = `uuid.${uuid()}`;
	});

	// resolve the indices of termLinks
	edits.termLinks.slice().forEach( function (link, idx) {
		// sometimes the Link indices may be out of bounds, just skip those for now
		try {
			var lhs = edits.terms[link.lhs];
			if ('uuid' in lhs) {
				link._lhsIndex = link.lhs;
				link.lhs = lhs.uuid;
			}
			else {
				link._lhsIndex = link.lhs;
				link.lhs = lhs._id;
			}

			var rhs = edits.terms[link.rhs];
			if ('uuid' in rhs) {
				link._rhsIndex = link.rhs;
				link.rhs = rhs.uuid;
			}
			else {
				link._rhsIndex = link.rhs;
				link.rhs = rhs._id;
			}
		}
		catch (e) {
			// remove link from list if it references a term index that doesn't exist
			edits.termLinks.splice(idx, 1);
		}
	});

	delta.termLinks = calcObjDelta(entry.termLinks, edits.termLinks, getMongoId);

	delta.notes = calcObjDelta(entry.notes, edits.notes, getMongoId);

	delta.tags = calcObjDelta(entry.tags, edits.tags, function (tag) {
		if (typeof tag === 'string') {
			return tag;
		}
		else if (typeof tag === 'object') {
			if (!!tag.content) {
				return tag.content;
			}
			else {
				throw new Error('Badly formed tag object, does not contain "content" as expected');
			}
		}
	});

	return delta;
};

entrySchema.methods.addToOrCreateTags = function (tags, glossaryId) {
	var thisEntry = this;

	return Promise.mapSeries(tags, function (tag) {
		return Tag.findOrCreateTag(tag, glossaryId)
		.then( function (tagDoc) {
			// this .then() will execute on each individual tag document
 			return tagDoc.addEntryToTag(thisEntry._id);
		})
		.then( function (tagDoc) {
			return tagDoc._id;
		});
	})
	.then( function (tagIds) {
		thisEntry.tags = thisEntry.tags.concat(tagIds);
		return thisEntry;
	});
};

entrySchema.methods.removeFromTags = function (glossaryRef) {
	var thisEntry = this;

	if (thisEntry.tags.length === 0) {
		return Promise.resolve(thisEntry);
	}

	return Promise.map(thisEntry.tags, function (tagId) {
		return Tag.findOne({_id: tagId, glossary: glossaryRef}).exec()
		.then( function (tagDoc) {
			if (!tagDoc) {
				return true;
			}
			return tagDoc.removeEntryFromTag(thisEntry._id);
		});
	})
	.then( function () {
		return thisEntry;
	});
};

entrySchema.methods.removeOrReplaceTag = function (tagId, replacementId) {
	this.tags.pull(tagId);
	if (!!replacementId) {
		this.tags.push(replacementId);
	}
	return this.save();
};

entrySchema.methods.removeTags = function (tagIds) {
	var self = this;

	return Tag.find({_id: {$in: tagIds}}).exec()
	.then( function (tagDocs) {
		return Promise.mapSeries(tagDocs, function (tagDoc) {
			if (!tagDoc) { return true; }

			return tagDoc.removeEntryFromTag(self._id);
		});
	})
	.then( function () {
		tagIds.forEach(id => self.tags.pull(id));

		return self;
	});
};

entrySchema.methods.removeTerms = function (termIds) {
	termIds.forEach( function (termId) {
		this.terms.pull(termId);

		this.termLinks.forEach( function (link) {
			if (link.lhs === termId || link.rhs === termId) {
				this.removeLinks([termId]);
			}
		}, this);
	}, this);

	return Promise.mapSeries(termIds, function (id) {
		return Term.deleteOne({_id: id}).exec();
	});

	//return Term.remove({_id: {$in: termIds}}).exec();
};

entrySchema.methods.removeLinks = function (linkIds) {
	var termLinks = this.termLinks;

	linkIds.forEach(function(link){
		termLinks.pull(link);
	});
};

var fieldsToPopulate = [
	{
		path: 'terms',
		model: 'Term',
		populate: [{
			path: 'createdBy',
			model: 'User',
			select: 'username email fullName'
		}, {
			path: 'notes.nominatedBy',
			model: 'User',
			select: 'username email fullName'
		}, {
			path: 'notes.createdBy',
			model: 'User',
			select: 'username email fullName'
		}
		]
	},
	{
		path: 'tags',
		model: 'Tag',
		select: 'content'
	},
	{
		path: 'createdBy',
		model: 'User',
		select: 'username email fullName'
	},
	{
		path: 'nominatedBy',
		model: 'User',
		select: 'username email fullName'
	},
	{
		path: 'approvedBy',
		model: 'User',
		select: 'username email fullName'
	},
	{
		path: 'notes.createdBy',
		model: 'User',
		select: 'username email fullName'
	},
	{
		path: 'glossary',
		model: 'Glossary',
		select: 'name abbreviation'
	},
	{
		path: 'terms.notes',
		model: 'Note'
	}
];

entrySchema.methods.populateForGUI = function () {
	// mongoose.model is called because the Entry model
	// has not yet been created where this function is defined
	// (that happens at the end of this file)
	return this.populate(fieldsToPopulate).execPopulate();
};

// Adding .lean makes .find twice as fast, however the entries returned as only "json" objects (as if .toObject as called)
entrySchema.statics.findAndPopulateForGui = function (query, asLean) {
	asLean = (asLean === undefined) ? true : asLean;

	var q = this.find(query).populate(fieldsToPopulate);

	if (asLean) {
		q = q.lean();
	}
	return q.exec();
};

plugins.forEach(p => {
	entrySchema.plugin(p);
});

entrySchema.pre('save', function (next) {
	var self = this;

	if (this.bannerText === undefined || this.bannerText === '') {
		this.populate({path: 'glossary', model: 'Glossary', select: 'name'}).execPopulate()
		.then( function () {
			self.bannerText = self.glossary.name;
			next();
		})
		.catch(next);
	}
	else {
		next();
	}
});

exports.entrySchema = entrySchema;
exports.Entry = mongoose.model('Entry', entrySchema);
