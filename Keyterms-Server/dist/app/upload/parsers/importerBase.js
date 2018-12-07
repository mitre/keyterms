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

var Promise = require('bluebird');
var Queue = require('promise-queue');
var extend = require('extend');		// For deep copies of objects
var fs = require('fs');

var $Entry = require('../../db').interfaces.$Entry;
var BASE_ENTRY = require('./baseEntry');
var log = require('../../utils/logger').logger;

Queue.configure(Promise);

class ImporterBase {
	constructor (glossary, formBase) {
		log.verbose('Initializing ImporterBase...');

		this.entries = {};
		this.errors = {};
		this.glossary = glossary;

		// The base for each Entry that will be created
		// Some is defined in parsers/baseEntry.js
		// The rest comes from the form submission
		this.base = extend({}, BASE_ENTRY, formBase);

		// Queue (maxConcurrent, maxQueueLength)
		this.queue = new Queue(1, Infinity);
		this.added = 0;
		this.lastEntryKey = 1;
	}

	// returns a promise and designed for internal use only
	// This is method is passed to the PromiseQueue to create an Entry once all necessary data has been parsed
	__callCreateEntry (key, entryData) {
		var self = this;

		// key: an identifier for a specific entry, which references the this.entries and this.errors map

		// entryData: an object used to create a new Entry

		// if no key is passed, use the entryData to create a new entry
		// and re-assign key to be used for error mapping
		if (!key) {
			// __definedKey is used to store an Entry identifier returned by parsing
			// __ingestKey is an auto-generated key which the errors map uses as a default key
			key = entryData.__definedKey || entryData.__ingestKey;
		}
		// if a key is passed, use the key to retrieve the mapped entry data
		else {
			entryData = self.entries[key];
		}

		log.verbose('adding Entry ', key);
		return $Entry.createEntry(entryData, self.glossary)
		// the .then and .catch calls below are for tracking the success of the create operation
		.then( function (doc) {

			log.info(`Entry ${key} was created...`);
			self.added++;

			return doc;		// has to return a truthy value to avoid falling into the .catch call below
		})
		.catch( function (err) {
			console.error(err);

			if (!!err) {
				log.warn('Error with Entry ', key);
				self.errors[key] = err.errors || err.toString();
			}
		});
	}

	// this method returns undefined (NOT a Promise)
	// appends a call to __callCreateEntry to the queue
	queueEntry (key, entryData) {
		var self = this;

		// careful, queue.add does not return a function
		this.queue.add( function () {
			return self.__callCreateEntry(key, entryData);
		});
	}

	// this method returns undefined (NOT a Promise)
	// appends a call to __callCreateEntry to the queue, fires a callback after $Entry.create() is performed
	// mimics this.queueEntry(); this.finish();
	queueLastEntry (key, cb) {
		var self = this;

		log.verbose('Queuing last entry...');

		// careful, queue.add does not return a function
		return this.queue.add( function () {
			return self.__callCreateEntry(key)
			.then( function () {
				log.info('end of queue');
				return cb(self.errors);
			});
		});
	}

	// this method is called when the parser has completed all parsing operations
	// this will usually occur BEFORE all Entries have been added to the system
	// therefore this method adds a callback function to the end of the queue
	// once this callback is called, it will alert the parser that everything is finished
	// NOTE: the resolve function of a new Promise() call is usually what is passed to this method
	finish (callback) {
		this.queue.add( function () {
			return callback();
		});
	}

	// returns a base object for a new entry to be created from
	createEntry () {
		var entry = extend(true, {}, this.base);
		entry.__ingestKey = this.lastEntryKey++;
		return entry;
	}


	// this method is called via the endpoint handler for /upload
	// it is also used to enforce ImporterBase as an Abstract Class
	parse () {
		throw new Error('ImporterBase is meant to be an abstract class');
	}

	// Promisified fs.readFile, meant for internal use
	static readInFile (path) {
		return new Promise( function (resolve, reject) {
			fs.readFile(path, {encoding: 'utf8'}, function (err, data) {
				if (err) { return reject(err); }

				return resolve(data);
			});
		});
	}
}

module.exports = ImporterBase;
