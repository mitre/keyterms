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

"use strict";

(function() {
	angular.module('kt-upload', ['ui.bootstrap'])

	.constant('Includes', JSON.parse(___includes___))

	.controller('upload-ctrl', ['$scope', '$http', 'Includes', function ($scope, $http, Includes) {
		var reset = function () {
			var clean = {
				glossaries: '',
				glossary: '',
				file: {},
				ext: '',
				format: '',
				generateTag: false
			};
			return Object.assign({}, clean);
		};
		$scope.fm = reset();

		$scope.user = Includes.user;
		$scope.loading = false;
		$scope.msg = {
			text: '',
			show: false,
			format: 'text-muted'
		};
		$scope.fm.glossaries = Includes.glossaries;
		$scope.currentGlossary = Includes.user.currentGlossary;

		$scope.fm.glossaries.forEach(function(gloss){

			if(gloss._id === $scope.currentGlossary){
				$scope.fm.glossary = gloss;
			}
		});

		$scope.exts = Includes.fileTypes;
		$scope.extHints = Includes.fileFormats;
		$scope.formats = [];
		$scope.setFormat = function () {
			$scope.formats = Includes.fileFormats[$scope.fm.ext].formats;
		};

		$scope.isFormValid = function () {
			return $scope.$invalid || angular.equals({}, $scope.fm.file);
		};

		$scope.submit = function () {
			// HTML5 FormData API is needed to send a multipart form via Angular
			var fd = new FormData();

			Object.keys($scope.fm).forEach( function (key) {
				fd.append(key, $scope.fm[key]);
			});

			$scope.loading = true;
			$scope.msg.text = 'Uploading...';
			$scope.msg.format = 'text-muted';
			$scope.msg.show = true;

			// The content-type cannot be set manually (specific issue with multipart forms)
			// therefore the use of angular.identity and 'Content-Type': undefined is required
			$http.post('/upload', fd, {
				transformRequest: angular.identity,
				headers: {'Content-Type': undefined}
			})
			.then( function (res) {
				console.log(res);
				$scope.errors = res.data;
				$scope.loading = false;
				if ($scope.isEmpty(res.data)) {
					$scope.msg.text = 'Upload successful';
					$scope.msg.format = 'text-success';
					$scope.msg.show = true;
				}
				else {
					$scope.msg.text = 'Upload complete with errors, see list below.';
					$scope.msg.format = 'text-danger';
					$scope.msg.show = true;
				}
			});
		};

		$scope.cancel = function () {
			$scope.fm = reset();
		};

		///////////// Error display logic /////////////////////
		$scope.isEmpty = function (obj) {
			return angular.equals({}, obj);
		};

		$scope.errors = {};

	}])

	.directive('ngUpload', function () {
		return {
			restrict: 'A',
			scope: {
				ngUpload: '='
			},
			link: function (scope, elem, attrs) {
				elem[0].value = null;	// resets input[type="file"] on page load. Needed because browser "stores" last uploaded file

				elem.bind('change', function (e) {
					console.log(e);
					var reader = new FileReader();
					reader.onload = function (load) {
						scope.$apply( function () {
							scope.ngUpload = angular.copy({}, e.target.files[0]);
							scope.ngUpload.data = load.target.result;
						});
					};
					reader.readAsDataURL(e.target.files[0]);
				});
			}
		}
	})

	.filter('importError', function () {
		return function (input, field) {
			var result = '';

			var keys = Object.keys(input);

			if (field == 'count') {
				return keys.length;
			}
			else if (field == 'path') {
				result += input[keys[0]].path + ' is a(n) ' + input[keys[0]].kind + ' field';

				keys.slice(1).forEach( function (key) {
					result += '\n' + input[key].path + ' is a(n) ' + input[key].kind + ' field';
				});
			}
			else {
				result += input[keys[0]][field];

				keys.slice(1).forEach( function (key) {
					result += '\n' + input[key][field];
				});
			}

			return result;
		}
	} )
})();
