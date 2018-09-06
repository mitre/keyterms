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

app.factory('components.term', ['components.base', 'components.note', 'globals', function (Base, Note, globals) {
	var requiredFields = ['langCode', 'termText'];

	var Term = class Term extends Base.class {
		constructor(data, fromServer) {
			super(data);

			if (this.notes instanceof Array && this.notes.length > 0) {
				this.notes = this.notes.map(note => Note.create(note, fromServer));
			}

			// Term specific stuff
			if (!fromServer) {
				this.langCode = this.langCode.value;
			} else {
				// this will reduce to an array of only length 1
				this.langCode = globals.langCodeMap[this.langCode];
			}
		}

		static compare(t1, t2) {
			return t1.termText === t2.termText && t1.langCode === t2.langCode;
		}
	};

	var service = {};

	service.create = function (data, fromServer) {
		return new Term(data, fromServer);
	};

	service.getDefault = function () {
		return {
			langCode: {},
			termText: '',
			notes: []
		};
	};

	service.class = Term;
	service.compare = Term.compare;

	return service;
}]);
