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

 app.directive('tagAuto', ['keytermsApi', function (KeyTerms) {

 	var _cslRegex = /^(?:\w|\d| )+(?:, ?(?:\w|\d|(?: \w)|(?: \d) )+)*$/;

 	return {
 		restrict: 'E',
 		scope: {
 			inputModel: '='
 		},
 		templateUrl: 'resources/templates/widgets/autoComplete.html',
 		controller: ['$scope', function($scope) {

 			$scope.isAutoLoading = false;
 			$scope.isOpen = false;
 			$scope.autocomplete = function () {

 				if (!$scope.inputModel || $scope.inputModel.length < 3) {
 					$scope.isOpen = false;
 					return;
 				}

 				if ($scope.inputModel.indexOf(',') !== -1) {
 					$scope.isOpen = false;
 					return;
 				}

 				$scope.isAutoLoading = true;
 				KeyTerms.autocomplete($scope.inputModel)
 				.then(function(response) {
 					$scope.isOpen = true;
 					$scope.options = response.data;
 					$scope.isAutoLoading = false;
 				})
 				.catch( function (err) {
 					console.log(err);
 					$scope.isAutoLoading = false;

 				});
 			};

 			$scope.chooseTag = function (text) {
 				$scope.inputModel = text;
 				$scope.isOpen = false;
 			}
 		}]

 	};

 }]);
