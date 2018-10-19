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

var express = require('express');
var router = express.Router();

// import route handlers
var system = require('./system');
var transUtils = require('./translationUtils');
var orgs = require('./orgs');
var tags = require('./tags');
var entries = require('./entries');
var user = require('./users');
var nominations = require('./nominations');
var search = require('./search');

// import middleware
var auth = require('../../auth').middleware;

/////////////////////////////// Global Middleware /////////////////////////////////////

// "Global" meaning middleware to be ran on every request to '/api' (not global across the server itself)

/////////////////////////////// System Endpoints ////////////////////////////////////

// Redirects GET /api to /api/status
router.get('/', (req, res) => res.redirect('/admin'));

// Redirects GET /api/api to /docs
router.get('/api', (req, res) => res.redirect('/docs'));

// Redirects GET /api/docs to /docs
router.get('/docs', (req, res) => res.redirect('/docs'));

/**
 * @api {get} /api/status status
 * @apiGroup Server Commands
 * @apiName status
 * @apiVersion 3.1.0
 *
 * @apiSuccess (2xx : Response Body) {string} keyTermsVersion Current version of the KeyTerms Service
 * @apiSuccess (2xx : Response Body) {string} mongoDBversion Current version of MongoDB being used
 * @apiSuccess (2xx : Response Body) {string} mode The current environment the server is set to (dev or prod)
 * @apiSuccess (2xx : Response Body) {Number} keyTermsEntries Total number of Entries currently stored, across all organizations
 *
 * @apiSuccessExample Success-Response:
 *        HTTP/1.1 200 OK
 *        {
 *			"keyTermsVersion": "2.20150622.0",
 *			"mongoDBversion": "3.2.6",
 *			"mode": "DEVELOPMENT",
 *			"keyTermsEntries": 1112
 * 		}
 *
 */
// TODO: Change this to work dynamically - move to system.js
// (http://stackoverflow.com/questions/15311305/how-to-get-mongodb-version-from-mongoose)
router.get('/status', system.status);

// GET /api/schema - prints a dynamically created JSON representation of an Entry schema object

/**
 * @api {get} /api/schema schema
 * @apiGroup Server Commands
 * @apiName schema
 * @apiVersion 3.1.0
 * @apiDescription Returns dynamically created JSON representation of an Entry schema object
 *
 */
router.get('/schema', system.schema);

/**
 * @api {get} /api/enums enums
 * @apiGroup Server Commands
 * @apiName enums
 * @apiVersion 3.1.0
 * @apiDescription Returns the various enum value of different server statuses
 *
 * @apiSuccess (2xx : Response Body) {[Object]} objectsStatuses List of enum values for the status field of all KeyTerms objects
 * @apiSuccess (2xx : Response Body) {[Object]} entryTypes List of enum values for the type field of the Entry object
 * @apiSuccess (2xx : Response Body) {[Object]} noteTypes List of enum values for the type field of the Note object
 * @apiSuccess (2xx : Response Body) {[Object]} orthographyTypes List of enum values for the orthographyType field of the Term object
 *
 * @apiSuccessExample Success-Response:
 *        HTTP/1.1 200 OK
 *        {
 *			"objectsStatuses": [{},{},...],
 *			"entryTypes": [{},{},...],
 *			"noteTypes": [{},{},...],
 *			"orthographyTypes": [{},{},...]
 * 		}
 *
 */
router.get('/enums', system.enums);


//////////////////////////////////// Language Utils ///////////////////////////////////
/**
 * @api {get} /api/langcodes language codes
 * @apiGroup Language Utilities
 * @apiName langcodes
 * @apiVersion 3.1.0
 * @apiDescription Returns all language codes of all supported language codes
 *
 * @apiSuccess (2xx : Response Body) {Object} languageCodes Hash of all supported language codes<br><br>
 * Language codes follow RFC-5646 (page 4) in the form [language]-[script]<br>
 * language (3 letters) in ISO 639-2/T code (or ISO 639-3)<br>
 * script (4 letters) in ISO 15924 code<br>
 * ISO 639-2 source: www.loc.gov/standards/iso639-2/php/code_list.php<br>
 * ISO 639-3 source: www-01.sil.org/iso639-3/codes.asp?order=639_3<br>
 *
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *      languageCodes: {
 *              afr: {
 *                  name: "Afrikaans",
 *                  ISO6391: "af"
 *               },
 *               ...
 *      }
 * }
 *
 */
router.get('/langcodes', transUtils.langCodes);

/////////////////////////////////// Auth Middleware ///////////////////////////////////
router.use(auth.authenticate.processCert);
router.use(auth.authenticate.ensureAuthenticated);

//////////////////////////////////// User Endpoints ///////////////////////////////////
/**
 * @apiDefine returnUser
 * @apiSuccess (2xx : Response Body) {string} fullName The full name of the user
 * @apiSuccess (2xx : Response Body) {string} username The username for the user
 * @apiSuccess (2xx : Response Body) {string} email The user's email
 * @apiSuccess (2xx : Response Body) {ObjectId} id auto-generated hash key
 * @apiSuccess (2xx : Response Body) {boolean} isAdmin A flag representing if the user is a server admin
 * @apiSuccess (2xx : Response Body) {[Organization]} organizations The list of organizations this user belongs to
 * @apiSuccess (2xx : Response Body) {Organization} currentOrg The organization the user is currently acting in
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 *{
 *    "fullName": "Luke Skywalker",
 *    "email": "luke@rebel.org",
 *    "username": "lsky",
 *    "_id": "57a4ed8a5dea6f5841348cdd",
 *    "isAdmin": false,
 *    "organizations": ["57a4ed8a5dea6f58415ae3d3", "57a4ed8a5dea6f58415ae3e7"],
 *    "currentOrg": "57a4ed8a5dea6f58415ae3d3"
 *}
 */

