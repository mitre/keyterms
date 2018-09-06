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

var inc = require('../../../includes');
var Promise = inc.Promise;
var log = inc.log;

var xliffParser = require('./../xliffAbstract');


class XLIFF20 extends xliffParser {
	constructor (req, base) {
		super(req, base);

		log.verbose('Initializing xliff Parser...');

		this.ptype = 'XLIFF20';
	}

	parseUnitTag (unit) {
		var self = this;

		// ignore <other> and <originalData> tags

		var unitId = unit.$.id;
		var entry = self.createEntry();
		entry.__definedKey = 'unitId: ' + unitId;

		// add the <unit id="?"> as a note on the Entry
		entry.notes.push({
			text: `This Entry's unit id is ${unitId}`,
			type: 'source'
		});

		// according to spec, <notes> contain <note> at this level
		if (!!unit.notes) {
			unit.notes.forEach(ns => {
				ns.note.forEach(n => {
					entry.notes.push({
						text: n,
						type: 'general'
					});
				});
			});
		}
		// just in case the file is slightly malformed,

		// iterate through <note> tags not contained in a <notes>
		if (!!unit.note) {
			unit.note.forEach(n => {
				entry.notes.push({
					text: n,
					type: 'general'
				});
			});
		}

		unit.segment.forEach(seg => {

			// ignore <ignorable> at this level

			if (seg.source) {
				var src = {};
				src.termText = seg.source[0];
				src.langCode = self.srcLang;
				entry.terms.push(src);
			}
			if (seg.target) {
				var trg = {};
				trg.termText = seg.target[0];
				trg.langCode = self.trgLang;

				// create a link object, in case source also exists
				var link = { relationType: 'translat' };
				// index of source (last item pushed into the terms list)
				link.lhs = entry.terms.length - 1;
				// push target into the list of terms
				entry.terms.push(trg);
				// now get the index of target
				link.rhs = entry.terms.length - 1;

				// if source exists, create the link between them
				if (seg.source) {
					entry.termLinks.push(link);
				}
			}
			if (seg.note) {
				entry.notes.push({
					text: seg.note[0],
					type: 'general'
				});
			}
		});

		this.queueEntry(null, entry);
	}

	parseGroupTag (g) {
		var self = this;

		// ignore <other> and <notes> at this level

		// a file may or maybe not contain any groups
		if (!!g.group && g.group.length >= 1) {
			g.group.forEach(grp => {
				self.parseGroupTag(grp);
			});
		}

		// ensure the <group> tag contains <unit> tags, could theoretically be empty
		if (!!g.unit && g.unit.length >= 1) {
			g.unit.forEach(u => {
				self.parseUnitTag(u);
			});
		}
	}

	parseXML (xml) {
		var self = this;

		var xliff = xml.xliff;

		return new Promise( function (resolve, reject) {
			// source and target languages are defined as attributes of the <xliff> tag
			self.srcLang = xliffParser.mapISO(xliff.$.srcLang);
			self.trgLang = xliffParser.mapISO(xliff.$.trgLang);

			if (!self.srcLang || !self.trgLang) {
				throw new Error('Unsupported Language Code');
			}

			try {
				// iterate through each <file> tag
				xliff.file.forEach(f => {
					// ignore <skeleton>, <other>, <notes> tags at this level

					// a file may or maybe not contain any groups
					if (!!f.group && f.group.length >= 1) {
						f.group.forEach(grp => {
							self.parseGroupTag(grp);
						});
					} else {
						f.unit.forEach(u => {
							self.parseUnitTag(u);
						});
					}
				});
			}
			catch (e) {
				log.error('Error during xliff.v2.0.parseXML');
				return reject(e);
			}

			// parsing will complete before each Entry is added,

			// Wait until each Entry is added, then resolve (implying success)
			self.finish(resolve);
		});
	}

	parse () {
		// this.parseFile is a method of the base class xliffParser
		// which expects a callback which returns a promise
		return this.parseFile(this.parseXML.bind(this));
	}
}

module.exports = XLIFF20;
