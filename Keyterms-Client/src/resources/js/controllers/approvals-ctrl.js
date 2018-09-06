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

app.factory('approvals.service', function () {
	var service = {};

	service.sorting = {
		orderBy: 0,
		page: 1,
		itemsPerPage: 10
	};

	return service;
});

app.controller('approvals-ctrl', ['$scope', '$location', '$filter', 'keyterms.fnFactory', 'Nominations', 'approvals.service',
function ($scope, $location, $filter, fnFactory, Nominations, AvlSvc) {
	console.log('Approvals ctrl loaded!');

	$scope.pageName = 'Current Nominations';

	$scope.selectApproval = function (id) {
		$location.path('/approvals/review/' + id);
	};

	console.log(Nominations);

	/////////////// Binds all functions needed from Function Factory ////////////////////

	// pagination functions
	$scope.pageCount = fnFactory.pagination.pageCount;
	$scope.setPage = fnFactory.pagination.setPage;
	$scope.resetPagination = fnFactory.pagination.resetPagination;

	// control button functions
	$scope.selectAllBtn = fnFactory.controlButtons.selectAllBtn($scope);
	$scope.openTagModal = fnFactory.controlButtons.openBulkTagModal($scope);
	$scope.openDeleteModal = fnFactory.controlButtons.openBulkDeleteModal($scope);

	////////////////////////////// Ordering Logic //////////////////////////////////

	var filter = $filter('orderBy');

	$scope.ordering = [
		{ view: 'Date (oldest first)', field: 'creationDate' },
		{ view: 'Date (newest first)', field: '-creationDate' },
		{ view: 'Type', field: 'type' }
	].map((item, index) => {
		item._index = index;
		return item;
	});

	$scope.orderBy = $scope.ordering[AvlSvc.sorting.orderBy];

	$scope.changeOrder = function () {
		AvlSvc.sorting.orderBy = $scope.orderBy._index;
		AvlSvc.sorting.page = 1;

		$scope.searchResults = filter($scope.searchResults, $scope.orderBy.field);
		$scope.resetPagination();
	};

	$scope.$watch('itemsPerPage', function () {
		AvlSvc.sorting.itemsPerPage = $scope.itemsPerPage;
	});

	$scope.$watch('currentPage', function () {
		AvlSvc.sorting.page = $scope.currentPage;
	});

	///////////////////////////// Init Sequence //////////////////////////////////////

	$scope.paginationWatcher = angular.noop; // init as function which does nothing

	$scope.searchResults = Nominations; // store UserTerms into the "master" array
	$scope.searchResults = filter($scope.searchResults, $scope.orderBy.field);
	$scope.resetPagination( function () {
		this.currentPage = AvlSvc.sorting.page;
		this.itemsPerPage = AvlSvc.sorting.itemsPerPage;
	}); // initializes pagination logic

}]);