var userRouter = express.Router();

/**
 * @api {post} /api/user/activeOrg/:org change active org
 * @apiGroup User Management
 * @apiName activeOrg
 * @apiDescription Changes a user's current organization
 * @apiVersion 3.1.0
 * @apiDescription Used to change the current user's current organization
 * @apiParam (Param) {ObjectId} org The _id of the target organization the user wishes to focus
 *
 * @apiParamExample {json} Request-Example:
 *        path: /api/user/activeOrg/57a4ed8a5dea6f58415ae3d3
 *
 *    @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 */
userRouter.post('/activeOrg/:org', user.switchActiveOrg);

/**
 * @api {post} /api/user/defaultOrg/:org update user's default org
 * @apiGroup User Management
 * @apiName defaultOrg
 * @apiDescription Updates a user's stored default organization
 * @apiVersion 3.1.0
 * @apiParam (Param) {ObjectId} org The _id of the organization the user wishes to be set as their default
 */
userRouter.post('/defaultOrg/:org', user.updateDefaultOrg);

userRouter.post('/password-check/:id', user.checkAndChangePassword);

/**
 *	All user endpoints below this point require admin privileges
 */

userRouter.use(auth.authorize.ensureAdmin);
userRouter.param('id', user.idParam);

/**
 * @api {post} /api/user/create create user
 * @apiGroup User Management
 * @apiName addUser
 * @apiVersion 3.1.0
 * @apiDescription Creates a user
 *
 * @apiParam (Request Body) {string} username The desired username for the user
 * @apiParam (Request Body) {string} password The desired password for the user
 * @apiParam (Request Body) {string} email The email address of the user
 * @apiParam (Request Body) {string} fullName The full name of the user
 * @apiParam (Request Body) {boolean} [isAdmin=false] A flag representing if the user is a server admin
 *
 * @apiUse returnUser
 */
userRouter.post('/create', user.create);

userRouter.route('/u/:id')
/**
 * @api {get} /api/user/u/:id get user
 * @apiGroup User Management
 * @apiName getUser
 * @apiVersion 3.1.0
 * @apiDescription Returns a user
 *
 * @apiParam (Param) {ObjectId} id _id of the user
 *
 * @apiParamExample {json} Request-Example:
 * 		GET /api/user/u/57a4ed8a5dea6f58415a267
 *
 *
 * @apiUse returnUser
 *
 */
.get(user.read)

/**
 * @api {post} /api/user/u/:id update user
 * @apiGroup User Management
 * @apiName updateUser
 * @apiVersion 3.1.0
 * @apiDescription Updates a user
 *
 * @apiParam (Param) {ObjectId} id _id of the user to be updated
 *
 * @apiParamExample {json} Request-Example:
 * 		path: /api/user/u/57a4ed8a5dea6f58415a267
 *
 */
.post(user.update)

/**
 * @api {delete} /api/user/u/:id delete user
 * @apiGroup User Management
 * @apiName deleteUser
 * @apiVersion 3.1.0
 * @apiDescription Removes a user from the system.
 *
 * @apiParam (Param) {ObjectId} id _id of the user to be deleted
 *
 * @apiParamExample {json} Request-Example:
 * 		DELETE /api/user/u/57a4ed8a5dea6f58415a267
 *
 */
.delete(user.delete);

userRouter.get('/list', user.listUsers);


// mount user router on api router
router.use('/user', userRouter);

//////////////////////////////////// Organization Endpoints ///////////////////////////////////4

//
var organizationRouter = express.Router();

/**
 * @apiDefine OrganizationManagement Organization Management
 * Organizations have replaced Components and Component Ids in this iteration of the KeyTerms API. One difference introduced with the change to Organizations is the concept of QCs and Admins.
 * <br><br>Organizational Admins are Users (which are organization members) who will be given administrative permissions for this Organization. They will be able to create new users, add existing users to this organization, etc...
 * <br><br>Organizational QCs are Users (which are organization members) who will be given "approval" permissions for this Organization. This means they will be able to approve or reject nominations and add, modify, or remove Entries directly (without nominating) inside this organization
 * <br><br>QCs and Admins can be the same User or separate Users or any combination in between. It's completely up to the Organization.
 * <br><br><b>Note:</b>&nbsp;There is a difference between an Organizational Admin and a KeyTerms (or server) Admin. Org Admins can only perform administrative actions on their respective organizations
 */


/**
 * @apiDefine returnOrg
 * @apiSuccess (2xx : Response Body) {string} name Name of the organization
 * @apiSuccess (2xx : Response Body) {string} description Description of the organization
 * @apiSuccess (2xx : Response Body) {string} abbreviation org's abbrev
 * @apiSuccess (2xx : Response Body) {string} path The organization's path
 * @apiSuccess (2xx : Response Body) {boolean} globalBlock A flag indicating whether the organization's Entries are globally restricted
 * @apiSuccess (2xx : Response Body) {[string]} langList A list of languages associated with this organization
 * @apiSuccess (2xx : Response Body) {timestamp} lastModified Tracks the last time an update operation was performed on this organization
 * @apiSuccess (2xx : Response Body) {[Entry]} entries The entries submitted to the organization. This will probably be empty
 * @apiSuccess (2xx : Response Body) {[Nomination]} nominations The nominations submitted to the organization. This will probably be empty
 * @apiSuccess (2xx : Response Body) {[User]} qcs The list of QCs that are associated with the organization
 * @apiSuccess (2xx : Response Body) {[User]} admins The list of admins associated with the organization
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 {
   "name": "testOrg",
   "description": "TestOrg",
   "abbreviation": "test",
   "path": "path/to/testOrg",
   "globalBlock": false,
   "_id": "57d081fdf87b781e0852de93",
   "langList": [],
   "lastModified": 1480447791085,
   "entries": [],
   "nominations": [],
   "qcs": [],
   "admins": []
 }
 *
 */

