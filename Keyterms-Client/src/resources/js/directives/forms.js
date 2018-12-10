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

app.directive('termForm', ['components.term', '$uibModal',
	function (Term, $uibModal) {
		return {
			restrict: 'E',
			scope: {
				entryData: '=entry'
			},
			templateUrl: 'resources/templates/widgets/termForm.html',
			controller: function ($scope) {
				$scope.termHint = '';
				$scope.count = 0;

				var dupCheck = function (localScope, index) {
					localScope = localScope || $scope;

					return $scope.entryData.terms.some( function (term, j) {
						if (j != index && term.termText === localScope.termData.termText && term.langCode.value === localScope.termData.langCode.value) {

                                localScope.termHint = 'No duplicate terms allowed';
                                return true;
						}
						else {
							localScope.termHint = '';
							return false;
						}
					})
				};

				var isTermValid = function (localScope) {
					return !(!($scope.termData.langCode) || !($scope.termData.termText) || dupCheck(localScope));
				};

				$scope.isTermValid = function () {
					// if (!$scope.termData.langCode || !$scope.termData.termText || dupCheck()) {
					// 	return false;
					// } else return true;

					return isTermValid($scope);
				};

				$scope.addTerm = function () {
					if (!$scope.isTermValid()) { return; }

					$scope.entryData.lastLangCode = $scope.termData.langCode;
					$scope.entryData.lastTermVariety = $scope.termData.variety;
					$scope.entryData.terms.push($scope.termData);
					$scope.termData = $scope.reset();

					//Clear out the term population after we add the first term
					$scope.entryData.termPopulate = undefined;
				};

				$scope.resetDefaults = function () {
					var term = Term.getDefault();
					term.langCode = $scope.entryData.lastLangCode || term.langCode;
					term.variety = $scope.entryData.lastTermVariety || null;

					return term;
				};

				$scope.makeLabel = function (index) {
					// Toggle the isLabel for the term @ index. Set all other terms' isLabel to false
					$scope.entryData.terms.forEach((t, i) => t.isLabel = i === index ? !t.isLabel : false);
				};

				$scope.removeTerm = function (index) {
					var term = $scope.entryData.terms[index];
					var links = [];

					// iterate through list of Term Links to ensure the Term being deleted isn't linked to any other Terms
					$scope.entryData.termLinks.forEach(function (link, i) {
						// link.lhs and link.rhs can be either a index value, or an object at this point
						// therefore link._lhsIndex and link._rhsIndex must be checked as well
						if (link.lhs === index || link._lhsIndex === index || link.rhs === index || link._rhsIndex === index) {
							link.i = i;			// store the index of the link within entry.termLinks (different from parameter index)
							links.push(link);
						}
					});

					// if no links were pushed, then the Term in question doesn't belong to any Term Links
					if (links.length < 1) {
						$scope.entryData.terms.splice(index, 1);
					} else {
						var modalInstance = $uibModal.open({
							animation: false,
							templateUrl: 'resources/templates/modals/removeTerm.html',
							controller: function ($scope, $uibModalInstance) {
								$scope.term = term;
								$scope.links = links;

								$scope.close = function (wasConfirmed) {
									$uibModalInstance.close(wasConfirmed);
								};
							},
							size: 'lg'
						});

						modalInstance.result.then(function (wasConfirmed) {
							if (wasConfirmed) {
								$scope.entryData.terms.splice(index, 1);
								links.forEach(function (link) {
									$scope.entryData.termLinks.splice(link.i, 1);
								});
							}
							console.log($scope.entryData);
						});
					}
				};

				$scope.editTerm = function ($index) {
					var term = $scope.entryData.terms[$index];

					var nlpWarning = false;
					var linkageWarning = false;

					term.isEdit = term.isEdit ? term.isEdit : false;
					$scope.entryData.termLinks.forEach(link => {
						if (link._lhsIndex === $index || link.lhs === $index) {
							var rhsSrc = (!!link.rhs.src) ? link.rhs.src
								: ($scope.entryData.terms[link._rhsIndex].src || null);

							if (rhsSrc === 'nlp') {
								nlpWarning = true;
							}
							else {
								linkageWarning = true;
							}
						}
						else if (link._rhsIndex === $index || link.rhs === $index) {
							linkageWarning = true;
						}
					});

					var $ctrl = ['$scope', '$uibModalInstance', function ($modal, $uibModalInstance) {
						$modal.term = term;
						$modal.termData = angular.copy($modal.term);
						$modal.termHint = '';
						$modal.showNlpWarning = nlpWarning;
						$modal.showLinkageWarning = linkageWarning;

						$modal.test = $scope.entryData.termLinks;

						// $modal.isTermValid = function () {
						// 	return isTermValid($modal);
						// };

						$modal.save = function () {
							if (!dupCheck($modal, $index)) {
                                if(term.src === 'nlp'){

                                    $modal.termData.isEdit = true;
                                }
								$uibModalInstance.close($modal.termData);
							}
						};

						$modal.close = function () {
							$uibModalInstance.dismiss();
						};
					}];

					var modalInstance = $uibModal.open({
						animation: false,
						templateUrl: 'resources/templates/modals/editTerm.html',
						controller: $ctrl,
						size: 'lg'
					});

					modalInstance.result.then( function (changes) {
						angular.extend(term, changes);
					});
				};

				if ( $scope.entryData.termPopulate !== undefined ) {
					$scope.termData = angular.extend({}, $scope.entryData.termPopulate);
				} else {
					$scope.termData = $scope.resetDefaults();
				}
			},
			link: function( $scope, elem, attrs ) {
				// stores last lang code value, so that does not cleared
				// each time a term is entered by the user
				$scope.reset = function () {
					elem.find('input')[0].focus();
					return $scope.resetDefaults();
				};

				$scope._formOnly = attrs['formOnly'] || false;
			}
		};
	}]);

