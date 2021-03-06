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

app.factory('term-highlight.service', ['$rootScope', function ($rootScope) {
	var terms = {};

	var service = {};

	var onMouseEnter = function (index) {
		return function () {
			terms[index].forEach(function (e) {
				if (!!e) { e.addClass('term-highlight'); }
			});
		}
	};

	var onMouseLeave = function (index) {
		return function () {
			terms[index].forEach(function (e) {
				if (!!e) { e.removeClass('term-highlight'); }
			});
		}
	};

	// prevent "memory leaks" when changing pages
	$rootScope.$on('$routeChangeSuccess', function () {
		terms = {};
	});

	service.register = function (index, elem) {
		if (!angular.isElement(elem)) { throw new Error('elem is required to be a html element'); }

		if (!terms[index]) {
			terms[index] = [];
		}

		// bind event handlers?
		elem.on('mouseenter', onMouseEnter(index));
		elem.on('mouseleave', onMouseLeave(index));

		terms[index].push(elem);

		return terms[index].length - 1;	// return index of the item within the elements array
	};

	service.unregister = function (index, subIndex) {
		if (!terms[index]) { return false; }

		terms[index][subIndex].off('mouseenter mouseleave');
		terms[index][subIndex] = null;

		if (terms[index].length < 1) { terms[index] = undefined; }
	};

	return service;
}]);