organizationRouter.use(auth.authenticate.verifyRequest);
organizationRouter.use(auth.authorize.ensureSysAdminOrOrgAdmin);

/**
 * @api {get} /api/org/list find all
 * @apiGroup OrganizationManagement
 * @apiName Get all Organizations
 * @apiVersion 3.1.0
 * @apiDescription Returns a list of all organizations
 *
 * @apiSuccessExample Success-Response:
 * NOTE: The entries and nominations fields are filtered out to reduce the size of the returned data
 *
 * HTTP/1.1 200 OK
 *
 * [
 {
   "name": "testOrg",
   "description": "TestOrg",
   "abbreviation": "test",
   "path": "path/to/testOrg",
   "globalBlock": false,
   "_id": "57d081fdf87b781e0852de93",
   "langList": [],
   "lastModified": 1480447791085,
   "qcs": [],
   "admins": []
 },
 {
  "name": "exampleOrg",
  "description": "ExampleOrg",
  "abbreviation": "example",
  "path": "path/to/exampleOrg",
  "globalBlock": false,
  "_id": "57d081fdf87b781e0852da56",
  "langList": [],
  "lastModified": 1480447792301,
  "qcs": [],
  "admins": []
}
 * ]
 */
organizationRouter.get('/list', orgs.list);

/**
 * @api {get} /api/org/common find common
 * @apiGroup OrganizationManagement
 * @apiName Get common organization
 * @apiVersion 3.1.0
 * @apiDescription Returns the common organization
 * @apiUse returnOrg
 */
organizationRouter.get('/getCommon', orgs.getCommon);

/**
 * @api {post} /api/org/create create
 * @apiGroup OrganizationManagement
 * @apiName Create Organization
 * @apiDescription Creates a an organization with the submitted properties. Returns a json representation of the organization
 * @apiVersion 3.1.0
 *
 * @apiParam (Request Body) {string} name Name of the organization
 * @apiParam (Request Body) {string} [description] Description of the organization
 * @apiParam (Request Body) {string} [abbreviation] org's abbrev
 * @apiParam (Request Body) {string} [path] The organization's path
 * @apiParam (Request Body) {boolean} [globalBlock=false] A flag indicating whether the organization's Entries are globally restricted
 *
 * @apiParamExample {json} Request-Example:
 *	path: /api/org/create
 *
 *	body: {
 *	  "name": "testOrg",
 *	  "description": "TestOrg",
 *	  "abbreviation": "test",
 *	  "path": "path/to/testOrg"
 *	}
 *
 * @apiUse returnOrg
 *
 **/
organizationRouter.post('/create', auth.authorize.ensureAdmin, orgs.create);

/**
 * @apiDefine orgIdParam
 * @apiParam {Organization} id The _id for the specific organization
 */
//Anything with in the organization Router with :id in the address has the organization looked up automatically
organizationRouter.param('id', orgs.idParam);

organizationRouter.route('/o/:id')

/**
 * @api {get} /api/org/o/:id find one
 * @apiGroup OrganizationManagement
 * @apiName Find Organization
 * @apiVersion 3.1.0
 * @apiDescription Returns information about a given organization
 * @apiUse orgIdParam
 * @apiUse returnOrg
 */
.get(orgs.read)

.post(orgs.update)

/**
 * @api {delete} /api/org/o/:id delete
 * @apiGroup OrganizationManagement
 * @apiName Delete Entry
 * @apiVersion 3.1.0
 * @apiDescription Deletes an organization
 * @apiUse orgIdParam
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
.delete(orgs.delete);

/**
 * @api {post} /api/org/addQC/o/:id add QC
 * @apiGroup OrganizationManagement
 * @apiName Add a QC
 * @apiVersion 3.1.0
 * @apiDescription Adds a QC to an organization
 *
 * @apiUse orgIdParam
 * @apiParam (Request Body) {User} qcID The _id for the user to be promoted to Organizational QC
 * @apiParamExample {json} Request-Example:
 *   path: /api/org/addQC/57d081fdf87b781e0852de93
 *
 *   body: {
 *     "qcID": "57a4ed8a5dea6f5841348cdd"
 *   }
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
organizationRouter.post('/addQC/:id', orgs.addQC);

/**
 * @api {post} /api/org/addAdmin/:id add admin
 * @apiGroup OrganizationManagement
 * @apiName Add a Admin
 * @apiVersion 3.1.0
 * @apiDescription Adds an admin to an organization with a given id
 * @apiUse orgIdParam
 * @apiParam (Request Body) {ObjectId} adminID The _id for the user to be promoted to Organizational Admin
 *
 * @apiParamExample {json} Request-Example:
 *   path: /api/org/addAdmin/57d081fdf87b781e0852de93
 *
 *   body: {
 *     "adminID": "57a4ed8a5dea6f5841348cdd"
 *   }
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
organizationRouter.post('/addAdmin/:id', orgs.addAdmin);

/**
 * @api {post} /api/org/removeQC/:id remove QC
 * @apiGroup OrganizationManagement
 * @apiName remove a QC
 * @apiVersion 3.1.0
 * @apiDescription Removes a QC from a given organization.
 * @apiUse orgIdParam
 * @apiParam (Request Body) {User} qcID The _id for the user to be removed from their QC position
 * @apiParamExample {json} Request-Example:
 *   path: /api/org/removeQC/57d081fdf87b781e0852de93
 *
 *   body: {
 *     "qcID": "57a4ed8a5dea6f5841348cdd"
 *   }
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
organizationRouter.post('/removeQC/:id', orgs.removeQC);

/**
 * @api {post} /api/org/removeAdmin/:id remove admin
 * @apiGroup OrganizationManagement
 * @apiName Remove Admin
 * @apiVersion 3.1.0
 * @apiDescription Removes an admin from an organization
 * @apiUse orgIdParam
 * @apiParam (Request Body) {ObjectId} adminID The _id for the user to be removed from their Admin position
 *
 * @apiParamExample {json} Request-Example:
 *   path: /api/org/removeAdmin/57d081fdf87b781e0852de93
 *
 *   body: {
 *     "adminID": "57a4ed8a5dea6f5841348cdd"
 *   }
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
organizationRouter.post('/removeAdmin/:id', orgs.removeAdmin);

/**
 * @api {get} /api/org/members/:id find org users
 * @apiGroup OrganizationManagement
 * @apiName Get Users
 * @apiVersion 3.1.0
 * @apiDescription Returns all users for a given organization
 * @apiUse orgIdParam
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * [
 *  {
 *    "fullName": "Luke Skywalker",
 *    "email": "luke@rebel.org",
 *    "username": "lsky",
 *    "_id": "57a4ed8a5dea6f5841348cdd",
 *    "isAdmin": false,
 *    "organizations": ["57a4ed8a5dea6f58415ae3d3", "57a4ed8a5dea6f58415ae3e7"],
 *    "currentOrg": "57a4ed8a5dea6f58415ae3d3"
 *  },
 *  {
 *    "fullName": "Darth Vader",
 *    "email": "vader@empire.gov",
 *    "username": "NotYourFather",
 *    "_id": "57a4ed8a5dea6f5841348a43",
 *    "isAdmin": false,
 *    "organizations": ["57a4ed8a5dea6f58415ae4f5", "57a4ed8a5dea6f58415aed29"],
 *    "currentOrg": "57a4ed8a5dea6f58415ae4f5"
 *  }
 * ]
 */
