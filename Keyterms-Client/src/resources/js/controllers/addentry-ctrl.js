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

app.controller('add-entry-ctrl', ['$scope', '$anchorScroll', '$location', 'components.entry', '$routeParams', 'globals', 'user.service',
function ($scope, $anchorScroll, $location, Entry, $routeParams, globals, UserService) {

	console.log('Add Term ctrl loaded!');
	//console.log('globals: ', globals);

	$scope.pageName = 'Add Entry';
	$scope.viewing = 'edit';
	$scope.formView = 'terms';

	$scope.entryData = Entry.getDefault();
    $scope.userGlossary = UserService.getCurrentGlossary();
    console.log($scope.userGlossary);

	//Populate default language from URL
	var langList = globals.langCodeList.map(lc => globals.langCodeMap[lc]);

	//Populate entryData with a starting term if we've got that data to pull from the URL
	if ($routeParams.langCode && $routeParams.term) {
		var defaultLang = langList.find(lc => lc.value == $routeParams.langCode);
		$scope.entryData.termPopulate = {
			termText: decodeURIComponent($routeParams.term),
			langCode: defaultLang
		};
	}

    $anchorScroll.yOffset = 150;
    var goToTop = function() {

        $anchorScroll('top');
    }

    // formView navigation logic
    var formViews = ['terms', 'links', 'tags', 'notes', 'finish'];
    $scope.nextFormView = function () {
        $scope.formView = formViews[formViews.indexOf($scope.formView) + 1];
        goToTop();
    };
    $scope.lastFormView = function () {
        $scope.formView = formViews[formViews.indexOf($scope.formView) - 1];
        goToTop();

    };
}]);
