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

'use strict';

/* eslint-disable no-multi-spaces, standard/object-curly-even-spacing */

// Please note that the split command is acting on commas (','), not spaces.
// Therefore, there shouldn't be any spaces if not part of an enum.
// Why are we doing two variables each? Performance convenience; so validators need only to use the array.

//**********************************************************************************************************************
//exports.statuses = ',add,del,mod,usr,dft,dep'.split(',');
exports.statusesINFO = [
    { value: 'org',     name: 'Approved',       desc: 'organization\'s entry'},
    { value: 'usr',     name: 'User',           desc: 'user\'s personal entry'},
    { value: 'dft',     name: 'Draft',          desc: 'user\'s personal entry in draft'},
    { value: 'dep',     name: 'Deprecated',     desc: 'deprecated entry, not to be used, kept for information'}
];
exports.statuses = exports.statusesINFO.map(status => status.value);

//**********************************************************************************************************************
exports.nominationTypeINFO = [
	{ value: 'add',     name: 'Add',            desc: 'entry is nominated for addition into component\'s list'},
	{ value: 'del',     name: 'Delete',         desc: 'entry is nominated for deletion'},
	{ value: 'mod',     name: 'Modification',   desc: 'proposed modification to an entry'}
];
exports.nominationTypes = exports.nominationTypeINFO.map(type => type.value);

//**********************************************************************************************************************
//exports.entryTypes = 'term,person,org,loc,event'.split(',');

exports.entryTypesINFO = [
    { value: 'term',    	name: 'Term',           	desc: 'generic term'},
	{ value: 'attribute',   name: 'Attribute',          desc: 'self explanatory'},
	{ value: 'document',    name:  'Document',          desc: 'self explanatory'},
    { value: 'per',     	name: 'Person',         	desc: 'self explanatory'},
    { value: 'org',     	name: 'Organization',   	desc: 'self explanatory'},
    { value: 'loc',     	name: 'Location',       	desc: 'self explanatory'},
    { value: 'event',   	name: 'Event',          	desc: 'self explanatory'}
];
exports.entryTypes = exports.entryTypesINFO.map(type => type.value);
//**********************************************************************************************************************
exports.noteTypes = 'usage,example,pos,meaning,source,general,nominate'.split(',');
exports.noteTypesINFO = [
    { value: 'general', 	  name: 'General',        	  desc: 'general type of overview note'},
    { value: 'example', 	  name: 'Example',        	  desc: 'example of how the term is used'},
	{ value: 'etymology',     name: 'Etymology',          desc:  ''},
	{ value: 'formality',     name:  'Formality',         desc: ''},
	{ value: 'function',      name:  'Function',          desc:''},
    { value: 'meaning', 	  name: 'Meaning',        	  desc: 'term definition'},
    { value: 'usage',   	  name: 'Usage',          	  desc: 'explanation of how the term is used'},
    { value: 'pos',     	  name: 'Part of Speech', 	  desc: 'Part Of Speech'},
    { value: 'source',  	  name: 'Source',         	  desc: 'document, website, etc. where the information was obtained'},
	{ value: 'pronunciation', name: 'Pronunciation',      desc: ''},
	{ value: 'routing',       name: 'Routing',            desc: ''},
	{ value: 'status',        name: 'Status',             desc: ''}
];

//**********************************************************************************************************************
exports.orthTypesINFO = [
	{ value: 'abbr',    	   name: 'Abbreviation',   	     desc: 'self explanatory'},
	{ value: 'acronym', 	   name: 'Acronym',        	     desc: 'self explanatory'},
	{ value: 'inflect', 	   name: 'Inflected Form', 	     desc: 'TODO' },
	{ value: 'nick',		   name: 'Nickname', 		     desc: 'self explanatory'},
	{ value: 'short',   	   name: 'Short Form',     	     desc: 'For languages that have different forms, e.g. Russian'},
	{ value: 'translat', 	   name: 'Translation', 	     desc: 'self explanatory' },
	{ value: 'translit', 	   name: 'Transliteration',      desc: 'self explanatory' },
	{ value: 'dialectVariant', name: 'Dialectical Variant',  desc: 'TODO' },
	{ value: 'orthoVariant',   name: 'Orthographic Variant', desc: ''},
	{ value: 'synonym',       name: 'Synonym',               desc:''}
];
exports.orthTypes = exports.orthTypesINFO.map(status => status.value);

//**********************************************************************************************************************
exports.editScopeTypesINFO = [
	{ value: 'any', 	name: 'Anyone', 				comparison: 10,		desc: 'Any KeyTerms user is allowed to make edits to this Entry'},
	{ value: 'org', 	name: 'Owning Organization',	comparison: 5,		desc: 'This Entry follows the KeyTerms default Organization-based curation pattern'},
	{ value: 'me', 		name: 'Just Me', 				comparison: 1,		desc: 'The author of this Entry is the only person whom is allowed to make edits'}
];
exports.editScopeTypes = exports.editScopeTypesINFO.map(type => type.value);

//**********************************************************************************************************************
exports.viewScopeTypesINFO = [
	{ value: 'any', 	name: 'Anyone', 				comparison: 10,		desc: 'Any KeyTerms user is allowed view this Entry'},
	{ value: 'org', 	name: 'Owning Organization', 	comparison: 5,		desc: 'Only members of this Entry\'s Organization will be able to view it'},
	{ value: 'me', 	    name: 'Just Me', 				comparison: 1,		desc: 'This Entry is private to the author'}
];
exports.viewScopeTypes = exports.viewScopeTypesINFO.map(type => type.value);

//**********************************************************************************************************************
exports.entrySourcesINFO = [
	{ value: 'user', 		name: 'User', 				desc: 'A KeyTerms user manually entered this Entry'},
	{ value: 'ingest', 		name: 'Uploaded', 			desc: 'Entry is from an bulk ingest operation'},
	{ value: 'nlp', 		name: 'NLP Services', 		desc: 'Entry is a transliteration generated by NLP Services'}
];
exports.entrySources = exports.entrySourcesINFO.map(type => type.value);

//**********************************************************************************************************************
exports.supportedFileTypeINFO = [
	{value: 'json', name: 'JSON', desc: 'JSON file download' },
	{value: 'xlsx2D', name: 'Excel (2D)', desc: 'Excel file download'}
];
exports.supportedFileTypes = exports.supportedFileTypeINFO.map(type => type.value);

/* eslint-enable no-multi-spaces, standard/object-curly-even-spacing */
