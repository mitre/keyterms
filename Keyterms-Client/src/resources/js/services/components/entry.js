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

app.factory('components.entry', ['globals', 'user.service', 'components.base', 'components.note', 'components.termlink', 'components.term', function (globals, User, Base, Note, TermLink, Term) {
	var Base = Base.class;

	var requiredFields = ['schemaVersion', 'status', 'type'];

	//constructor
	var Entry = class Entry extends Base {
		constructor(data, fromServer) {
			super(data);
			//console.log(data);

			// eliminates passing undefined around
			fromServer = !!fromServer;

			// Entry specific stuff
			if (this.terms instanceof Array && this.terms.length > 0) {
				this.terms = this.terms.map(term => Term.create(term, fromServer));
			}

			if (this.termLinks instanceof Array && this.termLinks.length > 0) {
				this.termLinks = this.termLinks.map(link => TermLink.create(link, fromServer));
			}

			if (this.notes instanceof Array && this.notes.length > 0) {
				this.notes = this.notes.map(note => Note.create(note, fromServer));
			}

			if (!this.schemaVersion) {
				this.schemaVersion = globals.schemaVersion;
			}

			// This is logic to prepare the Entry object to specifically be SENT TO the KeyTerms API
			if (!fromServer) {
				//this.isShared = this.shared === 'Shared';
				//delete this.shared;

				this.editScope = this.editScope.value;
				this.viewScope = this.viewScope.value;

				this.type = this.type.value;

				if (typeof this.createdBy === 'object') {
					this.createdBy = this.createdBy._id;
				}
			}
			// This is logic to prepare Entry objects to be displayed on the KeyTerms GUI
			else {
					// this will reduce to an array of only length 1
					this.editScope = globals.editScopeList.filter(t => t.value === this.editScope)[0];
					this.viewScope = globals.viewScopeList.filter(t => t.value === this.viewScope)[0];
					this.type = globals.entryTypeList.filter(t => t.value === this.type)[0];

					// build a map of each Term's index location
					var termIndices = {};
					this.terms.forEach((term, index) => {
						termIndices[term._id] = index;
					});

					// convert termLinks back to the gui-form version
					this.termLinks.forEach(link => {
						link._lhsIndex = termIndices[link.lhs];
						link._rhsIndex = termIndices[link.rhs];
						link.lhs = this.terms[link._lhsIndex];
						link.rhs = this.terms[link._rhsIndex];
					});

					this._tagObjs = this.tags.slice(); // creates a shallow copy of the array
					this.tags = this.tags.map(tag => tag.content);
				}
		}

		// isValid () {
		// 	return this.terms.length > 0
		// 		&& !!this.status
		// 		&&
		// }
	};

	// To create a 'add' nomination --> new Nom(data);
	// To create a 'del' nomination --> new Nom(null, entry._id)
	// To create a 'mod' nomination --> new Nom(data, entry._id)
	var Nomination = class Nomination extends Base {
		constructor(data, id, fromServer) {
			super({});
			fromServer = !!fromServer;

			if (fromServer) {
				this.originalEntry = new Entry(this.originalEntry, true);
			}
			else {
				if (!!data && !!data._comments) {
					this.comments = data._comments.slice();		// create copy
					data._comments = undefined;
				}

				// We check for 'mod' in two different ways to support the original signature of this function
				if (!!data && id === undefined) {
					if (!!data._id) {
						// mod
						this.type = 'mod';
						this.data = new Entry(data);
						this.originalEntry = data._id;
					}
					else {
						// create
						this.type = 'add';
						this.data = new Entry(data);
					}
				} else if (!!data && typeof data === 'object' && !!id) {
					this.type = 'mod';
					this.data = new Entry(data);
					this.originalEntry = id;
				} else if (data === null && !!id) {
					this.type = 'del';
					this.originalEntry = id;
				} else {
					throw new Error('Bad Nomination Instantiation');
				}

				if (this.notes instanceof Array && this.notes.length > 0) {
					this.notes = this.notes.map(note => Note.create(note));
				}
			}

		}

	};

	var service = {};

	service.create = function (data, fromServer) {
		return new Entry(data, fromServer);
	};

	service.nominate = function (data, id, fromServer) {
		return new Nomination(data, id, fromServer);
	};

	// export comparison functions
	service.compare = {
		Term: Term.compare,
		TermLink: TermLink.compare,
		Note: Note.compare
	};

	service.defaults = {
		Term: Term.getDefault,
		TermLink: TermLink.getDefault,
		Note: Note.getDefault
	};

	service.getDefault = function () {
		return {
			terms: [],
			termLinks: [],
			tags: [],
			notes: [],
			editScope: globals.editScopeList[1],
			viewScope: globals.viewScopeList[0],
			type: globals.entryTypeList[0]
		};
	};

	return service;
}]);