//organizationRouter.get('/members/:id', orgs.getUsers);

organizationRouter.route('/members/:id')
/**
 * @api {get} /api/org/members/:id find org users
 * @apiGroup OrganizationManagement
 * @apiName Get Users
 * @apiVersion 3.1.0
 * @apiDescription Returns all users for a given organization
 * @apiUse orgIdParam
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * [
 *  {
 *    "fullName": "Luke Skywalker",
 *    "email": "luke@rebel.org",
 *    "username": "lsky",
 *    "_id": "57a4ed8a5dea6f5841348cdd",
 *    "isAdmin": false,
 *    "organizations": ["57a4ed8a5dea6f58415ae3d3", "57a4ed8a5dea6f58415ae3e7"],
 *    "currentOrg": "57a4ed8a5dea6f58415ae3d3"
 *  },
 *  {
 *    "fullName": "Darth Vader",
 *    "email": "vader@empire.gov",
 *    "username": "NotYourFather",
 *    "_id": "57a4ed8a5dea6f5841348a43",
 *    "isAdmin": false,
 *    "organizations": ["57a4ed8a5dea6f58415ae4f5", "57a4ed8a5dea6f58415aed29"],
 *    "currentOrg": "57a4ed8a5dea6f58415ae4f5"
 *  }
 * ]
 */
.get(orgs.getMembers)

.put(orgs.addMembers)

.post(orgs.updateMembers);

router.use('/org', organizationRouter);

//////////////////////////////////// Entry Endpoints ///////////////////////////////////

// TODO: validate user credentials to determine if they have QC
// TODO: authorization or need to be "nominating" or "approving"

/***********************************************************************/
/* 						#### IMPORTANT NOTE ####                  	   */
/* auth.verifyRequest is middleware which checks if the request has a  */
/* a current live session, all endpoints mounted below this point will */
/* require a valid login with the session cookies, or will return 403  */
/***********************************************************************/
router.use(auth.authenticate.verifyRequest);

// This endpoint must be placed after the verifyRequest function
// This not included in the Org Router on purpose
/**
 * @api {get} /api/orgPermissions check user permissions
 * @apiGroup Authentication
 * @apiName Organization Permissions
 * @apiVersion 3.1.0
 * @apiDescription Returns the user's organizational permissions for their current organization
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * {
 *   isOrgAdmin: true,
 *   isOrgQC: true,
 *   orgName: "testOrg"
 * }
 *
 */
router.get('/orgPermissions', orgs.checkOrgPermissions);

var entryRouter = express.Router();

/**
 * @apiDefine entrySuccess
 * @apiSuccess (2xx : Response Body) {[Entry]} body See <a target='_blank' href='../api/schema'>/api/schema</a> for full Entry schema
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * {
 *   [ {Entry}, {Entry}, ... ]
 * }
 */

/**
 * @apiDefine singleEntrySuccess
 * @apiSuccess (2xx : Response Body) {Entry} body See <a target='_blank' href='../api/schema'>/api/schema</a> for full Entry schema
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * {
 *   {Entry}
 * }
 */

