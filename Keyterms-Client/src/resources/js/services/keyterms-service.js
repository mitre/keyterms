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

app.factory('keytermsApi', ['$http', '$q', 'ApiUrl', function ($http, $q, ApiUrl) {
	// local (private) variables
	//var authUrl = 'http://localhost:4000/';
	//var baseApiUrl = 'http://localhost:4000/api';
	var authUrl = ApiUrl;
	var baseApiUrl = ApiUrl + 'api';

	var request = function (httpPromise) {
		return httpPromise.then(function (res) {
			//console.log("response: ", res);
			if (typeof res.data === 'object') {
				// console.log("In service:", res.data);
				return res.data;
			} else if (res.data === '') {
				return res.status + ' - ' + res.statusText;
			} else if (typeof res.data === 'string') {
				return res.status + ' - ' + res.statusText + ' : ' + res.data;
			} else {
				//console.log("something went wrong with the query");
				//console.log("res: ", res);
				return $q.reject(res.data);
			}
		}, function (res) {
			//console.log("everything is wrong with the connection");
			//console.log("res: ", res);
			return $q.reject(res.data);
		});
	};

	// public methods and variables
	// they all must be defined as 'service.foobar'
	var service = {};

	// TODO: add a global catch on all $http requests

	////////////// Initialization Methods ////////////////
	service.requestLangCodes = function () {
		return $http.get(baseApiUrl + '/langcodes').catch(function (err) {
			console.log(err);
		});
	};

	service.requestEnums = function () {
		return $http.get(baseApiUrl + '/enums').catch(function (err) {
			console.log(err);
		});
	};

	service.requestKeyTermsVersion = function () {
		return $http.get(baseApiUrl + '/status').catch(function (err) {
			console.log(err);
		});
	};

	////////////// User/Auth Methods /////////////////////

	service.validateUser = function (credentials) {
		return $http.post(authUrl + 'login', credentials);
	};

	service.checkGlossaryPermissions = function () {
		return $http.get(baseApiUrl + '/glossaryPermissions');
	};

	service.logout = function () {
		return $http.get(authUrl + 'logout');
	};

	service.changePassword = function (user, passwordData) {
		return $http.post(baseApiUrl + '/user/password-check/' + user._id, passwordData);
	};

	///////////////// Tag Methods ////////////////////////

	// expects array of tags
	service.requestTags = function () {
		return $http.get(baseApiUrl + '/tags/glossaryTags');
	};

	// expects 200 status on success
	service.renameTag = function (tag, newTag) {
		return $http.post(baseApiUrl + '/tags/rename/' + encodeURIComponent(tag), { newTag: newTag });
	};

	// expects 204 status on success
	service.deleteTag = function (tag) {
		return $http.delete(baseApiUrl + '/tags/del/' + encodeURIComponent(tag));
	};

	service.getGlossaryTag = function (tag) {
		return $http.get(baseApiUrl + '/tags/glossaryTag/' + encodeURIComponent(tag));
	};

	service.tagEntry = function (tag, entryId) {
		return $http.post(baseApiUrl + '/tags/addEntry/' + encodeURIComponent(tag), { entryId: entryId });
	};

	service.searchByTag = function (tag) {
		return $http.get(baseApiUrl + '/tags/search/' + encodeURIComponent(tag));
	};

	service.autocomplete = function (text) {
		return $http.get(baseApiUrl + '/tags/autocomplete/' + encodeURIComponent(text));
	};

	///////////////// Entry Methods ////////////////////////

	// expects array of entries
	service.searchTerms = function (term, langCode, glossScope, exact) {
		if (!term || !langCode) { return Promise.reject('Bad parameters'); }
		// [Converted - 10/25] FOR DEV ONLY
		var url = baseApiUrl + '/search/default';
		url += exact ? '?exact=' + exact : '';
		return $http.post(url, {
			langCode: langCode,
			searchTerm: term,
			glossScope: glossScope
		});
	};

	// updated 9/29
	service.createNomination = function (nom) {
		return $http.post(baseApiUrl + '/nomination/create', nom);
	};

	// [Converted - 10/10]
	service.approveNomination = function (id, data) {
		return $http.post(baseApiUrl + '/nomination/approve/' + id, data);
	};

	// [Converted - 10/1]
	service.rejectNomination = function (id) {
		return $http.post(baseApiUrl + '/nomination/reject/' + id);
	};

	// updated 9/26
	service.createEntry = function (entry) {
		return $http.post(baseApiUrl + '/entry/create', entry);
	};

	service.publishEntry = function (draftId, isNom) {
		isNom = (isNom === undefined) ? true : isNom;	// default to true

		var url = `${baseApiUrl}/entry/publish/${draftId}`;

		if (!isNom) {
			url += '?nominate=false';
		}

		return $http.post(url);
	};

	// [Converted - 10/3]
	service.requestEntry = function (id) {
		return $http.get(baseApiUrl + '/entry/' + id);
	};

	// [Converted - 10/3]
	service.deleteEntry = function (id) {
		//return $http.delete(baseApiUrl + '/entry/' + id);
		return $http({
			method: 'DELETE',
			url: baseApiUrl + '/entry/' + id
		});
	};

	service.updateEntry = function (id, entryData) {
		return $http.post(baseApiUrl + '/entry/' + id, entryData);
	};

	// [Converted - 10/3]
	service.getUserEntries = function () {
		// TODO: Use some kind of user service to identify the user
		//return $http.get(baseApiUrl + '/myterms');

		return $http.get(baseApiUrl + '/myentries');
	};

	service.updateUserGlossary = function (glossaryId) {
		return $http.post(baseApiUrl + '/user/activeGlossary/' + glossaryId);
	};

	service.updateDefaultGlossary = function (glossaryId) {
		console.log("Updating the default glossary to: " + glossaryId);
		return $http.post(baseApiUrl + '/user/defaultGlossary/' + glossaryId);
	};

	// [Converted - 10/3]
	service.requestDrafts = function () {
		// TODO: Use some kind of user service to identify the user
		return $http.get(baseApiUrl + '/mydrafts');
	};

	// [Converted - 10/3]
	service.requestNominations = function () {
		return $http.get(baseApiUrl + '/nominations');
	};

	// [Converted - 10/3]
	service.requestNomination = function (id) {
		return $http.get(baseApiUrl + '/nomination/' + id);
	};

	service.browseTerms = function (langCode) {
		if(langCode) {
			return $http.get(baseApiUrl + '/browse/terms' + '/' + langCode);
		} else {
			return $http.get(baseApiUrl + '/browse/terms');
		}
	};

	service.browseTermEntries = function (entryIds) {
		return $http.post(baseApiUrl + '/browse/terms/entries', entryIds);
	};

	return service;
}]);
