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
var Promise = require('bluebird');
var elastic = require('../../utils/elasticSearch');
var NLP = require('../../utils/nlpServices');
var log = require('../../utils/logger').logger;

var Term = mongoose.model('Term');
var Entry = mongoose.model('Entry');

// takes a term object and the returned json object from nlp services
// and normalizes the entered terms by combining the objects
var normalizeTerm = function (term, nlp) {
	term.originalText = term.termText; 						// the user's entered text
	term.termText = nlp.Text; 								// the normalized display text
	term.script = nlp.Script;
	term.isSrcScript = nlp.isSrcScript;
	term.indexText = nlp.TextIndex;
	term.variety = term.variety || nlp.TransformType;		// user user-entered variety, else default to NLP
	term.preferenceOrder = nlp.Order;

	return term;
};

// Uses Nlp Services to normalize the user submitted terms and generate
// any automated transliteration that nlp services is configured to returned
// This is done on a per language basis
var callNLP = function (term) {
	return NLP.callService(term.termText, term.langCode)
	.then( function (body) {
		var resp = {
			nlpAdditions: []
		};

		if (body.length === 1) {
			body = body[0];

			// Only return the single term if NLP services
			// returns a single normalization/transliteration
			resp.term = normalizeTerm(term, body);
		} else if (body.length > 1) {
			// Find the index of the variety 'Original Text'
			// Note: NLP Services returns term.variety as "TransformType"
			var index = body.map(translit => translit.TransformType).indexOf('Original Text');
			index = index < 0 ? 0 : index; 			// never go below zero
			// Isolate the 'Original Text' Transform, use this to normalize user-submitted term
			var normalization = body.splice(index, 1)[0];

			// Process all other transliterations returned by NLP Services
			body.forEach( function (nlp) {
				var t = {};
				t.termText = term.termText;			// gets set to 'originalText' during normalization
				t.langCode = term.langCode;			// all translits are of the same language (hence translit)

				t.fromNLP = true;
				t.src = 'nlp';
				resp.nlpAdditions.push(normalizeTerm(t, nlp));
			});

			// Return both the normalized term and additional transliterations
			resp.term = normalizeTerm(term, normalization);
		}

		return resp;
	});
};
exports.callNLPService = callNLP;

// Converts the input schema of links (lhs & rhs = the index of the term)
// To the mongoose / data model schema which uses embedded links via term._id
var processTermLinks = function (terms, links) {
	if (links.length < 1) {
        return [];
    }

	return links.map(lk => {
		// if ('_id' in lk) return lk;

		lk.lhs = terms[lk.lhs] || lk.lhs;
		lk.rhs = terms[lk.rhs] || lk.rhs;
		return lk;
	});
};

var processNlpLinks = function (userTerm, nlpTerms) {
	var links = [];

	nlpTerms.forEach( function (nlpTranslit) {
		links.push({
			lhs: userTerm._id,
			rhs: nlpTranslit._id,
			relationType: 'translit',
			notes: [{type: 'source', text: `Variety: ${nlpTranslit.variety}`}]
		});
	});

	return links;
};
exports.processNlpLinks = processNlpLinks;

// This function creates Term documents of both the user-entered-term and any NLP generated
// transliterations, then appends them to the entry itself. It resolves an array of termLinks
// "to-be-created" to link the NLP generated terms with their corresponding user entered term
var addUserTerms = function (entry, terms) {
	// Prepare a list of links to be appended to this entry
	var links = [];

	return Promise.mapSeries(terms, function (termData, index) {
		return callNLP(termData)
		.then( function (nlp) {
			// Creates the user-entered-term (at index 0) and the NLP generated transliterations
			return Term.create([nlp.term].concat(nlp.nlpAdditions));
		})
		.then( function (termDocs) {
			// termDocs index 0 is the user's enter term
			// termsDocs index >= 1 are transliterations returned by NLP Services

			var userTerm = termDocs[0];
			termData._id = userTerm._id;	// provide a linkage between termData and term document
			userTerm._refIndex = index;

			// create a list of translit links "to-be-created"
			links = links.concat(processNlpLinks(userTerm, termDocs.slice(1)));

			// Add the newly created terms to the entry
			entry.terms = entry.terms.concat(termDocs);
		});
	})
	.then( function () {
		// Resolve the list of translit links "to-be-created",
		// since the Terms are added to the entry object already
		return links;
	});
};

