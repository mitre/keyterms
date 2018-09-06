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

app.factory('uiToast', ['$rootScope', '$compile', '$timeout',
function ($scope, $compile, $timeout) {

	var _container =
`<div class="toast toast-container">
	<div class="toast toast-outer animate-repeat" ng-repeat="toast in toasts | orderBy: '-' track by $index">
		<div class="toast toast-inner">{{ toast.msg }} <span ng-if="toast.dismissible" class="toast-close" ng-click="dismiss(toast._index)">Dismiss</span></div>
	</div>
</div>`;

    var service = {};

    service.trigger = function (msg, duration) {
        var toast = {
            _index: _index++,
            _ot: $timeout( function () {
                var i = findToast(toast._index);
                if (i >= 0) { scope.toasts.splice(i, 1); }
            }, duration || 3000),
            msg: msg,
            dismissible: false
        };

        scope.toasts.push(toast);
    };

    service.isActive = function () {
        return scope.toasts.length > 0;
    };

    service.setLimit = function (l) {
    	if (typeof l === 'number') {
    		limit = 1;
		}
	};

    service.DEFAULT_LIMIT = 3;

	// create an isolated scope for all toasts to exist in
	var scope = $scope.$new(true);
	scope.toasts = [];						// list of toasts to be displayed

	var limit = service.DEFAULT_LIMIT;

	// ensure no more than n toasts are displayed at once
	scope.$watch(() => scope.toasts.length, function (newVal, oldVal) {
		if (newVal > limit) {
			scope.toasts.shift();
		}
	});

	scope.dismiss = function (index) {
		var i = findToast(index);
		$timeout.cancel(scope.toasts[i]._ot);
		if (i >= 0) { scope.toasts.splice(i, 1); }
	};

	// bind the container to the isolated scope and add it to the DOM
	var container = $compile(angular.element(_container))(scope);
	angular.element(document.body).prepend(container);

	// Used to create an "uuid" to track all toasts added
	var _index = 0;

	var findToast = function (index) {
		return scope.toasts.findIndex( item => item._index === index );
	};

	return service;
}]);