/**
 * @apiDefine entryBodyParams
 * @apiParam (Request Body) {string="org","usr","dft","dep"} status The Entry's ownership status <br>See <a target='_blank' href='../api/enums'>/api/enums/</a> for more info
 * @apiParam (Request Body) {string} schemaVersion Which API version this Entry is being created against <br><a target='_blank' href='../api/status'>/api/status/</a> for more info
 * @apiParam (Request Body) {type="term","per","org","loc","event"} type The type of Entry this Entry will be. <br>See <a target='_blank' href='../api/enums'>/api/enums/</a> for more info

 * @apiParam (Request Body) {boolean} [isShared=true] A flag representing whether or not the Entry will be shared with out Organizations
 * @apiParam (Request Body) {boolean} [isDeprecated=false] A flag representing whether or not the Entry was created against an old schema version
 * @apiParam (Request Body) {[TermObj]} [terms] A list of Term objects (not _id references) <br>See the Request Example (below) or <a target='_blank' href='../api/schema'>/api/schema</a> for more info on TermObjs
 * @apiParam (Request Body) {[TermLinkObj]} [termLinks] A list of Term Link objects. Note: Term Links are created using term indices. After the entry is processed, the indices are replaced with IDs.  <br>See the Request Example (below) or <a target='_blank' href='../api/schema'>/api/schema</a> for more info on TermLinkObjs
 * @apiParam (Request Body) {[string]} [tags] A list of tags to tag this Entry with
 * @apiParam (Request Body) {[NoteObj]} [notes] A list of Note objects <br>See the Request Example (below) or <a target='_blank' href='../api/schema'>/api/schema</a> for more info on NoteObjs
 *
 * @apiParamExample {json} Request-Example
 * path: /api/entry/create
 *
 * body: {
 *   "status": "org",
 *   "schemaVersion": "3.1.0",
 *   "type": "term",
 *   "terms": [
 *     {
 *       "langCode": "eng",
 *       "termText": "Example Term"
 *     },
 *     {
 *       "langCode": "spa",
 *       "termText": "Ejemplo de término"
 *     }
 *   ],
 *   "termLinks": [
 *     {
 *       "lhs": 0,
 *       "rhs": 1,
 *       "relationType": "translat"
 *     }
 *   ],
 *   "tags": [ "example", "translation", "eng-to-spa" ],
 *   "notes": [
 *     {
 *       "text": "This is a note",
 *       "type": "general"
 *     }
 *   ]
 * }
 */

/**
 * @api {get} /api/entry/myentries find user entries
 * @apiGroup Entries
 * @apiName My Entries
 * @apiVersion 3.1.0
 * @apiDescription Returns a list of all of user's entries in JSON format
 * @apiUse entrySuccess
 *
 */
router.get('/myentries', entries.getUserEntries);

/**
 * @api {get} /api/entry/mydrafts find user drafts
 * @apiGroup Entries
 * @apiName My Drafts
 * @apiVersion 3.1.0
 * @apiDescription Returns a list of all the user's drafts in JSON format
 * @apiUse entrySuccess

*/
router.get('/mydrafts', entries.getUserEntries);

/**
 * @api {post} /api/entry/create create
 * @apiGroup Entries
 * @apiName Entry Create
 * @apiVersion 3.1.0
 * @apiDescription Creates an Entry within the user's current organization and returns a JSON representation of the created Entry. See <a target='_blank' href='../api/schema'>/api/schema</a> for more info on the Entry schema
 *
 * @apiUse entryBodyParams
 *
 * @apiUse singleEntrySuccess
 *
 */
entryRouter.post('/create', entries.create);

/**
 * @api {get} /api/entry/:id find one
 * @apiGroup Entries
 * @apiName Entry Read
 * @apiVersion 3.1.0
 * @apiDescription Returns the json representation of the requested entry
 *
 * @apiUse entryIdParam
 *
 * @apiUse singleEntrySuccess
 *
 */
entryRouter.get('/:entry', entries.read);

/**
 * @apiDefine entryIdParam
 * @apiParam {Entry} id The _id for the specific Entry to be acted on
 */
// Middleware to verify existence of requested Entry instance
entryRouter.param('id', entries.param);

//TODO: document this endpoint
entryRouter.post('/publish/:id', entries.publishDraft);

entryRouter.route('/:id')
// .get(entries.read) // moved to different location. Needs slightly different authorization middleware chain

/**
 * @api {post} /api/entry/:id update
 * @apiGroup Entries
 * @apiName Entry Update
 * @apiVersion 3.1.0
 * @apiDescription  Updates an entry. Returns a json representation of the entry
 *
 * @apiUse entryIdParam
 * @apiUse entryBodyParams
 *
 * @apiUse singleEntrySuccess
 *
 */
    .post(entries.update)

/**
 * @api {delete} /api/entry/:id remove
 * @apiGroup Entries
 * @apiName Entry Remove
 * @apiVersion 3.1.0
 * @apiDescription Deletes the specific entry
 *
 * @apiUse entryIdParam
 *
 * @apiSuccessExample Success-Response
 * HTTP/1.1 200 OK
 *
 */
    .delete(entries.delete);

// mounts entry-specific error handling middleware
entryRouter.use(entries.errorHandlers);
// mounts the /entry router onto the /api router instance
router.use('/entry', entryRouter);


//////////////////////////////////// Nomination Endpoints ///////////////////////////////////

/**
 * @apiDefine nominationSuccess
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * {
 *   "type": "del",
 *   "originalEntry": "58004e6ccf6051d210336e5e"
 * }
 */

/**
 * @apiDefine nominationsSuccess
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * [
 *   {
 *     "type": "del",
 *     "originalEntry": "58004e6ccf6051d210336e5e"
 *   },
 *   {
 *     "type": "add",
 *     "data": {Entry}
 *   },
 *   ...
 * ]
 */

// GET /api/nominations
/**
 * @api {get} /api/nominations find all
 * @apiGroup Nominations
 * @apiName getNominations
 * @apiVersion 3.1.0
 * @apiDescription  An array of all nominations for user's current organization
 * @apiUse nominationsSuccess
 *
 */
router.get('/nominations', nominations.getNominations);

var nominationRouter = express.Router();

