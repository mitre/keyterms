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

app.service('init.service', ['$q', '$http', '$location', 'keytermsApi', 'globals', function ($q, $http, $location, Keyterms, globals) {

	/**
	 * [UserId Instruction]
	 *
	 * If you plan to get the id from an endpoint add the line below to the array on line 15 (within the $q.all call)
	 * as the LAST element of the array (it is VERY important that it is the LAST element)
	 *
	 * $http.get('<endpoint>')
	 */


	// TODO: initialize user data as well and login creds?

	var promise = $q.all([Keyterms.requestLangCodes(), Keyterms.requestEnums(), Keyterms.requestKeyTermsVersion()]).then(function (data) {
		if (data.indexOf(undefined) !== -1) {
			$location.path('/server-down');
			// this must return a resolved promise to complete navigation to /server-down
			return $q.resolve();
		}

		globals.langCodeList = Object.keys(data[0].data.languageCodes);
		globals.langCodeMap = data[0].data.languageCodes;
		globals.langCodeList.forEach(code => {
			globals.langCodeMap[code].value = code;
		})
		globals.supportedFileTypeList = data[1].data.supportedFileTypes;
		globals.noteTypeList = data[1].data.noteTypes;
		globals.orthoTypes = data[1].data.orthographyTypes;
		globals.editScopeList = data[1].data.editScopeTypes;
		globals.viewScopeList = data[1].data.viewScopeTypes;
		globals.entryTypeList = data[1].data.entryTypes;
		globals.keyTermsVersion = data[2].data.keyTermsVersion;
		globals.schemaVersion = data[2].data.APIVersion;
		globals.defaultUser = {
			FullName: 'The User',
			Email: 'user@foo.bar'
		};

		/**
		 * [UserId Instruction]
		 *
		 * Assign the user id to the globals object by add a line like:
		 * 		"globals.userId = data[3].data;"
		 */

		console.log('init service has resolved');
	});

	return {
		promise: promise
	};
}]);

// idea from http://stackoverflow.com/questions/16286605/angularjs-initialize-service-with-asynchronous-data
