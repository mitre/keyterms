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

app.factory('components.termlink', ['components.base', 'globals', function (Base, globals) {
	var requiredFields = ['langCode', 'termText'];

	var TermLink = class TermLink extends Base.class {
		constructor(data, fromServer) {
			super(data);

			// TermLink specific stuff
			if (!fromServer) {
				this.relationType = this.relationType.value;
			} else {
				// this will reduce to an array of only length 1
				this.relationType = globals.orthoTypes.filter(t => t.value === this.relationType)[0];
			}
		}

		static compare(l1, l2) {
			if (!!l1.__lhs_id && !!l2.__lhs_id && !!l1.__rhs_id && !!l2.__rhs_id) {
				return l1.__lhs_id === l2.__lhs_id && l1.__rhs_id === l2.__rhs_id && l1.relationType === l2.relationType;
			} else {
				return l1.lhs === l2.lhs && l1.rhs === l2.rhs && l1.relationType === l2.relationType;
			}
		}
	};

	var service = {};

	service.create = function (data, fromServer) {
		return new TermLink(data, fromServer);
	};

	service.getDefault = function () {
		return {
			lhs: 'Drag source term',
			rhs: 'Drag target term',
			relationType: ''
		};
	};

	service.compare = TermLink.compare;

	return service;
}]);
