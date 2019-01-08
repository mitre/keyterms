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

app.controller('export-ctrl', ['$scope', 'globals', 'ApiUrl', function ($scope, globals, apiUrl) {
	console.log('Export ctrl loaded!');

	$scope.pageName = 'Export';

	// for ng-repeats
	$scope.fileTypes = globals.supportedFileTypeList;

	$scope.formData = {};
	// Tags temporarily stripped out
	// $scope.formData.tagList = [];
	// $scope.formData.tagStr = '';
    $scope.formData.creation = {};
    $scope.formData.lastMod = {};
    $scope.formData.creation.startDate = '';
    $scope.formData.creation.endDate = '';
    $scope.formData.lastMod.startDate = '';
    $scope.formData.lastMod.endDate = '';
    $scope.formData.langCode = '';
    $scope.formData.tags = '';
	$scope.formData.langCode = globals.langCodeList[12];
	$scope.formData.fileType = globals.supportedFileTypeList[0];

	// JSON Export Query String
    $scope.queryString = 'api/download/search?' +
        'creationStartDate=' +	$scope.formData.creation.startDate +
        '&creationEndDate=' + 	$scope.formData.creation.endDate +
        '&modifiedStartDate=' + 	$scope.formData.lastMod.startDate +
        '&modifiedEndDate=' + 	$scope.formData.lastMod.endDate +
        '&langCode=' + 			$scope.formData.langCode +
    	'&tags=' +				$scope.formData.tags;
    $scope.apiUrl = apiUrl;

	$scope.buildQuery = function () {
		var nextChar = '?';
		var baseURL = apiUrl + 'api/download/glossary';
		var paramVals = [$scope.formData.creation.startDate, $scope.formData.creation.endDate,
			$scope.formData.lastMod.startDate, $scope.formData.lastMod.endDate, $scope.formData.langCode.value, $scope.formData.tags, $scope.formData.fileType.value];

		var paramNames = ['creationStartDate=', 'creationEndDate=', 'modifiedStartDate=', 'modifiedEndDate=', 'langCode=', 'tags=', 'fileType='];

		paramVals.forEach(function (param, index) {

			if(param !== ''){

				baseURL = baseURL + nextChar + paramNames[index] + param;
				nextChar = '&';
			};
        });
		console.log(baseURL);
		return baseURL;

    };
    // Sense Tag methods
	$scope.addTag = function ($event) {
		//console.log($event);
		//console.log($scope.tagStr);

		if ($event.keyCode === 13) {
			$scope.formData.tagList.push($scope.formData.tagStr);
			$scope.formData.tagStr = '';
			$event.target.blur(); // un-focuses the input field
		}
	};
	$scope.removeTag = function ($index) {
		$scope.formData.tagList.splice($index, 1);
	};
}]);