// POST /api/nominate/create
/**
 * @api {post} /api/nomination/create create
 * @apiVersion 3.1.0
 * @apiName createNomination
 * @apiGroup Nominations
 * @apiDescription Nominates the creation, deletion or modification of an Entry. See <a href='#api-Entry-Entry_Create'>Entry</a> for more info on EntryObjs
 *
 * @apiParam (Request Body) {string="add","del","mod"} type <code>required</code>&nbsp;&nbsp; The type of Nomination: Addition, Deletion or Modification <br>See <a target='_blank' href='../api/enums'>/api/enums</a> for more info
 * @apiParam (Request Body) {Entry} [originalEntry] <code>required for Deletions and Modifications</code>&nbsp;&nbsp; An _id references to the Entry to be acted on
 * @apiParam (Request Body) {EntryObj} [data] <code>required for Additions and Modifications</code>&nbsp;&nbsp; The data the would-be new or updated Entry should have <br>See <a href='#api-Entry-Entry_Create'>Entry</a> or <a target='_blank' href='../api/schema'>/api/schema</a> for more info
 *
 * @apiParamExample Addition-Request-Example:
 * path: /api/nomination/create
 *
 * body: {
 *   "type": "add",
 *   "data": {Entry}
 * }
 *
 * @apiParamExample Deletion-Request-Example:
 * path: /api/nomination/create
 *
 * body: {
 *   "type": "del",
 *   "originalEntry": "58004e6ccf6051d210336e5e"
 * }
 *
 * @apiParamExample Modification-Request-Example:
 * path: /api/nomination/create
 *
 * body: {
 *   "type": "mod",
 *   "originalEntry": "58004e6ccf6051d210336e7f",
 *   "data": {Entry}
 * }
 *
 * @apiSuccessExample Addition-Success-Response
 * HTTP/1.1 200 OK
 *
 * {
 *   "type": "add",
 *   "data": {Entry}
 * }
 *
 * @apiSuccessExample Deletion-Success-Response
 * HTTP/1.1 200 OK
 *
 * {
 *   "type": "del",
 *   "originalEntry": "58004e6ccf6051d210336e5e"
 * }
 *
 * @apiSuccessExample Modification-Success-Response
 * HTTP/1.1 200 OK
 *
 * {
 *   "type": "mod",
 *   "originalEntry": "58004e6ccf6051d210336e7f",
 *   "data": {Entry}
 * }
 */
nominationRouter.post('/create', nominations.validateEntry, nominations.create);

/**
 * @apiDefine nomIdParam
 * @apiParam {Nomination} id The _id for the specific Nomination to be acted on
 */
// Middleware to verify existence of requested Nomination instance
nominationRouter.param('id', nominations.param);

// GET /api/nominate/:id
/**
 * @api {get} /api/nominations/:id find one
 * @apiGroup Nominations
 * @apiName getNominationById
 * @apiVersion 3.1.0
 * @apiDescription Returns a nomination with given :id
 *
 * @apiUse nomIdParam
 *
 * @apiUse nominationSuccess
 */
nominationRouter.get('/:id', nominations.read);


// POST /api/nominate/reject/:id
/**
 * @api {post} /api/nominations/reject/:id reject
 * @apiGroup Nominations
 * @apiName rejectNomination
 * @apiVersion 3.1.0
 * @apiDescription Reject a nomination with a given ID
 *
 * @apiUse nomIdParam
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
nominationRouter.post('/reject/:id', auth.authorize.ensureOrgQc, nominations.reject);

// POST /api/nominate/approve/:id
/**
 * @api {post} /api/nominations/approve/:id approve
 * @apiGroup Nominations
 * @apiName approveNomination
 * @apiVersion 3.1.0
 * @apiDescription Approves a nomination with a given ID
 *
 * @apiUse nomIdParam
 *
 * @apiSuccessExample Addition-Success-Response
 * HTTP/1.1 200 OK
 *
 * {
 *   {Entry}
 * }
 *
 * @apiSuccessExample Deletion-Success-Response
 * HTTP/1.1 200 OK
 *
 * @apiSuccessExample Modification-Success-Response
 * HTTP/1.1 200 OK
 *
 * {
 *   {Entry}
 * }
 */
nominationRouter.post('/approve/:id', auth.authorize.ensureOrgQc, nominations.validateEntry, nominations.approve);

// mounts nomination-specific error handling middleware
nominationRouter.use(nominations.errorHandlers);
// mount to /api router
router.use('/nomination', nominationRouter);


///////////////////////////////// Tag Endpoints /////////////////////////////////

/**
 * @apiDefine tagSuccess
 * @apiSuccess (2xx : Response Body) {ObjectId} _id The auto-generated hash key for this object
 * @apiSuccess (2xx : Response Body) {string} content The tag string
 * @apiSuccess (2xx : Response Body) {Organization} org The _id of the Organization this Tag belongs to
 * @apiSuccess (2xx : Response Body) {[Entry]} entries The list of Entry _ids that are tagged with this Tag
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * {
 *   "_id": "580a6eaa09ce69ce0a8b2794",
 *   "content": "tagExample",
 *   "org": "57d2cec262a15afc0dc8a8ca",
 *   "entries": [
 *     "580a6eaa09ce69ce0a8b2792",
 *     "580a6eae09ce69ce0a8b2798",
 *     "580a6eae09ce69ce0a8b279b"
 *   ]
 * }
 */

var tagRouter = express.Router();

tagRouter.get('/orgTag/:content', tags.read);

// TODO: revisit this
/**
 * @apiIgnore
 * @api {post} /api/tags/findOrCreate Find or create a tagID
 * @apiGroup Tags
 * @apiName Tag Find Or create
 * @apiVersion 3.1.0
 * @apiDescription  Returns an id of a tag.  If no tag exists, then it is created
 *
 *
 * @apiParam {string} tag The string of the Tag you're looking for
 *
 * @apiSuccess (2xx : Response Body) {Object} returns Tag object
 *
 */
tagRouter.get('/findOrCreate/:tag', tags.findOrCreateEP);


/**
 * @apiDefine tagTagParam
 * @apiParam {string} tag The tag string for the specific Tag to be acted on. This string is expected to be URI encoded
 */
tagRouter.param('tag', tags.findOrCreateParam);

