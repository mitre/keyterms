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
var app = angular.module('keyterms-client', ['ngRoute', 'ngCookies', 'ngAnimate', 'ui.bootstrap', 'ngSanitize']);

if (gitHash === undefined) {
	var gitHash = 'DEVMODE';
}

app.constant('ApiUrl', apiUrl);
app.constant('AppVersion', gitHash);

app.config(function ($routeProvider, $locationProvider, $httpProvider) {
	// stored angular version of when
	var originalWhen = $routeProvider.when;
	var _lastPath = '/search';

	// rewrite .when to add in a resolve param for every endpoint
	$routeProvider.when = function (path, route) {
		route.resolve || (route.resolve = {});

		angular.extend(route.resolve, {
			InitData: ['init.service', function (init) {
				return init.promise;
			}]
		});

		// iterates through all resolve objects and forces them to inject the
		// 'init.service' and wait to resolve themselves until the 'init.service'
		// has resolved it's initial load promise
		Object.keys(route.resolve).forEach(function (key) {
			if (key === 'InitData') { return; }

			// adds the init.service to the front of the injection list
			var newResolveFn = ['init.service'].concat(route.resolve[key]);
			// stores the resolve function which has been passed to this
			// when call via the route parameter
			var currResolveFn = newResolveFn[newResolveFn.length - 1];
			// over-writes the resolve function, forcing it to wait until
			// the init.service has finished resolving before resolving itself
			newResolveFn[newResolveFn.length - 1] = function () {

				// this should be the init.service injection
				var init = arguments[0];

				// needs to be saved in this scope to be used inside the scope below
				var params = arguments;
				return init.promise.then(function () {
					// returns the resolve function passed to the when call.
					// The passed function returns a promise, so calling it inside the
					// .then of the init service's promise forces the init service
					// to resolve BEFORE any other service functions are called
					// (to resolve other dependencies)
					return currResolveFn.apply(null,
					// arguments are not actually an Array instance
					// therefore slice needs to be called in this manner
					Array.prototype.slice.call(params, 1));
				});
			};

			route.resolve[key] = newResolveFn;
		});

		//console.log("route: ", route);

		// essentially a call to super (javascript-style)
		return originalWhen.call($routeProvider, path, route);
	};
	// above take from:
	// http://stackoverflow.com/questions/19937751/angular-how-use-one-resolve-for-all-the-routes-of-my-application/19938307#19938307

	$routeProvider.when('/', {
		redirectTo: '/login'
	})
	.when('/server-down', {
		template: '<h2 class="text-center">Your KeyTerms server at {{apiUrl}} is currently unavailable</h2>' + '<h4 class="text-center">Please contact your system admin or try refreshing the page</h4>',
		controller: function ($scope) {
			$scope.pageName = 'Server Not Found';
		}
	})
	.when('/login', {
		templateUrl: 'resources/templates/modals/login.html',
		controller: ['$scope', '$rootScope', '$location', 'user.service', function ($scope, $rootScope, $location, User) {

			$scope.requestSent = false;
			$scope.dataReturned = false;
			$scope.credentials = {};
			$rootScope.showNav = false;

			$scope.login = function () {
				if ($scope.credentials === {} || !$scope.credentials.email || !$scope.credentials.password) {
					console.log('empty form');
					return;
				}

				$scope.requestSent = true;

				// TODO: log them in
				User.checkUserCreds($scope.credentials).then(function (success) {
					if (success) {
						var user = User.getUser();

						// If the user has a default org then skip showing the org popup
						$rootScope.showOrgPopup = !user.defaultOrg;
						$rootScope.showNav = true;
						var next = _lastPath === User.lastPath ? _lastPath : _lastPath === '/search' ? User.lastPath : _lastPath;
						// _lastPath stores last path attempt when 401 error was returned
						$location.path(next);
					}
				}).catch(function (err) {
					// TODO: display some kind of error in .catch()
					$scope.dataReturned = true;
					$scope.requestSent = false;
					$scope.userFormValues = {
						displayMsg: true,
						errorMessage: 'Invalid username or password'
					};
				});
			};
		}]
	})
	.when('/search', {
		templateUrl: 'resources/templates/pages/search.html',
		controller: 'search-ctrl'
	})
	.when('/addentry', {
		templateUrl: 'resources/templates/pages/addentry.html',
		controller: 'add-entry-ctrl'
	})
	.when('/myentries', {
		templateUrl: 'resources/templates/pages/myentries.html',
		controller: 'user-entries-ctrl',
		resolve: {
			UserEntries: ['keytermsClient.service', function (KeytermsClientInt) {
				// TODO: Handle errors!
				return KeytermsClientInt.getUserEntries();
			}]
		}
	})
	.when('/tags', {
		templateUrl: 'resources/templates/pages/tags.html',
		controller: 'tags-ctrl',
		resolve: {
			tagList: ['keytermsClient.service', function (KeytermsClientInt) {
				// TODO: Handle errors!
				return KeytermsClientInt.getOrgTags();
			}]
		}
	})
	.when('/tags/search/:tag', {
		templateUrl: 'resources/templates/pages/searchByTag.html',
		controller: ['$scope', 'keyterms.fnFactory', 'Tag', 'Results', function ($scope, fnFactory, Tag, Results) {
			$scope.pageName = 'Search By Tag';

			console.log(Tag);
			$scope.tag = Tag.tag;
			$scope.tagCount = Tag.count;
			$scope.encode = encodeURIComponent;

			// pagination functions
			$scope.pageCount = fnFactory.pagination.pageCount;
			$scope.setPage = fnFactory.pagination.setPage;
			$scope.resetPagination = fnFactory.pagination.resetPagination;

			// control button functions
			$scope.selectAllBtn = fnFactory.controlButtons.selectAllBtn($scope);
			$scope.openTagModal = fnFactory.controlButtons.openBulkTagModal($scope);
			$scope.openDeleteModal = fnFactory.controlButtons.openBulkDeleteModal($scope, '/tags');

			//////////////// Init Sequence ////////////////////////////
			$scope.paginationWatcher = angular.noop; // init as function which does nothing

			$scope.searchResults = Results; // store UserTerms into the "master" array
			$scope.resetPagination(); // initializes pagination logic
		}],
		resolve: {
			Tag: ['$route', 'keytermsApi', function ($route, KeyTerms) {
				return KeyTerms.getOrgTag($route.current.params.tag)
				.then( function (resp) {
					console.log(resp);
					return {tag: resp.data.content, count: resp.data.entries.length};
				});
			}],
			Results: ['$route', 'keytermsClient.service', function ($route, KeytermsClientInt) {
				return KeytermsClientInt.searchByTag($route.current.params.tag);
			}]
		}
	})
	.when('/approvals', {
		templateUrl: 'resources/templates/pages/approvals.html',
		controller: 'approvals-ctrl',
		resolve: {
			Nominations: ['keytermsClient.service', function (KeytermsClientInt) {
				// TODO: Handle errors!
				return KeytermsClientInt.getNominations();
			}]
		}
	})
	.when('/approvals/review/:id', {
		templateUrl: 'resources/templates/pages/review.html',
		controller: 'review-ctrl',
		resolve: {
			Nomination: ['$route', 'keytermsClient.service', function ($route, KeytermsClientInt) {
				return KeytermsClientInt.getNomination($route.current.params.id);
			}]
		}
	})
	.when('/drafts', {
		templateUrl: 'resources/templates/pages/drafts.html',
		controller: 'drafts-ctrl',
		resolve: {
			Drafts: ['keytermsClient.service', function (KeytermsClientInt) {
				// TODO: Handle errors!
				return KeytermsClientInt.getDrafts();
			}]
		}
	})
	.when('/export', {
		templateUrl: 'resources/templates/pages/export.html',
		controller: 'export-ctrl'
		//, resolve:
	})
	.when('/contact', {
		templateUrl: 'resources/templates/pages/contact.html',
		controller: 'contact-ctrl'
	})
	.when('/edit/:id', {
		templateUrl: 'resources/templates/pages/editentry.html',
		controller: 'edit-ctrl',
		resolve: {
			Curr: ['$route', 'keytermsClient.service', function ($route, KeytermsClientInt) {
				return KeytermsClientInt.getEntry($route.current.params.id);
			}]
		}
	})
	.when('/viewentry/:id', {
		templateUrl: 'resources/templates/pages/viewentry.html',
		controller: 'view-entry-ctrl',
		resolve: {
			Entry: ['$route', 'keytermsClient.service', function ($route, KeytermsClientInt) {
				return KeytermsClientInt.getEntry($route.current.params.id);
			}]
		}
	})
	.when('/user', {
		templateUrl: 'resources/templates/pages/user.html',
		controller: 'user-ctrl',
		resolve: {
			user: ['user.service', function(User) {
				return User.getUser();
			}]
		}
	})
	.when('/browse', {
		templateUrl: 'resources/templates/pages/browse.html',
		controller: 'browse-ctrl',
		resolve: {
			initData: ['keytermsClient.service', function (KeytermsClientInt) {
				return KeytermsClientInt.browseTerms();
			}]
		}
	})
	.otherwise({
		redirectTo: '/search'
	});

	//$locationProvider.html5Mode(true);

	$httpProvider.defaults.withCredentials = true;
	$httpProvider.interceptors.push(['$q', '$location', '$injector', //'user.service',
	function ($q, $location, $injector) {
		return {
			responseError: function (rejection) {
				if (rejection.status === 401 && $location.path() !== '/login') {
					_lastPath = $location.path();

					$location.path('/login');
					//return $q.resolve();

				}
				else if (rejection.status === 403) {
					var uiToast = $injector.get('uiToast');		// a way around cirular dependencies ($compile -> $http, uiToast -> $compile, $httpProvider -> uiToast)

					uiToast.trigger('Unauthorized action');

					//history.back();	// this logic was moved to an $routeChangeError listener mounted on the $rootScope

					// close all currently open modals on 403 (to make way for the toast)
					var $modalStack = $injector.get('$uibModalStack');	// circumventing the possibility of a circular dependency
					$modalStack.dismissAll('dismiss-all');
				}
				else if (rejection.status === -1) {
					$location.path('/server-down');
				}

				// TODO: handle 404 errors

				return $q.reject(rejection);
			}
		};
	}]);
});

