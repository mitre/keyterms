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

var xlsParser = require('./../xlsAbstract');
var log = require('../../includes').log;

class XLS2D extends xlsParser {
    parse () {
        var self = this;
        var termMap = {};
        var lastEntryId = 0;

        return new Promise( function( resolve ) {

            self.ws.eachRow( function (row, rowNum) {
                log.verbose('Parsing row #', rowNum);
                if (rowNum < 2) { return; }

                // handy shortcut function that references the header map
                // and returns the value of the row's cell via column name
                var extract = function (field) {
                    return row.values[self.headerPos[field]];
                };

                //--------------TESTING DYNAMIC HEADER LOCATION STARTS HERE-----------------
                Object.keys(self.headerPos).forEach( function (header) {


                });



                var entry = self.entries[extract(self.headers[1])];
                if (entry === undefined) {
                    // this means a new entry is being processed

                    // add entry to import queue
                    if (lastEntryId > 0) {
                        self.queueEntry(lastEntryId);
                    }
                    // reset parser variables
                    termMap = {}; // reset term map
                    entry = self.createEntry();

                    lastEntryId = extract(self.headers[1]);
                }

                switch (extract(self.headers[2])) {
                    case 'TERM':
                    case 'Term':
                    case 'term':
                        var term = {};
                        term.termText = extract(self.headers[3]);
                        term.langCode = extract(self.headers[5]);
                        term.variety = extract(self.headers[6]);
                        term.script = extract(self.headers[7]);

                        var tempArr = [];

                        if( extract(self.headers[10]) ) {
                            var posNote = {};
                            posNote.text = extract(self.headers[10]);
                            posNote.type = 'pos';
                            tempArr.push(posNote);
                        }

                        if (extract(self.headers[11])) {
                            var exampleNote = {};
                            exampleNote.text = extract(self.headers[11]);
                            exampleNote.type = 'example';
                            tempArr.push(exampleNote);
                        }

                        if (extract(self.headers[12])) {
                            var usageNote = {};
                            usageNote.text = extract(self.headers[12]);
                            usageNote.type = 'usage';
                            tempArr.push(usageNote);
                        }

                        if ( tempArr.length > 0) {
                            term.notes = [];
                            term.notes = tempArr;

                        }

                        entry.terms.push(term);

                        // maps FIELD_ID to array index for Term Link referencing
                        termMap[entry.terms.length] = entry.terms[entry.terms.length - 1];

                        // is linked?
                        if (!!extract(self.headers[8])) {
                            var link = {};
                            link.lhs = entry.terms[entry.terms.length - 1];
                            link.rhs = termMap[extract(self.headers[8])];
                            link.relationType = extract(self.headers[9]);

                            entry.termLinks.push(link);
                        }

                        break;
                    case 'TAG':
                    case 'Tag':
					case 'tag':
                        entry.tags.push(extract(self.headers[3]));

                        break;
                    case 'NOTE':
                    case 'Note':
                        var note = {};
                        note.text = extract(self.headers[3]);
                        note.type = extract(self.headers[10]) || 'general';
                        entry.notes.push(note);

                        break;
                    default:
                        break; // skip this FIELD_TYPE
                }

                // update entry within entries map
                self.entries[extract(self.headers[1])] = entry;
            });

            self.queueLastEntry(lastEntryId, resolve);
        });
    }
}

module.exports = XLS2D;
