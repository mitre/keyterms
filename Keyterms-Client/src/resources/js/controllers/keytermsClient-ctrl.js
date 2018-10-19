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


app.controller('keytermsClient-ctrl', ['$scope', '$location', '$q', 'user.service', 'AppVersion', '$rootScope', '$uibModal', 'uiToast', 'ApiUrl', 'keytermsClient.service',
function ($scope, $location, $q, User, AppVersion, $rootScope, $uibModal, uiToast, ApiUrl, keytermsClient) {
	console.log('Main Ctrl loaded!');

	$scope.uiToast = uiToast;
	$scope.currentpageName = 'Search';
	$scope.user = User;
	$scope.logout = function () {
		User.logout().then(function (user) {
			keytermsClient.deleteLocalValue();
			$location.path('/login');
		});
	};

	$scope.tbVersion = AppVersion;

	// initialize
	var domQuery = 'nav.navbar ul.nav li > a[href="#' + $location.path() + '"]';
	var lastPage = angular.element(document.querySelector(domQuery)).parent();
	lastPage.addClass('active');

	$scope.$on('$viewContentLoaded', function (event) {
        if ( $rootScope.showOrgPopup ) {
            $uibModal.open({
                animation: false,
                templateUrl: 'orgPopup.html',
                size: 'md',
				scope: $scope,
				controller: function ($scope, $uibModalInstance) {
					$scope.saveAsDefault = false;

					$scope.close = function () {
						if($scope.saveAsDefault){
							var orgId = $scope.user.getUser().currentOrg;
							$scope.user.updateUserDefaultOrg(orgId)
							.then(function(){
								$scope.uiToast.trigger("Default glossary saved! You can update your default glossary in 'My Settings'.");
							});
						}
						$uibModalInstance.close();
					};
				}
            }).closed.then(function(){
                $rootScope.showOrgPopup = false;
			});
		}

        $scope.currentpageName = event.targetScope.pageName;

		lastPage.removeClass('active');
		var domQuery = 'nav.navbar ul.nav li a[href="#' + $location.path() + '"]';
		lastPage = angular.element(document.querySelector(domQuery)).parent().addClass('active');
	});

	$scope.mailto = window.mailto;

	$scope.apiUrl = ApiUrl;

	$scope.isOrgQC = function () {
		return User.getUser().isOrgQC;
	}
}]);
