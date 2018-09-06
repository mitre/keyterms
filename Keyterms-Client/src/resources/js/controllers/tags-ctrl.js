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

app.controller('tags-ctrl', ['$scope', '$route', '$uibModal', 'tagList', 'keytermsApi', 'user.service',
function ($scope, $route, $uibModal, tagList, KeyTerms, UserSvc) {
	console.log('Tags ctrl loaded!');

	$scope.pageName = 'Manage Tags';
	$scope.qc = UserSvc.getUser().isOrgQC;

	// live data demo
	// Sort the tag list case insensitively
	$scope.tagList = tagList.sort(function(a, b){
		var aTag = a.content.toUpperCase();
		var bTag = b.content.toUpperCase();
		if (aTag > bTag){
			return 1;
		} else if (aTag < bTag){
			return -1;
		} else {
			return 0;
		}
	});

	$scope.openRenameModal = function (index) {
		var modalInstance = $uibModal.open({
			animation: false,
			templateUrl: 'resources/templates/modals/editTag.html',
			controller: function ($scope, $uibModalInstance) {
				$scope.tag = Object.assign({}, tagList[index]);

				$scope.ok = function () {
					KeyTerms.renameTag(tagList[index]._id, $scope.tag.content).then(function (res) {
						if (res.status === 200) {
							$uibModalInstance.close($scope.tag);
							$route.reload();
						} else {
							$uibModalInstance.dismiss();
							console.log('tag unchanged');
							// TODO: add error message to user here
						}
					});
				};

				$scope.cancel = function () {
					$uibModalInstance.dismiss();
				};
			},
			size: 'lg'
		});

		modalInstance.result.then(function (res) {
			$scope.tagList.splice(index, 1);
		});
	};

	$scope.openDeleteModal = function (index) {
		var modalInstance = $uibModal.open({
			animation: false,
			templateUrl: 'resources/templates/modals/deleteModal.html',
			controller: function ($scope, $uibModalInstance) {

				$scope.ok = function () {
					KeyTerms.deleteTag(tagList[index]._id).then(function (res) {
						if (res.status === 204) {
							$uibModalInstance.close($scope.tag);
							tagList.splice(index, 1);
						} else {
							$uibModalInstance.dismiss();
							console.log('tag not deleted');
							// TODO: add error message to user here
						}
					});
				};

				$scope.cancel = function () {
					$uibModalInstance.dismiss();
				};
			},
			size: 'lg'
		});

		modalInstance.result.then(function (res) {
			$scope.tagList.splice(index, 1);
		});
	};
}]);