app.directive('termlinkForm', ['components.termlink', 'globals',
	function (TermLink, globals) {
		return {
			restrict: 'E',
			scope: {
				entryData: '=entry'
			},
			templateUrl: 'resources/templates/widgets/termlinkForm.html',
			controller: function ($scope) {
				// Function to check if any dups exist. Returns true/false
				var dupCheck = function () {
					return $scope.entryData.termLinks.some( function (link, j) {
						if (link._lhsIndex === $scope.linkData._lhsIndex &&
							link._rhsIndex === $scope.linkData._rhsIndex &&
							angular.equals(link.relationType, $scope.linkData.relationType)) {
							return true;
						}
						else { return false; }
					})
				};
				// Utility to function to cause the "flashing effect" on the term to draw the User's focus

				$scope.globals = globals;
				$scope.linkData = TermLink.getDefault();
				$scope.linkDefaults = TermLink.getDefault();
				$scope.termHighlight = {};

				$scope.hint = '';

				$scope.equals = angular.equals;
				$scope.addLink = function () {
					var d = $scope.linkData;

					if (!$scope.isLinkValid()) { return false; }

					d.lhs = $scope.entryData.terms[d._lhsIndex];
					d.rhs = $scope.entryData.terms[d._rhsIndex];
					$scope.entryData.termLinks.push($scope.linkData);
					$scope.linkData = TermLink.getDefault();
					// alerts the drag-n-drop directive to reset the drag bins once a link has been added
					$scope.$broadcast('termLinkAdded');
				};

				$scope.removeLink = function (link) {
					var index = $scope.entryData.termLinks.findIndex(l => angular.equals(l, link));
					if (index > -1) {
						$scope.entryData.termLinks.splice(index, 1);
					}
				};

				$scope.isLinkValid = function () {
					var link = $scope.linkData;
					var defaults = $scope.linkDefaults;

					if (!link._lhsIndex || !link._rhsIndex) { return false; }

					if (link._lhsIndex === link._rhsIndex) {
						$scope.hint = 'Terms cannot be linked to themselves';
						return false;
					}

					// check if that link has already been added
					if (dupCheck())
					{
						$scope.hint = 'No duplicate links allowed';
						return false;
					}

					// reset $scope.hint, since at this point lhs != rhs
					$scope.hint = '';

					return !(!link.relationType || angular.equals(link, defaults));
				}
			}
		};
	}]);

app.directive('tagForm', [ function () {
	// Regex objects are expensive to create, therefore create it once for all instances of this directive
	var _cslRegex = /^(?:\w|\d| )+(?:, ?(?:\w|\d|(?: \w)|(?: \d) )+)*$/;

	return {
		restrict: 'E',
		scope: {
			entryData: '=entry'
		},
		templateUrl: 'resources/templates/widgets/tagForm.html',
		controller: ['$scope', function ($scope) {
			$scope.tagInput = '';
			$scope.cslRegex = _cslRegex;
			$scope.options = [];

			$scope.addTags = function () {
				var input = $scope.tagInput;
				$scope.tagInput = '';
				// TODO: prevent dupes!
				var tags = input.split(',').map(tag => tag.trim());

				$scope.entryData.tags = $scope.entryData.tags.concat(tags);
				//-------------------------------------------------------------------------------------------------------------------------------------------------------
				//-------------------------------------------------------------------------------------------------------------------------------------------------------
				//-------------------------------------------------------------------------------------------------------------------------------------------------------
			};

			$scope.removeTag = function (index) {
				$scope.entryData.tags.splice(index, 1);
			};

		}]
	};
}]);

