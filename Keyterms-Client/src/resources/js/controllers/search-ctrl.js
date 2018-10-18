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

app.controller('search-ctrl', ['$scope', '$location', 'keyterms.fnFactory', 'keytermsClient.service', 'isInitQuery',
function ($scope, $location, fnFactory, KeytermsClientInt, isInitQuery) {
	console.log('Search ctrl loaded!');
	console.log('isInitQuery: ', isInitQuery);

	$scope.pageName = 'Search';
	$scope.querying = false;
	$scope.initialQuery = isInitQuery;
	//$scope.initialQuery = false;
	isInitQuery = false;

	$scope.glossScopes = ['Current Glossary', 'My Glossaries', 'All Glossaries'];
    $scope.glossScope = $scope.glossScopes[0];

	$scope.encode = encodeURIComponent;

	$scope.searchTerm = {
		term: '',
		langCode: {},
		onClick: function () {
			// prevents user from spamming queries
			if ($scope.querying || !this.term) {
				return false;
			} else if (angular.equals(this.langCode, {})) {
				$scope.noSelectedLC = true;
				return false;
			}
			// shows user query is executing
			$scope.querying = true;
			$scope.noSelectedLC = false;
			$scope.initialQuery = false;

			// store it locally
			$scope.lastSearch = {term: this.term, langCode: this.langCode};
			KeytermsClientInt.storeLocalValue('search', 'lastSearch', { term: this.term, lc: this.langCode });
			KeytermsClientInt.searchTerms(this.term, this.langCode.value, $scope.glossScope)
			.then(function (termList) {
				$scope.searchResults = termList;
				$scope.resetPagination();
				$scope.querying = false;
			}).catch(function (err) {
				console.log(err);
				$scope.querying = false;
			});
		}
	};

	$scope.setGlossScope = function (newGlossScope) {
		$scope.glossScope = newGlossScope;
    }

	$scope.advSearch = function () {
		$scope.initialQuery = false;
		$scope.showAdvanced = true;
	};

	// Runs a search on the last term stored (if one exits)
	var temp = KeytermsClientInt.getLocalValue('search', 'lastSearch');
	if (!!temp) {
		$scope.searchTerm.term = temp.term;
		$scope.searchTerm.langCode = temp.lc;
		$scope.searchTerm.onClick();
	}

	$scope.searchResults = [];
	$scope.paginationWatcher = angular.noop; // init as function which does nothing

	// pagination functions
	$scope.pageCount = fnFactory.pagination.pageCount;
	$scope.setPage = fnFactory.pagination.setPage;
	$scope.resetPagination = fnFactory.pagination.resetPagination;

	// control button functions
	$scope.selectAllBtn = fnFactory.controlButtons.selectAllBtn($scope);
	$scope.anyChecked = fnFactory.controlButtons.anyChecked($scope);
	$scope.openTagModal = fnFactory.controlButtons.openBulkTagModal($scope);
	$scope.openDeleteModal = fnFactory.controlButtons.openBulkDeleteModal($scope);
    $scope.exportSelected = fnFactory.controlButtons.exportSelected($scope);
}]);