var createEntry = function (data, glossaryDoc) {
	var terms = data.terms || [];
	var links = data.termLinks || [];
	var tags = data.tags || [];

	data.glossary = glossaryDoc._id;
	var entry = new Entry(data);

	entry.createdBy = data.createdBy;

	return addUserTerms(entry, terms)
	.then( function (nlpLinks) {
		links = links.concat(nlpLinks);

		entry.termLinks = processTermLinks(entry.terms.filter(e => e.src === 'user'), links);

		return entry.addToOrCreateTags(tags, glossaryDoc._id);
	})
	.then( function () {
		// Store the entry instance into mongo
		return entry.save();
	})
	.then( function () {
		// Add this newly create Entry doc to it's corresponding glossary
		return glossaryDoc.addEntry(entry._id);
	})
	.then( function () {
		// Interfaces with ElasticSearch and indexes the Entry to later be searchable
		return elastic.indexEntry(entry, glossaryDoc._id)
		.then( function () {

			return entry;
		});
	});
};
exports.createEntry = createEntry;

// NOTE: Some of this functionality was moved to
// the entrySchema.pre('remove', ...) hook, however
// a few steps of deletion need access to the Glossary,
// therefore need to be executed here

// Interface method for removing Entry instances
var removeEntry = function (id, glossaryDoc) {
	// Remove Entry _id from Glossary
	return glossaryDoc.removeEntry(id)
	.then( function () {
		// Find the Entry to obtain all Term references
		return Entry.findOne({_id: id}).exec();
	})
	.then( function (doc) {
		// returns the entry doc after execution
		return doc.removeFromTags(glossaryDoc._id);
	})
	.then( function (doc) {
		// returns the entry doc after execution
		return elastic.deindexEntry(doc, glossaryDoc._id);
	})
	.then( function (doc) {
		// triggers the mongoose pre.remove hook
		return doc.remove();
	});
};
exports.removeEntry = removeEntry;

var processNotesDelta = function (item, delta) {
	// removes all notes which should be deleted
	item.notes = item.notes.filter(n => delta.notes.del.indexOf(n._id.toString()) === -1);

	// adds notes
	item.notes = item.notes.concat(delta.notes.add || []);
};

