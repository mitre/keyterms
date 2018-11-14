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
var NLP = require('./../../../../utils/nlpServices');
var log = require('../../includes').log;

class simple extends xlsParser {
    parse() {

        var self = this;
        var lastEntryId = 0;
        var langCodeMap = {};
        var promises = [];

        Object.keys(self.headerPos).forEach( function (header) {
            promises.push(new Promise(function (resolve, reject) {
                NLP.getISO(header)
                    .then( function (res) {

                        if (res.length != 0) {
                            langCodeMap[res[0].english_name] = res[0].code;
                        }
                        resolve(true);
                    })
                    .catch( function (err) {
                        log.error(err);
                    })
            }))
        })

       return Promise.all(promises)
        .then( function (res) {

            return new Promise( function (resolve) {

                self.ws.eachRow( function (row, rowNum) {

                    log.verbose('Parsing row #', rowNum);
                    if (rowNum < 2) { return; }

                    // handy shortcut function that references the header map
                    // and returns the value of the row's cell via column name
                    var extract = function (field) {
                        return row.values[self.headerPos[field]];
                    };

                    // add entry to import queue
                    if (lastEntryId > 0) {
                        self.queueEntry(lastEntryId);
                    }

                    var entry = self.createEntry();
                    lastEntryId = rowNum - 1;

                    Object.keys(self.headerPos).forEach( function (header) {
                        //----- TAG LOGIC --------
                        if (header.toLowerCase().includes("tags")) {

                            var temp = extract(header);
                            var tempArr = temp.split(",");

                            tempArr.forEach( function (str) {
                                entry.tags.push(str);
                            });
                        }

                        //------ NOTE LOGIC -----
                        else if (header.toLowerCase().includes("note")) {

                            if(extract(header) != null) {
                                var note = {};
                                note.text = extract(header);

                                if (header.includes("_")) {
                                    note.type = header.slice(header.indexOf("_") + 1).toLowerCase();
                                }

                                else {
                                    note.type = "general";
                                }

                                entry.notes.push(note);
                            }
                        }

                        //------ TERM LOGIC ---------
                        else {

                            var term = {};
                            term.termText = extract(header);
                            term.langCode = langCodeMap[header];
                            entry.terms.push(term);

                        }
                    })

                    // update entry within entries map
                    self.entries[rowNum - 1] = entry;

                });
                console.log("lastEntry: ", lastEntryId);
                self.queueLastEntry(lastEntryId, resolve);
            });
        })

    }
}

module.exports = simple;