app.directive('noteForm', ['components.note', 'globals',
	function (Note, globals) {
		return {
			restrict: 'E',
			scope: {
				entryData: '=entry'
			},
			templateUrl: 'resources/templates/widgets/noteForm.html',
			link: function ($scope, elem, attrs) {
				$scope.globals = globals;
				$scope.noteData = Note.getDefault();

				$scope.addNote = function () {
					$scope.entryData.notes.push($scope.noteData);
					$scope.noteData = Note.getDefault();
				};

				$scope.removeNote = function (index) {
					$scope.entryData.notes.splice(index, 1);
				};
			}
		};
	}]);

app.directive('entrySubmit', ['$route', '$uibModal', 'globals', 'keytermsClient.service', 'keyterms.fnFactory', 'user.service',
	function ($route, $uibModal, globals, KeytermsClientInt, fnFactory, UserSvc) {
		return {
			restrict: 'E',
			scope: {
				entryData: '=entry',
				nav: '=nav',
				entryForm: '=entryForm',
			},
			templateUrl: 'resources/templates/widgets/entrySubmit.html',
			controller: ['$scope', function ($scope) {
				$scope.globals = globals;

				$scope.showApproverComments = false;
				$scope.commentsLinkText = 'Add Approver Comments';

				$scope.toggleApproverComments = function() {
					$scope.commentsLinkText = $scope.showApproverComments ? 'Add Approver Comments' : 'Hide Approver Comments';
					$scope.showApproverComments = !$scope.showApproverComments;
				}

				$scope.commentsTooltip = 'Comments are only visible within the Nomination workflow. ' +
					"This field is ignored if 'Nominate' is not selected";

				$scope.comments = '';

				$scope.cancel = $route.reload;

				// initialize list of possible edit scopes
				$scope.editScopes = globals.editScopeList.slice().map(item => {
					item.disabled = false;
					return item;
				});

				// initialize list of possible view scopes
				$scope.viewScopes = globals.viewScopeList.slice().map(item => {
					item.disabled = false;
					return item;
				});

				var clearDisables = function () {
					$scope.editScopes.forEach(edit => edit.disabled = false);
					$scope.viewScopes.forEach(view => view.disabled = false);
				};

				var compareScopes = function () {
					if (!$scope.entryData.editScope || !$scope.entryData.viewScope) {
						return false;
					}

					var editScope = $scope.entryData.editScope;
					var viewScope = $scope.entryData.viewScope;

					// Edit Scope cannot be great than the View Scope
					if (editScope.comparison > viewScope.comparison) {
						return false;
					}

					// View Scope cannot be less than the Edit Scope
					if (viewScope.comparison < editScope.comparison) {
						return false;
					}

					return true;
				};

				$scope.updateEditScope = function (val) {
					$scope.entryForm.$setDirty();

					// ignore selection if val is disabled (not an allowed value)
					if (val.disabled) { return false; }

					// set editScope to new value
					$scope.entryData.editScope = val;

					var compare = !!$scope.entryData.viewScope ? $scope.entryData.viewScope.comparison : Infinity;
					if (val.comparison > compare) {
						// Edit Scope cannot be great than the View Scope
						$scope.entryData.viewScope = null;
					}

					// clear all "item.disabled = true" from both scope lists
					clearDisables();

					if (!$scope.entryData.viewScope) {
						// restrict possible values for viewScope based on new editScope selection
						$scope.viewScopes.forEach( view => {
							if (view.comparison < val.comparison) {
								view.disabled = true;
							}
						});
					}
				};

				$scope.updateViewScope = function (val) {
					$scope.entryForm.$setDirty();

					if (val.disabled) { return false; }

					// set viewScope to new value
					$scope.entryData.viewScope = val;

					var compare = !!$scope.entryData.editScope ? $scope.entryData.editScope.comparison : -Infinity;
					if (val.comparison < compare) {
						// View Scope cannot be less than the Edit Scope
						$scope.entryData.editScope = null;
					}

					// clear all "item.disabled = true" from both scope lists
					clearDisables();

					if (!$scope.entryData.editScope) {
						// restrict possible values for editScope based on new viewScope selection
						$scope.editScopes.forEach( edit => {
							if (edit.comparison > val.comparison) {
								edit.disabled = true;
							}
						});
					}
				};

				$scope.updateEntryType = function (val) {
					$scope.entryForm.$setDirty();

					$scope.entryData.type = val;
				};

				$scope.isValid = function () {
					return compareScopes() && $scope.entryData.terms.length > 0;
				};

				$scope.canNominate = function () {
					var ent = $scope.entryData;
					var usr = UserSvc.getUser();

					var viewScope = $scope.entryData.viewScope.value;


					if (!!ent._id && !!ent.glossary) {
						return viewScope === 'any' ||
							(viewScope === 'glossary' && usr.currentGlossary === ent.glossary);
					}
					else {
						return viewScope === 'any' || viewScope === 'glossary';
					}
				};

				$scope.canApprove = function () {
					var ent = $scope.entryData;

					// return true;
					var usr = UserSvc.getUser();

					if (usr.isGlossaryQC) {
						return true;
					}

					return !!ent.viewScope && ent.viewScope.value === 'me';

				};

				var onSubmitModal = function (entryData, requestFn, isNom) {

					var nomFlag = isNom === undefined ? false : isNom;

					var modalCtrl = function ($modal, $injector, $timeout, $uibModalInstance) {
						// $modal == $scope for the modal

						$modal.resStatus = 'pending';
						$modal.isNom = nomFlag;
						$modal.isNew = !entryData._id;

						var submitRequest = function () {
							requestFn(entryData).then(function (doc) {
								$modal.resStatus = 'success';
								$modal.doc = doc;
							})
							.catch(function (err) {
								$modal.resStatus = 'error';
								console.log(err);

								$timeout(modalInstance.dismiss, 1000);
							});
						};

						$modal.$on('modal.closing', function (e, reason) {
							if (!reason) { return false; }

							switch (reason) {
								case 'backdrop click':
									e.preventDefault();
									break;
								case 'viewEntry':
									var entryId = isNom ? $modal.doc.originalEntry : $modal.doc._id;
									$injector.get('$location').path('/viewentry/' + entryId);
									break;
								case 'viewNom':
									$injector.get('$location').path('/approvals/review/' + $modal.doc._id);
									break;
								case 'continueEditing':
									$injector.get('$route').reload();
									break;
								case 'createEntry':
									$injector.get('$location').url('/addentry');
									$injector.get('$route').reload();
									break;
								default:
									alert('odd modal closing value');
							}
						});

						// dismisses the modal if the location changes
						$modal.$on('$locationChangeStart', function (e) {
							modalInstance.dismiss();
						});

						$modal.dismiss = $uibModalInstance.dismiss;

						modalInstance.rendered.then($timeout.bind(null, submitRequest, 1500));
					};

					var modalInstance = $uibModal.open({
						animation: false,
						templateUrl: 'resources/templates/modals/createEntry.html',
						controller: ['$scope', '$injector', '$timeout', '$uibModalInstance', modalCtrl]
					});
				};

				$scope.submitEntry = function (isNom, isDraft) {
					// Set the isDraft bool on the object
					$scope.entryData.isDraft = isDraft !== undefined ? isDraft : false;

					// clean the entryData object
					var entryObj = angular.copy($scope.entryData);
					entryObj.termLinks.forEach(link => {
						link.lhs = link._lhsIndex;
						link.rhs = link._rhsIndex;
						delete link._rhsIndex;
						delete link._lhsIndex;
					});

					var nomFlag = isNom === undefined || isNom;

					var _requestFn = angular.noop;

					if (nomFlag) {
						// if nomination
						entryObj._comments = $scope.comments === '' ? undefined : $scope.comments;
						_requestFn = KeytermsClientInt.createNomination;
					}
					else if (!!$scope.entryData._id) {
						// if edit/update submission
						_requestFn = KeytermsClientInt.updateEntry;
					}
					else {
						// if new entry submission
						_requestFn = KeytermsClientInt.createEntry;
					}

					var requestFn = function () {
						return _requestFn
						.apply(null, arguments)
						.then( function (result) {
							$scope.entryForm.$setPristine();

							return result;
						});
					};

					onSubmitModal(entryObj, requestFn, nomFlag);
				};

				$scope.editDraft = function () {
					// clean the entryData object
					var entryObj = angular.copy($scope.entryData);
					entryObj.termLinks.forEach(link => {
						link.lhs = link._lhsIndex;
						link.rhs = link._rhsIndex;
						delete link._rhsIndex;
						delete link._lhsIndex;
					});

					onSubmitModal(entryObj, KeytermsClientInt.updateEntry);
				};

				var confirmationModal = function (action) {
					var modalInstance = $uibModal.open({
						animation: false,
						templateUrl: 'resources/templates/modals/saveDraft.html',
						controller: ['$scope', '$uibModalInstance', function (scope, $uibModalInstance) {
							scope.title = action.title;
							scope.confirmationBtn = action.confirmationBtn;
							scope.explanation = action.explanation;

							scope.close = function (wasConfirmed) {
								$uibModalInstance.close(wasConfirmed);
							}
						}]
					});

					modalInstance.result.then(function (wasConfirmed) {
						if (wasConfirmed) {
							action.onConfirmed(false, true);
						}
					});
				};

				$scope.publishDraft = function () {
					confirmationModal({
						title: 'Publish Draft',
						confirmationBtn: 'Publish Draft',
						explanation: 'Publishing this draft will make it a live Entry and possibly accessible by other users',
						onConfirmed: function () {
							if ($scope.entryData.viewScope === 'me') {
								// auto-approve since viewScope is 'me'

								var autoApprove = function (entryData) {
									return KeytermsClientInt.publishDraft(entryData, false);
								};

								return onSubmitModal($scope.entryData, autoApprove);
							}
							else {
								if (UserSvc.getUser().isGlossaryQC) {
									return onPublish();
								}
								else {
									return onSubmitModal($scope.entryData, KeytermsClientInt.publishDraft, true);
								}
							}
						}
					})
				};

				$scope.saveAsDraft = function () {
					confirmationModal({
						title: 'Save Draft',
						confirmationBtn: 'Save As Draft',
						explanation: `Only you can see and edit your drafts. Check the 'drafts' page to see all of your works in progress.`,
						onConfirmed: () => $scope.submitEntry(false, true)
					})
				};

				var onPublish = function () {
					var modalInstance = $uibModal.open({
						animation: false,
						templateUrl: 'resources/templates/modals/publishDraft.html',
						controller: ['$scope', '$uibModalInstance', function ($modal, $uibModalInstance) {

							$modal.approve = function () {
								var _approve = function (entryData) {
									return KeytermsClientInt.publishDraft(entryData, false);
								};

								$uibModalInstance.close();
								return onSubmitModal($scope.entryData, _approve);
							};

							$modal.nominate = function () {
								$uibModalInstance.close();
								return onSubmitModal($scope.entryData, KeytermsClientInt.publishDraft, true);
							};

							$modal.close = function () {
								$uibModalInstance.close();
							}
						}]
					});
				};

				$scope.clearForm = function () {
					$scope.entryData.editScope = null;
					$scope.entryData.viewScope = null;
					clearDisables();
				};


			}]
		}
	}]);

