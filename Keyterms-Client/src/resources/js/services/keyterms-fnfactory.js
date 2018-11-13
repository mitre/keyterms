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

/****
 *	The purpose of this service is to provide a factory of generic functions that are
 * 	used across multiple controllers. This will eliminate the need to define the same
 *	function multiple times.
 *
 *	As a convention, any function using "$this" is using a reference to the $scope object.
 *  Any function using "self" is using a reference to itself (assuming it's an object).
 *
 *	Some functions are designed to simple be assigned to the $scope object of the controller
 *	Example: 	$scope.setPage = genericButtons.pagination.setPage;
 *
 *	Other functions take the $scope object as an argument and return an object or function.
 *  The scope is passed so methods inside the returned object have access to the $scope object.
 *	Example: 	$scope.selectAllBtn = genericButtons.controlButtons.selectAllBtn($scope);
***/

app.factory('keyterms.fnFactory', ['$q', '$location', '$uibModal', 'keytermsClient.service', 'globals', 'uiToast',
function ($q, $location, $uibModal, KeytermsClientInt, globals, uiToast) {
	// private variables here

	var promiseQueue = function (list, promFn) {
            var chain = $q.resolve();
            var arr = [];

            list.forEach(function (item) {
                chain = chain.then(function () {
                    return promFn(item)
                        .then( function () {
                            arr.push(item);
                        })
                        .catch(function (err){
                            return null;
                        })

                });
            });

        return chain.then(function () {
            return arr;
        }).catch(function (err) {
            console.log(err);
            return $q.reject('promiseQueue failed');
        });
    };

	//////////////////////////////////////////////////////////////////////////////////////////

	// public variable/methods here
	var service = {};

	//////////////////////////////// control buttons ////////////////////////////////////
	service.controlButtons = {};
	var cb = service.controlButtons;

	// returns an object to be assigned to the controller's $scope
	cb.selectAllBtn = function (scope) {
		return {
			name: 'Select All',
			select: true,
			onClick: function () {
				var self = this;
				var list = 'filteredResults' in scope ? scope.filteredResults : scope.searchResults;

				list.forEach(function (item) {
					item.checkVal = self.select;
				});
				self.select = !self.select;
				self.name = self.select ? 'Select All' : 'De-select All';
			}
		};
	};

    cb.anyChecked = function (scope) {
        return function () {
            var list = 'filteredResults' in scope ? scope.filteredResults : scope.searchResults;

            // If we've got any filtered or search results...
            if (list.length > 0) {
            	// Return true if the list of results filtered by checkVal has any items
                return list.filter(l => l.checkVal).length > 0;
            } else {
            	// If we've got no filtered or search results return false always
                return false;
            }
        }
    };

	cb.openBulkDeleteModal = function (scope, pathOnEmpty) {
		// arg can be either the index of an single element to be deleted
		// or a reference to an array of items to be deleted;
		return function (arg, isApproveOnly) {

			var selected = [];

			if (arg !== undefined && Number.isInteger(arg)) {
				// arg is a number, therefore single deletion
				selected.push(scope.filteredResults[arg]);
			} else {
				selected = scope.filteredResults.filter(item => !!item.checkVal);
			}

			uiToast.setLimit(1);
			var modalInstance = $uibModal.open({
				animation: false,
				templateUrl: 'resources/templates/modals/bulkdelete.html',
				controller: ['$scope', '$uibModalInstance', '$location', 'user.service', 'selected', function ($scope, $uibModalInstance, $location, User, selected) {
					$scope.bulk = selected.length > 1 ? 'Bulk' : '';
					var isGlossaryQC = User.getUser().isGlossaryQC;
					$scope.isGlossaryQC = isGlossaryQC;
					$scope.isApproveOnly = isApproveOnly;
					$scope.selected = selected;

					$scope.ok = function (isNom) {
						$scope.spinner = true;
						$scope.resStatus = 'pending';

						var fn = KeytermsClientInt.deleteEntry;

						if (isNom) {
							fn = function (arg) {
								// Dismiss the modal so the entry does not get filtered out of the search results.
								$uibModalInstance.dismiss();
								return KeytermsClientInt.createNomination(null, arg)
								.then( function () {
									uiToast.trigger('Successfully nominated deletion');
								});
							};
						}

						promiseQueue(selected.map(e => e._id), fn)
						.then(function (res) {
							$scope.resStatus = 'success';
							$uibModalInstance.close(res);
						})
						.catch(function (err) {
							$scope.resStatus = 'error';
						});
					};

					$scope.cancel = function () {
						$uibModalInstance.dismiss();
					};

                    $scope.isCorrectGlossary = function () {

                        for (var index in $scope.selected) {
                            if($scope.selected[index].glossary._id !== User.getUser().currentGlossary) {

                                return false;
                            }
                        }
                        return true;
                    };

                    $scope.$on('modal.closing', function(e, reason){
                        //if (!reason) return false;

                        console.log(reason);
                        switch(reason){
							case 'dismiss-all':
                                e.preventDefault();
                                break;
                            default:
                                break;
						}
					});
				}],
				size: 'lg',
				resolve: {
					selected: function () {
						return selected;
					}
				}
			});

			modalInstance.result.then(function (res) {
				scope.searchResults = scope.searchResults.filter(e => res.indexOf(e._id) === -1);

				if (scope.searchResults.length < 1) {
					$location.path(pathOnEmpty || '/search');
				}
				else {
					scope.resetPagination();
				}
			})
			.catch(function (err) {
				return 1;
			})
			.finally( function () {
				uiToast.setLimit(uiToast.DEFAFULT_LIMIT);
			});

		};
	};

    cb.exportSelected = function (scope) {
        return function () {
            var selected = scope.filteredResults.filter(item => !!item.checkVal);
			var exportUrl = apiUrl + 'api/download/selected?entries=' + selected.map(item => item._id).join();
            window.location.assign(exportUrl);
        };
    };

	cb.openBulkTagModal = function (scope) {
		return function (isApproveOnly) {

            uiToast.setLimit(1);
			var modalInstance = $uibModal.open({
				animation: false,
				templateUrl: 'resources/templates/modals/bulktag.html',
				controller: ['$scope', '$uibModalInstance', 'user.service', 'Entries', function ($scope, $uibModalInstance, User, Entries) {

					$scope.entries = Entries;
					$scope.tagData = {
						toAdd: [],
						tagText: ''
					};
					$scope.isApproveOnly = isApproveOnly;
					$scope.isGlossaryQC = User.getUser().isGlossaryQC;

					// finds the intersection between all the selected Entry's tags
					if (Entries.length >= 2) {
						var entryTags = Entries.map(e => e.tags);
						entryTags = entryTags.map(tagList => tagList.map(tag => tag.content));
						console.log(entryTags);
						$scope.tagIntersection = entryTags.shift().filter(t1 => entryTags.every(t2 => t2.indexOf(t1) !== -1));
						console.log($scope.tagIntersection);
						console.log(Entries);
					} else if (Entries.length === 1) {
						$scope.tagIntersection = Entries[0].tags.map(tag => tag.content);
					} else {
						$scope.tagIntersection = [];
					}

					$scope.cslRegex = /^(?:\w|\d| )+(?:, ?(?:\w|\d|(?: \w)|(?: \d) )+)*$/;
					$scope.addTags = function () {
						var input = $scope.tagData.tagText;
						$scope.tagData.tagText = '';
						var tags = input.split(',').map(tag => tag.trim());
						tags = tags.filter(t => $scope.tagIntersection.indexOf(t) === -1);
						$scope.tagData.toAdd = $scope.tagData.toAdd.concat(tags);
					};

					$scope.removeTag = function (index) {
						$scope.tagData.toAdd.splice(index, 1);
					};

                    $scope.isCorrectGlossary = function () {

                        for (var index in $scope.entries) {
                            if($scope.entries[index].glossary._id !== User.getUser().currentGlossary) {

                                return false;
                            }
                        }
                        return true;
                    };

					$scope.ok = function () {
						$scope.spinner = true;
						$scope.resStatus = 'pending';

						var tags = $scope.tagData.toAdd;
                        var list = [];

						var tagWrapper = function (item) {
							return KeytermsClientInt.tagEntry(item.tag, item.entry)
                            .then(function (response) {
                                return response;
                            });
                        };

						Entries.forEach(function (entry) {
							tags.forEach(function (tag) {
                                var item = {};
								item.tag = tag;
								item.entry = entry._id;
                                list.push(item);
							});
						});

						promiseQueue(list, tagWrapper)
						.then(function (res) {

                            $scope.resStatus = 'success';

                            if(res.length > 0 ) {
                                uiToast.trigger('Entries successfully tagged');
                            }

                            $uibModalInstance.close();
						}).catch(function (err) {
							$scope.resStatus = 'error';
						});
					};

					$scope.cancel = function () {
						$uibModalInstance.dismiss();
					};
				}],
				size: 'lg',
				resolve: {
					Entries: function () {
						return scope.filteredResults.filter(item => item.checkVal);
					}
				}
			});

			modalInstance.result.then(function (res) {

			})
			.finally( function () {
				uiToast.setLimit(uiToast.DEFAFULT_LIMIT);
			});

		};
	};

	/////////////////////////////////// pagination methods ///////////////////////////////
	service.pagination = {};
	var pg = service.pagination;

	// calculates the number of pages needed to display every item
	pg.pageCount = function () {
		var $this = this;
		return Math.ceil($this.searchResults.length / $this.itemsPerPage);
	};

	// pagination navigation handler
	// This executes BEFORE the page has been changed
	pg.setPage = function (pageNo) {
		var $this = this;
		$this.currentPage = pageNo;
	};

	// reset pagination variables so new search results will be displayed
	pg.resetPagination = function (override) {
		override = !override ? angular.noop : override;

		var $this = this; // analogous to $scope
		$this.paginationWatcher = $this.paginationWatcher ? $this.paginationWatcher : angular.noop;
		$this.paginationWatcher(); // clears current pagination watcher

		// resets pagination values to defaults
		$this.filteredResults = [];
		$this.totalItems = $this.searchResults.length;
		$this.currentPage = 1;
		$this.itemsPerPage = 10;

		override.call($this);	// allow for customized logic in controllers, if needed

		var changePage = function () {
			if ($this.currentPage < 1) { return $this.resetPagination(); }

			var begin = ($this.currentPage - 1) * $this.itemsPerPage;
			var end = begin + $this.itemsPerPage;

			$this.filteredResults = $this.searchResults.slice(begin, end);
		};

		$this.paginationWatcher = $this.$watch('currentPage + itemsPerPage', function () {
			changePage();
		});

		// initialize pagination
		changePage();
	};

	////////////////////////////////// navigation methods ///////////////////////////////
	service.navigation = {};
	var nav = service.navigation;

	nav.viewEntry = function (id) {
		$location.path('/viewentry/' + id);
	};

	return service;
}]);