/**
 * @api {post} /api/tags/addEntry/:tag tag entry
 * @apiGroup Tags
 * @apiName Tag Add entry
 * @apiVersion 3.1.0
 * @apiDescription  Tags an Entry with this Tag
 *
 * @apiUse tagTagParam
 * @apiParam (Request Body) {Entry} entryId The _id of the Entry to be tagged with this Tag
 * @apiParamExample Request-Example:
 * path: /api/tags/addEntry/exampleTag
 *
 * body: {
 *   "entryId": "580a745809ce69ce0a8b28a7"
 * }
 *
 *
 * @apiUse tagSuccess
 *
 */
tagRouter.post('/addEntry/:tag', tags.validateEntry, tags.addEntryToTag);

/**
 * @api {post} /api/tags/removeEntry/:tag un-tag entry
 * @apiGroup Tags
 * @apiName Tag Remove entry
 * @apiVersion 3.1.0
 * @apiDescription Removes a tag from an entry
 *
 * @apiUse tagTagParam
 * @apiParam (Request Body) {Entry} entryId The _id of the Entry to be tagged with this Tag
 * @apiParamExample Request-Example:
 * path: /api/tags/removeEntry/exampleTag
 *
 * body: {
 *   "entryId": "580a745809ce69ce0a8b28a7"
 * }
 *
 * @apiUse tagSuccess
 *
 */
tagRouter.post('/removeEntry/:tag', tags.validateEntry, tags.removeEntryFromTag);

/**
 * @api {get} /api/tags/orgTags find all
 * @apiGroup Tags
 * @apiName getOrgTags
 * @apiVersion 3.1.0
 * @apiDescription Returns all tags for the user's current organization
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 * [
 *   {
 *     "_id": "580a6eaa09ce69ce0a8b2794",
 *     "content": "tagExample",
 *     "org": "57d2cec262a15afc0dc8a8ca",
 *     "entries": [
 *       "580a6eaa09ce69ce0a8b2792",
 *       "580a6eae09ce69ce0a8b2798",
 *       "580a6eae09ce69ce0a8b279b"
 *     ]
 *   },
 *   {
 *     "_id": "580a6eaa09ce69ce0a8b279a",
 *     "content": "anotherTagExample",
 *     "org": "57d2cec262a15afc0dc8a8ca",
 *     "entries": [
 *       "580a6eaa09ce69ce0a8b2791",
 *       "580a6eae09ce69ce0a8b2795",
 *       "580a6eae09ce69ce0a8b279f"
 *     ]
 *   },
 *   ...
 * ]
 *
 */
tagRouter.get('/orgTags', tags.getOrgTags);

/**
 * @api {get} /api/tags/search/:tag search entries by tag
 * @apiGroup Search
 * @apiName Search By Tag
 * @apiVersion 3.1.0
 * @apiDescription Returns Entries which belong to the user's current organization that are tagged with the passed <code>:tag</code> param
 *
 * @apiUse tagTagParam
 *
 * @apiUse entrySuccess
 *
 */
tagRouter.get('/search/:tag', tags.searchByTag);

tagRouter.get('/autocomplete/:text', tags.autocomplete);


/**
 * @apiDefine tagIdParam
 * @apiParam {Tag} id The _id for the specific Tag to be acted on
 */
// Tag CRUD
//all tags with a :id in them will now have the tag attached to the request
tagRouter.param('id', tags.idParam);

/**
 * @api {post} /api/tags/rename/:id rename
 * @apiGroup Tags
 * @apiName renameTag
 * @apiVersion 3.1.0
 * @apiDescription Renames a Tag's content field (the tag string) to a new value.
 * If the new value already exists as a Tag, all entries which belong to the given
 * tag will be appended to the pre-existing Tag and the given Tag will be deleted
 *
 * @apiUse tagIdParam
 * @apiParam (Request Body) {string} newTag The new tag string to replace the current string
 * @apiParamExample Request-Example:
 * path: /api/tags/rename/580a6eaa09ce69ce0a8b2794
 *
 * body: {
 *   "newTag": "anotherTagExample"
 * }
 *
 * @apiUse tagSuccess
 */
tagRouter.post('/rename/:id', auth.authorize.ensureOrgQc, tags.renameTag);

/**
 * @api {delete} /api/tags/del/:id delete
 * @apiGroup Tags
 * @apiName deleteTag
 * @apiVersion 3.1.0
 * @apiDescription Delete a given tag
 *
 * @apiUse tagIdParam
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *
 */
tagRouter.delete('/del/:id', auth.authorize.ensureOrgQc, tags.deleteTag);

router.use('/tags', tagRouter);

//////////////////////////////////// Search Endpoints ///////////////////////////////////

var searchRouter = express.Router();

/**
 * @api {post} /api/search/org search entries by term [POST]
 * @apiGroup Search
 * @apiName Basic Search [POST]
 * @apiVersion 3.1.0
 * @apiDescription Search for Entries within the user's current glossary, all of the user's glossaries, or all glossaries, given a specific langCode and SearchTerm
 *
 * @apiParam (Request Body) {string {3}} langCode A 3 letter language code to specify which language to search on <br> See <a href='#api-Language_Utilities-langcodes'>langCodes</a> or <a target='_blank' href='../api/langcodes'>/api/langcodes</a> for more info
 * @apiParam (Request Body) {string} searchTerm The term or phrase to search for within the user's current organization
 * @apiParam (Request Body) {string} glossScope A string specifying which glossaries to search
 * @apiParam (Query Parameters) {boolean} [exact=false] If true, only exact matches will be returned. Defaults to false if not provided
 *
 *
 * @apiParamExample Request-Example:
 * path: /api/search/org
 *
 * body: {
 * 	  langCode: 'eng',
 * 	  searchTerm: 'hello world'
 * }
 *
 * @apiUse entrySuccess
 *
 */
searchRouter.post('/org', search.langCodeParam, search.searchTermParam, search.searchOrgEntries);