app.directive('entryTabbedForm', function () {
	return {
		restrict: 'E',
		templateUrl: 'resources/templates/widgets/entryTabbedForm.html',
		controller: ['$scope', '$location', '$uibModal', function ($scope, $location, $uibModal) {
			var warnUserFormDirty = function (target) {
				var modalInstance = $uibModal.open({
					animation: false,
					templateUrl: 'resources/templates/modals/saveDraft.html',
					controller: ['$scope', '$uibModalInstance', function ($modal, $uibModalInstance) {
						$modal.title = 'Warning!';
						$modal.confirmationBtn = 'Continue';
						$modal.explanation = `Any unsaved changes to this Entry will be lost!`;

						$modal.close = function (wasConfirmed) {
							$uibModalInstance.close(wasConfirmed);
						}
					}]
				});

				modalInstance.result.then(function (wasConfirmed) {
					if (wasConfirmed) {
						$scope.entryForm.$setPristine();
						$location.path(target.split('#')[1]);
					}
				});

			};

			// use temporary $watcher, because FormController is not available when this controller is initialized
			var w = $scope.$watch( function () {
					return $scope.entryForm;
				},
				function (newVal, oldVal) {

					if (newVal !== undefined) {
						w();		// remove watcher

						// bind $routeLocation logic
						//TODO pass through to onError pages
						$scope.$on('$locationChangeStart', function (evt, target) {

							if ($scope.entryForm.$dirty) {
								evt.preventDefault();
								warnUserFormDirty(target);
							}
						});
					}
				});
		}]
	}
});