app.value('globals', {
	editScopeList: [],
	viewScopeList: [],
	langCodeList: [],
	noteTypeList: []
	// supportedFileTypes: [{btnDisplay: 'JSON', listDisplay: 'JSON'}, { btnDisplay: 'MS Excel', listDisplay: 'Microsoft Excel' }, { btnDisplay: 'MS Word', listDisplay: 'Microsoft Word' }, { btnDisplay: 'eXchange', listDisplay: 'Translation Memory eXchange' }]
});

app.value('isInitQuery', true);

app.run(['$rootScope', '$location', 'user.service', 'globals', function ($rootScope, $location, User, globals) {

	$rootScope.$on('$locationChangeStart', function (e, next, prev) {

		if (next.match('/#/server-down') || next.match('/#/login')) {
			// never block navigation to 404 page
			return;
		}

		User.lastPath = next.replace($location.protocol() + '://' + $location.host() + ':' + $location.port() + '/#', '');

		if (User.isLoggedIn()) {
			//console.log('User is logged in!');
			$rootScope.showNav = true;
            $rootScope.user = User.getUser();
		} else {
			//console.log('User is NOT logged in!');
			e.preventDefault(); // stop navigation before login can be completed
			$location.path('/login');
			// register for the login promise
		}
	});

	$rootScope.$on('$routeChangeError', function (event, curr, prev, err) {
		// Some operations, like switching Organizations, caused the current $route to reload.
		// Sometimes reloading the $route results in a 403 (Forbidden), usually caused by the
		// swapping of the organization context. "history.back()" sends the user back one step,
		// before they performed the operation which threw a 403
		if (err.status === 403 && err.data === 'Forbidden') {
			history.back();
		}
	});


}]);

app.filter('capitalize', function () {
	return function (input, all) {
		var reg = all ? /([^\W_]+[^\s-]*) */g : /([^\W_]+[^\s-]*)/;
		return !!input ? input.replace(reg, function (txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		}) : '';
	};
});

app.directive('textarea', function () {
	return {
		restrict: 'E',
		link: function (scope, elem) {
			if (!elem.attr('placeholder')) {
				elem.attr('placeholder', 'Enter text here...');
			}
		}
	}
});
