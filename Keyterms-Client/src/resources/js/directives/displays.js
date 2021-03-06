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

app.directive('displayEntry', ['globals', function (globals) {
	return {
		restrict: 'E',
		replace: true,
		scope: {
			entry: '=entry',
			nomType: '=nomType',
			delta: '=delta',
			nomination: '=nomination'
		},
		templateUrl: 'resources/templates/widgets/displayEntry.html',
		link: function (scope, elem, attrs) {
			if (!!attrs.entryBorder && attrs.entryBorder === 'false') {
				elem.css('border', 'none');
			}

			scope.entryTypeMap = globals.entryTypeList.reduce((acc, t) => {
				acc[t.value] = t; return acc;
			}, {});

			scope.termHighlight = {};

			//console.log(elem.children());
			//console.log(elem.children().filter);
			//console.log(elem.children().filter(e => e.nodeName === "P"));
		}
	};
}]);

app.directive('displayTerms', function () {
	return {
		restrict: 'E',
		replace: true,
		scope: true,
		link: function(scope, element, attrs){
			scope.terms = scope.$eval(attrs.terms);
			scope.newTerm = attrs.newTerm;
			scope.indexOffset = scope.$eval(attrs.indexOffset);
		},
		templateUrl: 'resources/templates/widgets/displayTerms.html'
	};
});

app.directive('displayLinks', function () {
	return {
		restrict: 'E',
		replace: true,
		scope: true,
		link: function(scope, element, attrs){
			scope.links = scope.$eval(attrs.links);
		},
		templateUrl: 'resources/templates/widgets/displayLinks.html'
	};
});

app.directive('displayTags', function () {
	return {
		restrict: 'E',
		scope: true,
		link: function (scope, element, attrs) {
			scope.tags = scope.$eval(attrs.tags);
			scope.newTag = attrs.newTag;
		},
		templateUrl: 'resources/templates/widgets/displayTags.html'
	};
});

app.directive('displayNotes', function () {
	return {
		restrict: 'E',
		replace: true,
		scope: true,
		link: function(scope, element, attrs){
			scope.notes = scope.$eval(attrs.notes);
			scope.newNote = attrs.newNote;
		},
		templateUrl: 'resources/templates/widgets/displayNotes.html'
	};
});

app.directive('displayEntryList', ['keyterms.fnFactory', 'globals', function (fnFactory, globals) {
	return {
		restrict: 'E',
		replace: true,
		scope: {entries: '=entries', isTextSearch: '=istextsearch', showCheckboxes: '=?'},
		templateUrl: 'resources/templates/widgets/displayEntryList.html',
		controller: function ($scope) {
			$scope.viewScopeList = globals.viewScopeList.reduce((viewScopeMap, vs) => { viewScopeMap[vs.value] = vs.name; return viewScopeMap }, {});
			$scope.editScopeList = globals.editScopeList.reduce((editScopeMap, es) => { editScopeMap[es.value] = es.name; return editScopeMap }, {});
			$scope.viewEntry = fnFactory.navigation.viewEntry;

			// defaults to true
			$scope.showCheckboxes = ($scope.showCheckboxes === undefined) ? true : $scope.showCheckboxes;
		}
	};
}]);

app.directive('selectAll', function () {
	return {
		restrict: 'E',
		replace: true,
		scope: {
			filteredResults: '=filteredResults',
			searchResults: '=searchResults',
		},
		templateUrl: 'resources/templates/widgets/selectAll.html',
		link: function (scope, elem, attrs) {
			scope.pageSelected = false;
			scope.allSelected = false;
			scope.buttonText = 'Select All';

			scope.selectedCount = function () {
				return scope.searchResults.filter(function (item) {
					return item.checkVal;
				}).length
			};

			scope.hasPagedResults = function () {
				return 'filteredResults' in scope ? scope.searchResults > scope.filteredResults : false;
			};

			// Select / Deselect All on Page
			scope.toggleSelectPage = function () {

				// If no elements are selected, assume the user is trying to do a page select
				if (scope.selectedCount() === 0 ) {
					scope.pageSelected = true;
				} else {
					// Toggle
					scope.pageSelected = !scope.pageSelected;

				}

				// Deal with the filtered results, if we have them, otherwise deal with all of the search results
				var list = 'filteredResults' in scope ? scope.filteredResults : scope.searchResults;

				// Change Button Text & Reset allSelected
				if (scope.pageSelected) {
					scope.buttonText = 'Deselect All';
					list.forEach(function (item) {
						item.checkVal = true;
					});
				} else {
					scope.buttonText = 'Select All';
					scope.allSelected = false;
					// Always iterate over the entire search results if we're deselecting to make sure that elements on other pages also get deselected
					scope.searchResults.forEach( function(item) {
						item.checkVal = false
					});
				}
			};

			scope.toggleCrossPageSelect = function () {
				// Toggle the value
				scope.allSelected = !scope.allSelected;

				if (scope.allSelected) {
					scope.searchResults.forEach(function (item) {
						item.checkVal = true;
					});
				} else {
					scope.pageSelected = false;
					scope.searchResults.forEach(function (item) {
						item.checkVal = false;
					});

				}
			}

		}
	}
});