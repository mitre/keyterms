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

(function() {
	var __templatePath = 'static/templates';

	angular.module('baas-admin' , ['ngRoute', 'ngAnimate', 'ui.bootstrap'])

	.config( function ($routeProvider, $locationProvider, $httpProvider) {

		$routeProvider
		.when('/', {
			redirectTo: '/home'
		})
		.when('/home', {
			templateUrl: __templatePath + '/home.html',
			controller: function ($scope) {}
		})
		.when('/user', {
			templateUrl: __templatePath + '/user.html',
			controller: ['$scope', '$location', '$uibModal', 'Api.service', 'Org', 'CommonOrg', 'Orgs', function ($scope, $location, $uibModal, ApiSvc, Org, CommonOrg, Orgs) {
				$scope.user = {};
				$scope.user.password = Math.random().toString(36).slice(2, 14);
				$scope.user.organizations = [CommonOrg];
				$scope.user.currentOrg = CommonOrg;

				$scope.submit_value = $scope.title = 'Create User';
				$scope.nonmodal = true;

				var openModal = function (httpProm) {
					var modal = $uibModal.open({
						animation: false,
						templateUrl: __templatePath + '/createUser.html',
						controller: ['$scope', '$uibModalInstance', function (_scope, $uibModalInstance) {
							_scope.status = 'loading';

							// prevents closing from outside clicks
							_scope.$on('modal.closing', function (event, reason) {
								if (reason == 'backdrop click')
									event.preventDefault();
							});

							_scope.cancel = function () {
								$uibModalInstance.dismiss();
							};

							_scope.ok = function () {
								_scope.cancel();
								$location.path('/users');
							};

							httpProm.then( function (resp) {
								console.log('inside modal.then:', resp);

								_scope.status = 'success';
								_scope.temp = $scope.user.password;
							})
							.catch( function (resp) {
								console.log('inside modal.catch:', resp);

								_scope.status = 'error';
							});
						}],
						size: 'md'
					});
				};


				$scope.submit = function () {
					var data = angular.copy($scope.user);
					openModal(ApiSvc.createUser(data));
				};

				$scope.back = function () {
					$location.path('/users');
				};

				// Defaults
				if (!!$location.search().org) {
					//$scope.user.org = $location.search().org;
					var index = Orgs.map( function (org) { return org._id; }).indexOf($location.search().org);
					$scope.org = Orgs[index];
					console.log('$scope.org: ', $scope.org); // test this
				}
			}]
			, resolve: {
				Org: ['User.service', function (UserService) {
					return UserService.getUser().currentOrg;
				}],
				CommonOrg: ['Api.service', function (ApiSvc) {
					return ApiSvc.getCommonOrg()
					.then(function (res) {
						return res.data;
					});
				}],
				Orgs: ['Api.service', function (ApiSvc) {
					return ApiSvc.getOrgs()
					.then(function (res) {
						return res.data;
					});
				}]
			}
		})
		.when('/user/:id', {
			templateUrl: __templatePath + '/user.html',
			controller: ['$scope', '$location', '$uibModal', 'Api.service', 'User', 'CurrentId', function ($scope, $location, $uibModal, ApiSvc, User, CurrentId) {

				$scope.existing = true;
				$scope.nonmodal = true;

				$scope.submit = function () {
					var data = angular.copy($scope.user);

					// Drop any organizations marked for removal from user's org list
					var orgsToKeep = [];
					data.organizations.forEach(function(org) {
						if(data.__orgsToRemove.indexOf(org._id) < 0) {
							orgsToKeep.push(org);
						} else {
							// if this was the user's current or default org, reset those fields
							if(data.currentOrg === org._id) {
								data.currentOrg = null;
							}
							if(data.defaultOrg === org._id) {
								data.defaultOrg = null;
							}
						}
					});
					data.organizations = orgsToKeep;
					data.currentOrg = (data.currentOrg || data.organizations[0]._id);	// if current org was reset, choose first valid org

					ApiSvc.updateUser(data)
					.then( function (resp) {
						$location.path('/users');
					});
				};

				$scope.isOrgAdmin = function (org) {
					return org.admins.indexOf($scope.user._id) != -1;
				};

				$scope.isOrgQC = function (org) {
					return org.qcs.indexOf($scope.user._id) != -1;
				};

				$scope.setPassword = function () {
					$scope.user.password = Math.random().toString(36).slice(2, 14);
					$scope.pwdChanged = true;
					var modal = $uibModal.open({
						animation: false,
						templateUrl: __templatePath + '/password.html',
						controller: ['$scope', '$uibModalInstance', function (_scope, $uibModalInstance) {
							_scope.password = $scope.user.password;

							// prevents closing from outside clicks
							_scope.$on('modal.closing', function (event, reason) {
								if (reason == 'backdrop click')
									event.preventDefault();
							});

							_scope.ok = function () {
								$uibModalInstance.dismiss();
							};
						}],
						size: 'md'
					});
				};

				$scope.showOrgDeleteBtn = function (orgId) {
					return $scope.user.organizations.length > 1 &&
						  ($scope.user.organizations.length - $scope.user.__orgsToRemove.length > 1 ||
						   $scope.user.__orgsToRemove.indexOf(orgId) > -1);
				}

				$scope.back = function () {
					$location.path('/users');
				};

				// assign the User object to the form data model (to auto-populate form)
				$scope.user = User;
				$scope.user.__orgsToRemove = [];

				$scope.submit_value = 'Save Changes';
				$scope.title = 'Edit User';
				$scope.currentUser = CurrentId;

			}]
			, resolve: {
				User: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getUserById($route.current.params.id)
					.then(function (user) {
						return user.data;
					})
				}],
				CurrentId: ['User.service', function (userSvc) {
					return userSvc.getUser()._id;
				}]
			}
		})
		.when('/users', {
			templateUrl: __templatePath + '/users.html',
			controller: [ '$scope', '$location', '$route', 'deleteModal', 'Api.service', 'Users', function ($scope, $location, $route, deleteModal, ApiSvc, Users) {
				$scope.users = Users;

				$scope.showDeactive = false;
				$scope.deactiveCount = $scope.users.filter(u => u.isDeactivated).length;
				$scope.deactiveVerb = 'show';
				$scope.toggleShowDeactive = function () {
					$scope.showDeactive = !$scope.showDeactive;
					$scope.deactiveVerb = $scope.showDeactive ? 'hide' : 'show';
				};

				$scope.filterChange = function (field) {
					return Users.map( function (user) {
						return user[field].name || user[field];
					});
				};

				$scope.filterFields = [
					{val: 'fullName', view: 'Full Name'},
					{val: 'username', view: 'Username'},
					{val: 'email', view: 'Email'}
				];

				if (!!$location.search().org) {
					$scope.users = $scope.users.filter( function (user) {
						return user.organizations.indexOf($location.search().org) != -1;
					});
				}

				$scope.deleteUser = function (user) {
					deleteModal.openModal('user').then(function(response) {
						ApiSvc.deleteUser(user._id).then(function(response) {
							$route.reload();
						});
					});
				};

			}]
			, resolve: {
				Users: ['Api.service', function (ApiSvc) {
					return ApiSvc.getAllUsers()
					.then(function (res) {
						return res.data;
					});
				}]
			}
		})
		.when('/org', {
			templateUrl: __templatePath + '/org.html',
			controller: ['$scope', '$location', '$sce', 'Api.service', 'LangCodes', function ($scope, $location, $sce, ApiSvc, LangCodes) {
				$scope.org = {
					langList: []
				};

				$scope.langCodes = LangCodes.codes;
				$scope.reference = LangCodes.reference;

				$scope.title = 'Create Organization';
				$scope.button = 'Create';
				$scope.showUsers = false;

				$scope.submit = function () {
					ApiSvc.createOrg(angular.copy($scope.org))
					.then( function (resp) {
						$location.path('/orgs');
					});
				};

				$scope.globalBlockPopover = 'Prevent all Entries of this Organization from being searchable by users outside of this Organization';

				$scope.supportedPopoverText =
					$sce.trustAsHtml('A master list of all languages KeyTerms supports.<br><br>Add a language to this Organization by clicking the <i class="fa fa-fw fa-plus text-success"></i>');

				$scope.orgPopoverText =
					$sce.trustAsHtml('These are the languages currently associated with this Organization.<br><br>Remove a language from this Organization by clicking the <i class="fa fa-fw fa-times text-danger"></i>');
			}]
			, resolve: {
				LangCodes: ['Api.service', function (ApiSvc) {
					return ApiSvc.getLangCode()
					.then(function (res) {
						return {
							codes: Object.keys(res.data.languageCodes).map(function (lc) {
								var code = Object.assign({}, res.data.languageCodes[lc]);
								code.code = lc;
								return code;
							}),
							reference: res.data.languageCodes
						}
					})
				}]
			}
		})
		.when('/org/:id', {
			templateUrl: __templatePath + '/org.html',
			controller: ['$scope', '$location', '$sce', 'Api.service', 'Org', 'LangCodes', 'Users', function ($scope, $location, $sce, ApiSvc, Org, LangCodes, Users) {
				$scope.org = angular.merge({}, Org);
				$scope.users = Users;
				$scope.users.forEach( function (user) {
					if ($scope.org.qcs.indexOf(user._id) != -1) {
						user.qc = true;
					}

					if ($scope.org.admins.indexOf(user._id) != -1) {
						user.admin = true;
					}
				});

				$scope.langCodes = LangCodes.codes;
				$scope.reference = LangCodes.reference;

				$scope.title = 'Edit Organization';
				$scope.button = 'Save Changes';

				$scope.userUpdate = function (user) {
					console.log('change fired');
					if (user.qc != undefined) {
						var qcIndex = $scope.org.qcs.indexOf(user._id);
						if (user.qc && qcIndex == -1) {
							// qc set to true and user is not currently in org qc list, add it
							$scope.org.qcs.push(user._id);
						}
						else if (!user.qc && qcIndex != -1) {
							// qc set to false and user is currently listed in org qc, remove them
							$scope.org.qcs.splice(qcIndex, 1);
						}
						// user.qc && qcIndex != -1	// do noting
						// !user.qc && qcIndex == -1	// do nothing
					}
					if (user.admin != undefined) {
						var adIndex = $scope.org.admins.indexOf(user._id);
						if (user.admin && adIndex == -1) {
							// admin set to true and user is not currently in org qc list, add it
							$scope.org.admins.push(user._id);
						}
						else if (!user.admin && adIndex != -1) {
							// admin set to false and user is currently listed in org qc, remove them
							$scope.org.admins.splice(adIndex, 1);
						}
						// user.admin && adIndex != -1	// do noting
						// !user.admin && adIndex == -1	// do nothing
					}
				};

				$scope.submit = function () {
					console.log($scope.org);
					//return;

					ApiSvc.updateOrg(angular.copy($scope.org))
					.then( function (resp) {
						return ApiSvc.updateMembers($scope.org._id, $scope.users);
					})
					.then( function (resp) {
						$location.path('/orgs');
					});
				};

				$scope.globalBlockPopover = 'Prevent all Entries of this Organization from being searchable by users outside of this Organization';

				$scope.supportedPopoverText =
					$sce.trustAsHtml('A master list of all languages KeyTerms supports.<br><br>Add a language to this Organization by clicking the <i class="fa fa-fw fa-plus text-success"></i>');

				$scope.orgPopoverText =
					$sce.trustAsHtml('These are the languages currently associated with this Organization.<br><br>Remove a language from this Organization by clicking the <i class="fa fa-fw fa-times text-danger"></i>');
			}]
			, resolve: {
				Org: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getOrgById($route.current.params.id)
					.then( function (res) {
						return res.data;
					})
				}],
				LangCodes: ['Api.service', function (ApiSvc) {
					return ApiSvc.getLangCode()
					.then( function (res) {
						return {
							codes: Object.keys(res.data.languageCodes).map( function (lc) {
								var code = Object.assign({}, res.data.languageCodes[lc]);
								code.code = lc;
								return code;
							}),
							reference: res.data.languageCodes
						}
					})
				}],
				Users: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getOrgUsers($route.current.params.id)
					.then( function (res) {
						return res.data;
					})
				}],
			}
		})
		.when('/org/:id/manage', {
			templateUrl: __templatePath + '/manageUsers.html',
			controller: ['$scope', '$location', '$timeout', 'Api.service', 'addUserModal', 'Org', 'CommonOrg', 'Users',
			function ($scope, $location, $timeout, ApiSvc, addUserModal, Org, CommonOrg, Users) {
				$scope.org = Org;
				$scope.commonOrg = CommonOrg;
				$scope.members = Users.members;
				$scope.users = Users.nonMembers;

				$scope.showDeactive = false;
				$scope.deactiveCount = $scope.members.filter(u => u.isDeactivated).length;
				$scope.deactiveVerb = 'show';
				$scope.toggleShowDeactive = function () {
					$scope.showDeactive = !$scope.showDeactive;
					$scope.deactiveVerb = $scope.showDeactive ? 'hide' : 'show';
				};

				$scope.filterChange = function (field) {
					return Users.members.map( function (user) {
						return user[field].name || user[field];
					});
				};

				$scope.filterFields = [
					{val: 'fullName', view: 'Full Name'},
					{val: 'email', view: 'Email'}
				];

				$scope.openModal = function () {
					addUserModal.openModal($scope);
				};


				$scope.save = function () {
					ApiSvc.updateMembers(Org._id, $scope.members)
					.then( function (resp) {
						addUserModal.cacheMsg({success: 'Organization was successfully updated'});
						addUserModal.$routeReload();
					})
					.catch( function (err) {
						addUserModal.cacheMsg({error: 'Something went wrong. Please try again'});
						addUserModal.$routeReload();
					})
				};

				$scope.isDisabled = function () {
					//return getMarkedUsers().length < 1 || pristine;
					// TODO: write logic to check for "$pristine" and "$dirty" events

					return false;
				};

				$scope.statusMsg = addUserModal.getCachedMsg();
				$timeout( function() {
					$scope.statusMsg = null;
				}, 1750);
			}]
			, resolve: {
				Org: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getOrgById($route.current.params.id)
					.then( function (res) {
						return res.data;
					})
				}],
				CommonOrg: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getCommonOrg()
					.then( function (res) {
						return res.data;
					})
				}],
				Users: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getOrgUsers($route.current.params.id, true)
					.then( function (res) {
						return res.data;
					})
				}],
			}
		})
		.when('/orgs', {
			templateUrl: __templatePath + '/orgs.html',
			controller: function ($scope, Orgs) {
				$scope.orgs = Orgs;

				$scope.filterChange = function (field) {
					return Orgs.map( function (org) {
						return org[field].name || org[field];
					});
				};

				$scope.filterFields = [
					{val: 'name', view: 'Name'},
					{val: 'abbreviation', view: 'Abbreviation'}
				];
			}
			, resolve: {
				Orgs: ['Api.service', function (ApiSvc) {
					return ApiSvc.getOrgs()
					.then(function (res) {
						return res.data;
					});
				}]
			}
		})
		.when('/404', {
			template: '<h1>Something went wrong. Sorry about that!</h1><h3>HTTP Error Code: <span class="text-danger">{{::errCode}}</span></h3>',
			controller: ['$scope', '$location', function ($scope, $location) {
				$scope.errCode = $location.search().err || 404;
				$scope.errCode = $scope.errCode == -1 ? 'UNKNOWN' : $scope.errCode;
			}],
			reloadOnSearch: false
		})
		.otherwise('/404');

		$locationProvider.html5Mode(true);

		$httpProvider.interceptors.push('errorInterceptors');
	})

	.factory('Api.service', ['$q', '$http', function ($q, $http) {
		var apiUrl = '/api';
		var service = {};

		var api =  new function () {
			var __request = function ($httpProm) {
				return $httpProm.then( function (resp) {
					return resp;
				})
			};

			this.get = function (path) {
				return __request($http.get(apiUrl + path))
			};

			this.post = function (path, data) {
				return __request($http.post(apiUrl + path, data));
			};

			this.delete = function (path) {
				return __request($http.delete(apiUrl + path))
			};

			this.put = function (path, data) {
				return __request($http.put(apiUrl + path, data || {}));
			}
		};

		service.$resolve = $q.resolve;
		service.$reject = $q.reject;

	////////////////// Admin //////////////////
		service.getLangCode = function () {
			return api.get('/langcodes');
		};

	////////////////// User //////////////////
		service.getUserById = function (id) {
			return api.get('/user/u/' + id);
		};

		service.getAllUsers = function () {
			return api.get('/user/list');
		};

		service.createUser = function (data) {
			return api.post('/user/create', data);
		};

		service.updateUser = function (data) {
			return api.post('/user/u/' + data._id, data);
		};

		service.deleteUser = function (id) {
			return api.delete('/user/u/' + id);
		};

	////////////////// Organizations //////////////////
		service.getOrgs = function () {
			return api.get('/org/list');
		};
		service.getCommonOrg = function () {
			return api.get('/org/getCommon');
		};
		service.getOrgById = function (id) {
			return api.get('/org/o/' + id);
		};

		service.createOrg = function (body) {
			return api.post('/org/create', body);
		};

		service.updateOrg = function (data) {
			return api.post('/org/o/' + data._id, data);
		};

		service.getOrgUsers = function (id, all) {
			var url = '/org/members/' + id + ((!!all) ? '?all=true' : '');
			return api.get(url);
		};

		service.addMembers = function (id, members) {
			return api.put('/org/members/' + id, members);
		};

		service.updateMembers = function (id, members) {
			return api.post('/org/members/' + id, members);
		};

		return service;
	}])

	.factory('User.service', ['Api.service', function (ApiSvc) {
		var service = {};

		var user = JSON.parse(__user__);

		service.getUser = function () {
			return angular.merge({}, user);
		};

		return service;
	}])

	.factory('errorInterceptors', ['$q', '$injector', function ($q, $injector) {
		var interceptor = {};
		interceptor.responseError = function (response) {
			console.log(response.status);

			if (response.status < 0 || response.status >= 500 || response.status == 404) {
				// redirect to error page
				$injector.get('$location').path('/404').search({err: response.status});
			} else if (response.status == 401) {
				// authentication lost, redirect to login
				window.location = '/login?path=/admin';
			}

			return $q.reject(response);
		};

		return interceptor;
	}])

	.factory('addUserModal', ['$route', '$uibModal', 'Api.service', function ($route, $uibModal, ApiSvc) {
		var service = {};

		var msgCache = null;

		var modal = true;

		var ctrl = ['$scope', 'Org', 'CommonOrg', 'Members', 'Users', function ($scope, Org, CommonOrg, Members, Users) {
			var vm = this;
			var waitingOnResp = false;

			vm.addExisting = null;
			vm.modal = true;

			vm.org = Org;
			vm.commonOrg = CommonOrg;
			vm.members = Members;
			vm.users = Users;

			vm.password = Math.random().toString(36).slice(2, 14);

			vm.close = $scope.$dismiss.bind(null, 'cancel');

			vm.isDisabled = function () {
				if (vm.addExisting == null) return true;

				if (vm.addExisting) {
					return vm.toAdd.length < 1;
				}
				else {
					return (!!vm.userForm) ? vm.userForm.$invalid : true;
				}
			};

			vm.submit = function () {
				var fn = null;
				waitingOnResp = true;

				if (vm.addExisting === true) {
					var toAdd = vm.toAdd.map( function (user) {
						return {
							_id: user._id,
							admin: user.isOrgAdmin || false,
							qc: user.isOrgQC || false
						}
					});
					fn = ApiSvc.addMembers(vm.org._id, toAdd);
				}
				else if (vm.addExisting === false) {
					var body = {};
					body.email = vm.userForm.email.$modelValue;
					body.username = vm.userForm.username.$modelValue;
					body.fullName = vm.userForm.fullName.$modelValue;
					body.organizations = [vm.org._id];
					body.currentOrg = vm.org._id;
					body.password = vm.password;

					fn = ApiSvc.createUser(body);
				}
				else {
					fn = ApiSvc.$reject('Something went wrong')
				}

				fn.then( function (resp) {
					waitingOnResp = false;
					msgCache = {success: 'Organization was successfully updated'};
					$scope.$close(true);
				})
				.catch( function (err) {
					waitingOnResp = false;
					msgCache = {error: err};
				})
			};

			$scope.$on('modal.closing', function (e) {
				if (waitingOnResp)
					e.preventDefault();
			});

			////////// Create New User Logic ////////
			vm.userTemplatePath = __templatePath + '/user.html';

			////////// Existing User Logic //////////
			vm.toAdd = [];

			vm.addUser = function (user) {
				if (user.added) return false;

				user.added = true;
				vm.toAdd.push(user);
			};

			vm.rmUser = function ($index) {
				vm.toAdd.splice($index, 1)[0].added = false;
			};

		}];

		service.openModal = function (scope, org, members, users) {
			msgCache = null;	// reset msgCache each time modal is opened

			modal = $uibModal.open({
				animation: false,
				templateUrl: __templatePath + '/addMember.html',
				controller: ctrl,
				controllerAs: '$modal',
				size: 'lg',
				resolve: {
					Org: function () { return scope.org || org; },
					CommonOrg: function () { return scope.commonOrg || org; },
					Members: function () { return scope.members || members; },
					Users: function () { return scope.users || users; }
				}
			});

			modal.result.then( function(val) {
				if (!!val) {
					$route.reload();
				}
			});
		};

		service.$routeReload = $route.reload;

		service.getCachedMsg = function () {
			return msgCache;
		};

		service.cacheMsg = function (msg) {
			msgCache = msg;
		};

		return service;
	}])

	.factory('deleteModal', ['$uibModal', function ($uibModal) {
		var service = {};

		var ctrl = ['$uibModalInstance', 'itemType', function ($uibModalInstance, itemType) {
			var vm = this;
			vm.itemType = itemType;

			vm.ok = function() {
				$uibModalInstance.close();
			};

			vm.cancel = function() {
				$uibModalInstance.dismiss();
			};
		}];

		service.openModal = function(itemType) {
			modal = $uibModal.open({
				animation: false,
				templateUrl: __templatePath + '/deleteModal.html',
				controller: ctrl,
				controllerAs: '$modal',
				size: 'md',
				resolve: {
					itemType: function() { return itemType }
				}
			});

			return modal.result;
		}

		return service;
	}])

	.directive('removalItem', [function () {
		return {
			restrict: 'C',
			requires: ['ngRepeat'],
			link: function (scope, elem, attrs) {
				scope.user.marked = scope.user.marked || false;

				scope.$watch('user.marked', function () {
					if (!!scope.user.marked) {
						elem.addClass('danger text-muted');
						elem.find('i').css('opacity', 0.6);
					}
					else {
						elem.removeClass('danger text-muted');
						elem.find('i').css('opacity', 1);
					}
				})
			}
		}
	}])

	.directive('rmOrgUser', function () {
		return {
			restrict: 'E',
			template: '<span title="Remove user from this organization"><div class="btn btn-sm btn-primary" ng-click="__rmOrgUser(user)"><i class="fa fa-fw fa-lg fa-trash text-danger i-btn" style="color:white;"></i></div></span>',
			scope: {
				'user': '=user',
				'form': '=form',
				'orgid': '=orgid'
			},
			link: function (scope, elem) {
				scope.user.marked = false;
				scope.user.__orgsToRemove = [];
				scope.form = scope.form || {$setDirty: angular.noop};

				scope.__rmOrgUser = function (user) {
					var tr = elem.parent().parent();

					if (!scope.user.marked) {
						tr.addClass('danger text-muted');
						tr.find('input').attr('disabled', 'true');
						tr.find('i').css('opacity', 0.6);
						elem.find('i').removeClass('fa-ban text-danger').addClass('fa-undo text-info');
						elem.find('span').attr('title', 'Undo remove user from this organization');

						scope.user.marked = true;
						scope.user.__orgsToRemove.push(scope.orgid);
						scope.form.$setDirty();		// causes the save button to "unable disable" once a user has been marked for removal
					}
					else {
						tr.removeClass('danger text-muted');
						tr.find('input').removeAttr('disabled');
						tr.find('i').css('opacity', 1);
						elem.find('i').removeClass('fa-undo text-info').addClass('fa-ban text-danger');
						elem.find('span').attr('title', 'Remove user from this organization');

						scope.user.marked = false;
						scope.user.__orgsToRemove.splice(scope.user.__orgsToRemove.indexOf(scope.orgid));
					}
				}
			}
		}
	})

	.directive('langSelect', function () {
		return {
			restrict: 'E',
			transclude: true,
			templateUrl:  __templatePath + '/langSelect.html',
			link: function ($scope, elem, attrs) {
				$scope.addLang = function (code) {
					if ($scope.org.langList.indexOf(code) == -1)
						$scope.org.langList.push(code);
				};

				$scope.rmLang = function (code) {
					var index = $scope.org.langList.indexOf(code);
					$scope.org.langList.splice(index, 1);
				};
			}
		};
	})

	.directive('filterControls', ['$location', function ($location) {
		return {
			restrict: 'C',
			requires: ['onFilterChange', 'filterFields'],
			templateUrl: __templatePath + '/filterControls.html',
			link: function ($scope, elem, attrs) {

				$scope.ctrls = {
					filterBy: '',
					filterValues: [],
					filter: '',
					searchFor: '',
					filterFields: $scope.$eval(attrs['filterFields'])
				};

				$scope.ctrls.setFilterValues = function () {
					var values = new Set();

					var arr = $scope.$eval(attrs['onFilterChange']);
					arr = (angular.isFunction(arr)) ? arr(this.filterBy) : arr;

					arr.forEach( function (item) {
						values.add(item);
					});

					this.filterValues = [...values];
				};

				var __ctrls = angular.copy($scope.ctrls);

				$scope.ctrls.clear = function () {
					$scope.ctrls = angular.extend(__ctrls);
				};
			}
		}
	}])

	.controller('admin-ctrl', ['$scope', '$location', function ($scope, $location) {
		var vm = this;

		$scope.$on('$routeChangeSuccess', function () {
			var loc = $location.path().slice(1);

			if (loc.indexOf('/') > 1)
				loc = loc.slice(0, loc.indexOf('/'));

			if (loc[loc.length - 1] != 's')
				loc += 's';

			vm.active = loc;
			//console.log(loc);
		});

		vm.currentUser = JSON.parse(__user__);
	}])

	.filter('dynamicField', ['$filter', function ($filter) {
		return function (items, query) {
			if (!query.field || !query.val) return items;

			var search = {};

			if (angular.isString(items[0][query.field])) {
				search[query.field] = query.val;
				return $filter('filter')(items, search);
			}

			else if (angular.isObject(items[0][query.field])) {
				search[query.field] = {$: query.val};
				return $filter('filter')(items, search);
			}

			else {
				return items;
			}
		}
	}])
})();