var applyDelta = function (entry, delta, glossaryId) {
	// console.log(JSON.stringify(delta, null, 4));

	// Create all the new Terms (processing them from NLP Services, resolves with nlp-transliterations)
	return addUserTerms(entry, delta.terms.add)
	// Removes deleted Terms & deleted Links
	.then( function (nlpLinks) {
		delta.termLinks.add = delta.termLinks.add.concat(nlpLinks);

		entry.removeLinks(delta.termLinks.del);

		return entry.removeTerms(delta.terms.del);
	})
	// Apply term modifications
	.then( function () {
		return Promise.mapSeries(entry.terms, function (term) {
			var $id = term._id.toString();

			var async = Promise.resolve();

			// if term has a non-empty modification object
			if ($id in delta.terms.mod) {

				var d = delta.terms.mod[$id];				// reference to the specific delta

				// run more sophisticated logic for termText
				if (!!d.termText || !!d.langCode) {
					term.termText = d.termText || term.termText;
					term.langCode = d.langCode || term.langCode;

					if (term.src !== 'nlp') {
						var nlpVarieties = {
							whitelist: [],
							blacklist: []
						};

                        // remove all nlp transliterations from entry
                        async = async.then(function () {
							// filter entry links to only nlp translits of the term to-be edited
							var nlpLinks = entry.termLinks.filter(lk => {
								// ensure link.lhs == editedTerm._id and make sure the
								if ( lk.lhs.toString() === $id ) {
									// termLinks are not populated at this point, therefore
									// search the entry.terms array to find the term object == link.rhs
									var target = entry.terms.find(t => t._id.toString() === lk.rhs.toString());
									// Array.find will return undefined if no matches are found
									if (!!target) {
										// Also, check if the link.rhs term is in the delta modification map, if so, keep the term
										if (target.src === 'nlp' && !(lk.rhs.toString() in d)) {
											nlpVarieties.whitelist.push(target.variety);
											return true;
										}
										else {
											nlpVarieties.blacklist.push(target.variety);
											return false;
										}
									}
								}
								else { return false; }
							});

							entry.removeLinks(nlpLinks.map(lk => lk._id));

							return entry.removeTerms(nlpLinks.map(lk => lk.rhs));
                        })
						.then(function () {
							// re-run the edits to the term through NLP Services
							return callNLP(term);
						})
						.then(function (nlp) {
							Object.assign(term, nlp.term);

							nlp.nlpAdditions = nlp.nlpAdditions.filter(addition => {
								return nlpVarieties.whitelist.indexOf(addition.variety) !== -1 &&
										nlpVarieties.blacklist.indexOf(addition.variety) === -1;
							});

							if (nlp.nlpAdditions.length > 0) {
								// create all the new nlp additions
								return Term.create(nlp.nlpAdditions)
								.then(function (nlpTerms) {
									entry.terms = entry.terms.concat(nlpTerms);
									delta.termLinks.add = processNlpLinks(term, nlpTerms || []);
								});
							}

							return true;
						});
                    }
				}

				return async.then( function () {
					// detect changes in all delta fields, other than termText/langCode (they are a special case)
					Term.DELTA_FIELDS.slice(2).forEach( function (field) {
						if(typeof d[field] !== 'undefined') {
							term[field] = d[field];
						}
					});

					// notes are a special case, and not included in Term.DELTA_FIELDS
					if (!!d.notes) {
                        processNotesDelta(term, d);
                    }

					// If the delta contains a change to either the term text or the langCode this term is now a 'user'
					// generated term. Otherwise the src should remain as it is.
					term.src = (!!d.termText || !!d.langCode) ? 'user': term.src;

					// Save any updates to the term
					return term.save();
				});
			}
			//Object.assign(term, delta.terms.mod[term._id]);
		});

		// TODO: Check for multiple term/langCode/variety type combinations
	})
	// Normalize all delta-assigned uuids to Mongo _ids
	.then( function () {
		// build a map of uuids to _ids
		var fromUuid = {};
		delta.terms.add.forEach( function (t) {
			fromUuid[t.uuid] = t._id;
		});

		// normalize all link lhs/rhs uuids to mongo _ids
		delta.termLinks.add.forEach( function (lk) {
			if (typeof lk.lhs === 'string' && lk.lhs.slice(0, 5) === 'uuid.') {
				lk.lhs = fromUuid[lk.lhs];
			}

			if (typeof lk.rhs === 'string' && lk.rhs.slice(0, 5) === 'uuid.') {
				lk.rhs = fromUuid[lk.rhs];
			}
		});

		// all links are bound by ids already, no need to normalize? Test this!
		entry.termLinks = entry.termLinks.concat(delta.termLinks.add);

		//return entry.removeLinks(delta.termLinks.del);
		return true;
	})
	// Removes all tags flagged for deletion
	.then( function () {
		// need to convert tag strings to the tag's doc _id
		var del = delta.tags.del.map( t => {
			var item = entry.tags.find( doc => doc.content === t );
			return item._id;
		});

		return entry.removeTags(del);
	})
	// Adds tags to entry
	.then( function () {
		return entry.addToOrCreateTags(delta.tags.add, glossaryId);
	})
	// Updates entry metadata
	.then( function () {
		processNotesDelta(entry, delta);

		var del = delta.entry;
		Entry.DELTA_FIELDS.forEach(function (field){
			entry[field] = del[field] || entry[field];
		});

		return entry.save();
	})
	// Re-indexes the entry into Elastic
	.then( function () {
		// Interfaces with ElasticSearch and indexes the Entry to later be searchable
		return elastic.indexEntry(entry, glossaryId, delta.terms.del)
		.then( function () {
			return entry;
		});
	});
};
exports.applyDelta = function (id, delta, glossaryId) {
	return Entry.findOne({_id: id}).populate([
		{
			path: 'tags',
			model: 'Tag',
			select: 'content'
		},
		{
			path: 'terms',
			model: 'Term'
		}
	]).exec()
	.then( function (entryDoc) {
		return applyDelta(entryDoc, delta, glossaryId);
	});
};

exports.updateEntry = function (id, data, glossaryId) {
	return Entry.findOne({_id: id})
	.populate([
		{
			path: 'terms',
			model: 'Term'
		},
		{
			path: 'tags',
			model: 'Tag'
		}
	])
	.exec()
	.then( function (entryDoc) {
		//return updateEntry(entryDoc, data, glossaryId);

		var delta = entryDoc.calcDelta(data);

		return applyDelta(entryDoc, delta, glossaryId);
	});
};

// Middleware which fetches and entry from it's _id attribute
// Binded to ':id' param only
exports.validateParam = function (req, res, next, entryId) {
	// use Entry.count() to verify Entry exists
	// .count() returns slightly faster than .find()
	Entry.count({_id: entryId}).exec()
	.then( function (count) {
		if (count === 1) {
			if (req.glossary.entries.indexOf(entryId) === -1) {
				// if the entry id is not listed within the current glossary
				// the user is working in, return 403 - the request isn't
				// bad and their creds aren't necessarily bad, they just don't
				// have permission at this instance
				log.warn('Entry does not belong to req.glossary');
				return res.sendStatus(403);
			}

			return next();
		}
		else {
			return res.sendStatus(404);
		}
	}).catch(next);
};
