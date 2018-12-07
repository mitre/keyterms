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
			controller: ['$scope', '$location', '$uibModal', 'Api.service', 'Glossary', 'CommonGlossary', 'Glossaries', function ($scope, $location, $uibModal, ApiSvc, Glossary, CommonGlossary, Glossaries) {
				$scope.user = {};
				$scope.user.password = Math.random().toString(36).slice(2, 14);
				$scope.user.glossaries = [CommonGlossary];
				$scope.user.currentGlossary = CommonGlossary;

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
				if (!!$location.search().glossary) {
					//$scope.user.glossary = $location.search().glossary;
					var index = Glossaries.map( function (glossary) { return glossary._id; }).indexOf($location.search().glossary);
					$scope.glossary = Glossaries[index];
					console.log('$scope.glossary: ', $scope.glossary); // test this
				}
			}]
			, resolve: {
				Glossary: ['User.service', function (UserService) {
					return UserService.getUser().currentGlossary;
				}],
				CommonGlossary: ['Api.service', function (ApiSvc) {
					return ApiSvc.getCommonGlossary()
					.then(function (res) {
						return res.data;
					});
				}],
				Glossaries: ['Api.service', function (ApiSvc) {
					return ApiSvc.getGlossaries()
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

					// Drop any glossaries marked for removal from user's glossary list
					var glossariesToKeep = [];
					data.glossaries.forEach(function(glossary) {
						if(data.__glossariesToRemove.indexOf(glossary._id) < 0) {
							glossariesToKeep.push(glossary);
						} else {
							// if this was the user's current or default glossary, reset those fields
							if(data.currentGlossary === glossary._id) {
								data.currentGlossary = null;
							}
							if(data.defaultGlossary === glossary._id) {
								data.defaultGlossary = null;
							}
						}
					});
					data.glossaries = glossariesToKeep;
					data.currentGlossary = (data.currentGlossary || data.glossaries[0]._id);	// if current glossary was reset, choose first valid glossary

					ApiSvc.updateUser(data)
					.then( function (resp) {
						$location.path('/users');
					});
				};

				$scope.isGlossaryAdmin = function (glossary) {
					return glossary.admins.indexOf($scope.user._id) != -1;
				};

				$scope.isGlossaryQC = function (glossary) {
					return glossary.qcs.indexOf($scope.user._id) != -1;
				};

				$scope.showGlossaryDeleteBtn = function (glossaryId) {
					return $scope.user.glossaries.length > 1 &&
						  ($scope.user.glossaries.length - $scope.user.__glossariesToRemove.length > 1 ||
						   $scope.user.__glossariesToRemove.indexOf(glossaryId) > -1);
				}

				$scope.back = function () {
					$location.path('/users');
				};

				// assign the User object to the form data model (to auto-populate form)
				$scope.user = User;
				$scope.user.__glossariesToRemove = [];

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
			controller: [ '$scope', '$location', '$route', '$uibModal', 'deleteModal', 'Api.service', 'Users', function ($scope, $location, $route, $uibModal, deleteModal, ApiSvc, Users) {
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

				if (!!$location.search().glossary) {
					$scope.users = $scope.users.filter( function (user) {
						return user.glossaries.indexOf($location.search().glossary) != -1;
					});
				}

				$scope.resetUserPassword = function (user) {
					var updatedUser = angular.copy(user);
					updatedUser.password = Math.random().toString(36).slice(2, 14);
					var modal = $uibModal.open({
						animation: false,
						templateUrl: __templatePath + '/resetPassword.html',
						controller: ['$scope', '$uibModalInstance', function (_scope, $uibModalInstance) {
							_scope.username = updatedUser.username;
							_scope.newPassword = updatedUser.password;
							_scope.status = 'pre';

							// prevents closing from outside clicks
							_scope.$on('modal.closing', function (event, reason) {
								if (reason == 'backdrop click')
									event.preventDefault();
							});

							_scope.submit = function () {
								ApiSvc.updateUser(updatedUser)
								.then( function(res) {
									_scope.status = 'success';
								})
								.catch( function(err) {
									_scope.status = 'error';
								});
							};

							_scope.close = function () {
								$uibModalInstance.dismiss();
							};
						}],
						size: 'md'
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
		.when('/glossary', {
			templateUrl: __templatePath + '/glossary.html',
			controller: ['$scope', '$location', '$sce', 'Api.service', 'LangCodes', function ($scope, $location, $sce, ApiSvc, LangCodes) {
				$scope.glossary = {
					langList: []
				};

				$scope.langCodes = LangCodes.codes;
				$scope.reference = LangCodes.reference;

				$scope.title = 'Create Glossary';
				$scope.button = 'Create';
				$scope.showUsers = false;

				$scope.submit = function () {
					ApiSvc.createGlossary(angular.copy($scope.glossary))
					.then( function (resp) {
						$location.path('/glossaries');
					});
				};

				$scope.globalBlockPopover = 'Prevent all Entries of this Glossary from being searchable by users outside of this Glossary';

				$scope.supportedPopoverText =
					$sce.trustAsHtml('A master list of all languages KeyTerms supports.<br><br>Add a language to this Glossary by clicking the <i class="fa fa-fw fa-plus text-success"></i>');

				$scope.glossaryPopoverText =
					$sce.trustAsHtml('These are the languages currently associated with this Glossary.<br><br>Remove a language from this Glossary by clicking the <i class="fa fa-fw fa-times text-danger"></i>');
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
		.when('/glossary/:id', {
			templateUrl: __templatePath + '/glossary.html',
			controller: ['$scope', '$location', '$sce', 'Api.service', 'Glossary', 'LangCodes', 'Users', function ($scope, $location, $sce, ApiSvc, Glossary, LangCodes, Users) {
				$scope.glossary = angular.merge({}, Glossary);
				$scope.users = Users;
				$scope.users.forEach( function (user) {
					if ($scope.glossary.qcs.indexOf(user._id) != -1) {
						user.qc = true;
					}

					if ($scope.glossary.admins.indexOf(user._id) != -1) {
						user.admin = true;
					}
				});

				$scope.langCodes = LangCodes.codes;
				$scope.reference = LangCodes.reference;

				$scope.title = 'Edit Glossary';
				$scope.button = 'Save Changes';

				$scope.userUpdate = function (user) {
					console.log('change fired');
					if (user.qc != undefined) {
						var qcIndex = $scope.glossary.qcs.indexOf(user._id);
						if (user.qc && qcIndex == -1) {
							// qc set to true and user is not currently in glossary qc list, add it
							$scope.glossary.qcs.push(user._id);
						}
						else if (!user.qc && qcIndex != -1) {
							// qc set to false and user is currently listed in glossary qc, remove them
							$scope.glossary.qcs.splice(qcIndex, 1);
						}
						// user.qc && qcIndex != -1	// do noting
						// !user.qc && qcIndex == -1	// do nothing
					}
					if (user.admin != undefined) {
						var adIndex = $scope.glossary.admins.indexOf(user._id);
						if (user.admin && adIndex == -1) {
							// admin set to true and user is not currently in glossary qc list, add it
							$scope.glossary.admins.push(user._id);
						}
						else if (!user.admin && adIndex != -1) {
							// admin set to false and user is currently listed in glossary qc, remove them
							$scope.glossary.admins.splice(adIndex, 1);
						}
						// user.admin && adIndex != -1	// do noting
						// !user.admin && adIndex == -1	// do nothing
					}
				};

				$scope.submit = function () {
					console.log($scope.glossary);
					//return;

					ApiSvc.updateGlossary(angular.copy($scope.glossary))
					.then( function (resp) {
						return ApiSvc.updateMembers($scope.glossary._id, $scope.users);
					})
					.then( function (resp) {
						$location.path('/glossaries');
					});
				};

				$scope.globalBlockPopover = 'Prevent all Entries of this Glossary from being searchable by users outside of this Glossary';

				$scope.supportedPopoverText =
					$sce.trustAsHtml('A master list of all languages KeyTerms supports.<br><br>Add a language to this Glossary by clicking the <i class="fa fa-fw fa-plus text-success"></i>');

				$scope.glossaryPopoverText =
					$sce.trustAsHtml('These are the languages currently associated with this Glossary.<br><br>Remove a language from this Glossary by clicking the <i class="fa fa-fw fa-times text-danger"></i>');
			}]
			, resolve: {
				Glossary: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getGlossaryById($route.current.params.id)
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
					return ApiSvc.getGlossaryUsers($route.current.params.id)
					.then( function (res) {
						return res.data;
					})
				}],
			}
		})
		.when('/glossary/:id/manage', {
			templateUrl: __templatePath + '/manageUsers.html',
			controller: ['$scope', '$location', '$timeout', 'Api.service', 'addUserModal', 'Glossary', 'CommonGlossary', 'Users',
			function ($scope, $location, $timeout, ApiSvc, addUserModal, Glossary, CommonGlossary, Users) {
				$scope.glossary = Glossary;
				$scope.commonGlossary = CommonGlossary;
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
					ApiSvc.updateMembers(Glossary._id, $scope.members)
					.then( function (resp) {
						addUserModal.cacheMsg({success: 'Glossary was successfully updated'});
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
				Glossary: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getGlossaryById($route.current.params.id)
					.then( function (res) {
						return res.data;
					})
				}],
				CommonGlossary: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getCommonGlossary()
					.then( function (res) {
						return res.data;
					})
				}],
				Users: ['$route', 'Api.service', function ($route, ApiSvc) {
					return ApiSvc.getGlossaryUsers($route.current.params.id, true)
					.then( function (res) {
						return res.data;
					})
				}],
			}
		})
		.when('/glossaries', {
			templateUrl: __templatePath + '/glossaries.html',
			controller: function ($scope, Glossaries) {
				$scope.glossaries = Glossaries;

				$scope.filterChange = function (field) {
					return Glossaries.map( function (glossary) {
						return glossary[field].name || glossary[field];
					});
				};

				$scope.filterFields = [
					{val: 'name', view: 'Name'},
					{val: 'abbreviation', view: 'Abbreviation'}
				];
			}
			, resolve: {
				Glossaries: ['Api.service', function (ApiSvc) {
					return ApiSvc.getGlossaries()
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

	////////////////// Glossaries //////////////////
		service.getGlossaries = function () {
			return api.get('/glossary/list');
		};
		service.getCommonGlossary = function () {
			return api.get('/glossary/getCommon');
		};
		service.getGlossaryById = function (id) {
			return api.get('/glossary/g/' + id);
		};

		service.createGlossary = function (body) {
			return api.post('/glossary/create', body);
		};

		service.updateGlossary = function (data) {
			return api.post('/glossary/g/' + data._id, data);
		};

		service.getGlossaryUsers = function (id, all) {
			var url = '/glossary/members/' + id + ((!!all) ? '?all=true' : '');
			return api.get(url);
		};

		service.addMembers = function (id, members) {
			return api.put('/glossary/members/' + id, members);
		};

		service.updateMembers = function (id, members) {
			return api.post('/glossary/members/' + id, members);
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

		var ctrl = ['$scope', 'Glossary', 'CommonGlossary', 'Members', 'Users', function ($scope, Glossary, CommonGlossary, Members, Users) {
			var vm = this;
			var waitingOnResp = false;

			vm.addExisting = null;
			vm.modal = true;

			vm.glossary = Glossary;
			vm.commonGlossary = CommonGlossary;
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
							admin: user.isGlossaryAdmin || false,
							qc: user.isGlossaryQC || false
						}
					});
					fn = ApiSvc.addMembers(vm.glossary._id, toAdd);
				}
				else if (vm.addExisting === false) {
					var body = {};
					body.email = vm.userForm.email.$modelValue;
					body.username = vm.userForm.username.$modelValue;
					body.fullName = vm.userForm.fullName.$modelValue;
					body.glossaries = [vm.glossary._id];
					body.currentGlossary = vm.glossary._id;
					body.password = vm.password;

					fn = ApiSvc.createUser(body);
				}
				else {
					fn = ApiSvc.$reject('Something went wrong')
				}

				fn.then( function (resp) {
					waitingOnResp = false;
					msgCache = {success: 'Glossary was successfully updated'};
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

		service.openModal = function (scope, glossary, members, users) {
			msgCache = null;	// reset msgCache each time modal is opened

			modal = $uibModal.open({
				animation: false,
				templateUrl: __templatePath + '/addMember.html',
				controller: ctrl,
				controllerAs: '$modal',
				size: 'lg',
				resolve: {
					Glossary: function () { return scope.glossary || glossary; },
					CommonGlossary: function () { return scope.commonGlossary || glossary; },
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

	.directive('rmGlossaryUser', function () {
		return {
			restrict: 'E',
			template: '<span title="Remove user from this Glossary"><div class="btn btn-sm btn-primary" ng-click="__rmGlossaryUser(user)"><i class="fa fa-fw fa-lg fa-trash text-danger i-btn" style="color:white;"></i></div></span>',
			scope: {
				'user': '=user',
				'form': '=form',
				'glossaryid': '=glossaryid'
			},
			link: function (scope, elem) {
				scope.user.marked = false;
				scope.user.__glossariesToRemove = [];
				scope.form = scope.form || {$setDirty: angular.noop};

				scope.__rmGlossaryUser = function (user) {
					var tr = elem.parent().parent();

					if (!scope.user.marked) {
						tr.addClass('danger text-muted');
						tr.find('input').attr('disabled', 'true');
						tr.find('i').css('opacity', 0.6);
						elem.find('i').removeClass('fa-ban text-danger').addClass('fa-undo text-info');
						elem.find('span').attr('title', 'Undo remove user from this Glossary');

						scope.user.marked = true;
						scope.user.__glossariesToRemove.push(scope.glossaryid);
						scope.form.$setDirty();		// causes the save button to "unable disable" once a user has been marked for removal
					}
					else {
						tr.removeClass('danger text-muted');
						tr.find('input').removeAttr('disabled');
						tr.find('i').css('opacity', 1);
						elem.find('i').removeClass('fa-undo text-info').addClass('fa-ban text-danger');
						elem.find('span').attr('title', 'Remove user from this Glossary');

						scope.user.marked = false;
						scope.user.__glossariesToRemove.splice(scope.user.__glossariesToRemove.indexOf(scope.glossaryid));
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
					if ($scope.glossary.langList.indexOf(code) == -1) {
						$scope.glossary.langList.push(code);
						$scope.glossaryForm.$setDirty();
					}
				};

				$scope.rmLang = function (code) {
					var index = $scope.glossary.langList.indexOf(code);
					$scope.glossary.langList.splice(index, 1);
					$scope.glossaryForm.$setDirty();
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