/**
 * @api {get} /api/search/org search entries by term [GET]
 * @apiGroup Search
 * @apiName Basic Search [GET]
 * @apiVersion 3.1.0
 * @apiDescription Search for Entries within the user's current organization given a specific langCode and SearchTerm
 *
 * @apiParam (Query Parameters) {string {3}} langCode A 3 letter language code to specify which language to search on <br> See <a href='#api-Language_Utilities-langcodes'>langCodes</a> or <a target='_blank' href='../api/langcodes'>/api/langcodes</a> for more info
 * @apiParam (Query Parameters) {string} searchTerm The term or phrase to search for within the user's current organization. This string is expected to be URI encoded
 * @apiParam (Query Parameters) {boolean} [exact=false] If true, only exact matches will be returned. Defaults to false if not provided
 *
 *
 * @apiParamExample Request-Example:
 * path: /api/search/org?langCode=eng&searchTerm=hello+world
 *
 * body: { }
 *
 * @apiUse entrySuccess
 *
 */
searchRouter.get('/org', search.langCodeParam, search.searchTermParam, search.searchOrgEntries);

searchRouter.route('/default')
.get(search.langCodeParam, search.searchTermParam, search.glossScopeParam, search.searchSharedEntries)
.post(search.langCodeParam, search.searchTermParam, search.glossScopeParam, search.searchSharedEntries);

router.use('/search', searchRouter);

///////////////////////////////////////// Download Endpoints //////////////////////////////////////////////////////
var download = require('./downloads');

var downloadRouter = express.Router();

/**
 * @api {get} /api/download/org download org entries
 * @apiGroup Downloads
 * @apiName Download Organization
 * @apiVersion 3.1.0
 * @apiDescription Returns either a JSON file or a raw JSON RESTful response. Used to download every entry of an organization
 *
 * @apiParam (Query Parameters) {boolean} [file=true] If false, returns a raw JSON RESTful response. If true, the user is prompted to download a JSON file. Defaults to true if not provided
 * @apiParam (Query Parameters) {number} [limit] If provided, the resulting array will be truncated to match the limit value
 * @apiParam (Query Parameters) {string} [org="currentOrg"] If set to a valid organization's abbreviation, the search will be run against the given organization's Entries. If the given organization has their globalBlock flag set to true, an error will be returned. Defaults to the user's currentOrg if not provided
 *
 * @apiParamExample Request-Example:
 * path: /api/download/org
 *
 * @apiUse entrySuccess
 *
 */
downloadRouter.get('/org', download.orgToJSON);


/**
 * @api {get} /api/download/query download search results
 * @apiGroup Downloads
 * @apiName Download Search Query
 * @apiVersion 3.1.0
 * @apiDescription Returns either a JSON file or a raw JSON RESTful response. Used to download the results of a search. <br><b>NOTE: This endpoint will return the same result as <a href='#api-Search-Basic_Search__GET_'>/api/search</a> if the file param is set to false</b>
 *
 * @apiParam (Query Parameters) {boolean} [file=true] If false, returns a raw JSON RESTful response. If true, the user is prompted to download a JSON file. Defaults to true if not provided
 * @apiParam (Query Parameters) {number} [limit] If provided, the resulting array will be truncated to match the limit value
 * @apiParam (Query Parameters) {string {3}} langCode A 3 letter language code to specify which language to search on <br> See <a href='#api-Language_Utilities-langcodes'>langCodes</a> or <a target='_blank' href='../api/langcodes'>/api/langcodes</a> for more info
 * @apiParam (Query Parameters) {string} searchTerm The term or phrase to search for within the user's current organization. This string is expected to be URI encoded
 * @apiParam (Query Parameters) {boolean} [exact=false] If true, only exact matches will be returned. Defaults to false if not provided
 * @apiParam (Query Parameters) {string} [org="currentOrg"] If set to a valid organization's abbreviation, the search will be run against the given organization's Entries. If the given organization has their globalBlock flag set to true an error will be returned. Defaults to the user's currentOrg if not provided
 *
 * @apiParamExample Request-Example:
 * path: /api/download/query?langCode=eng&searchTerm=hello+world
 *
 * @apiUse entrySuccess
 *
 */
downloadRouter.get('/query', search.langCodeParam, search.searchTermParam, download.queryToJSON);


/**
 * @api {get} /api/download/selected download selected entries
 * @apiGroup Downloads
 * @apiName Download Selected Entries
 * @apiVersion 3.1.0
 * @apiDescription Returns either a JSON file or a raw JSON RESTful response. Used to download a list of specific Entries
 *
 * @apiParam (Query Parameters) {[Entry]} entries A comma-separated list of all the _id fields from each Entry to be included. <b>No Spaces</b>
 * @apiParam (Query Parameters) {boolean} [file=true] If false, returns a raw JSON RESTful response. If true, the user is prompted to download a JSON file. Defaults to true if not provided
 * @apiParam (Query Parameters) {number} [limit] If provided, the resulting array will be truncated to match the limit value

 * @apiParamExample Request-Example:
 * path: /api/download/selected?entries=58dc23eb1bc202ac1fa9e776,57d2d4dda80268420f4de217,58dc23ec1bc202ac1fa9e780
 *
 * @apiUse entrySuccess
 *
 */
downloadRouter.get('/selected', download.selectedToJSON);

router.use('/download', downloadRouter);

///////////////////////////////////////// Browse Endpoints //////////////////////////////////////////////////////
var browse = require('./browse');

var browseRouter = express.Router();

// TODO: documentation

browseRouter.get('/terms', (req, res) => res.redirect('./terms/und'));

browseRouter.get('/terms/:langCode', browse.browseTerms);

browseRouter.post('/terms/entries', browse.browseEntriesOfTerms);

router.use('/browse', browseRouter);

///////////////////////////////////////// Export Main Router //////////////////////////////////////////////////////

//This router is mounted on /api
module.exports = router;
