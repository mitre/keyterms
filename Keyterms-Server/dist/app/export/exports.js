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

var Excel = require('exceljs');
var path = require('path');
var fs = require('fs');

exports.exportFile = function (entries) {
    var filename = 'export-workbook' + (new Date()).getTime().toString() + '.xlsx';
    var p = path.join(__dirname, filename);
    var stream = fs.createWriteStream(p);

    var options = {
        stream: stream,
        useStyles: true,
        useSharedStrings: true
    };

    var wb = new Excel.stream.xlsx.WorkbookWriter(options);
    var ws = wb.addWorksheet('entries');

    ws.columns = [
        {header: 'ENTRY_ID', key: 'entryId'},
        {header: 'FIELD_ID', key: 'fieldId'},
        {header: 'FIELD_TYPE', key: 'fieldType'},
        {header: 'FIELD_TEXT', key: 'fieldText'},
        {header: 'TermLanguage', key: 'termLangauge'},
        {header: 'TermScript', key: 'termScript'},
        {header: 'TermIsPreferred', key: 'termIsPreferred'},
        {header: 'LinkType', key: 'linkType'},
        {header: 'TermLinkedFrom', key: 'termLinkedFrom'},
        {header: 'TermNotes', key: 'termNotes'}

    ];
    entries.forEach(function(entry, index){

        //row = ws.getRow(count);
        var fieldCount = 1;

        entry.terms.forEach(function (term) {

            var row = exportHelper(ws, fieldCount, index);

            //FIELD_TYPE
            row.getCell(3).value = 'Term';

            //FIELD_TEXT
            row.getCell(4).value = term.termText;

            //TermLanguage
            row.getCell(5).value = term.langCode;

            //TermScript
            row.getCell(6).value = term.script;

            //TermIsPreferred
            //row.getCell(7).getValue()

            //LinkType
            //row.getCell(8).getValue()

            //TermLinkedFrom
            //row.getCell(9).getValue()

            //TermNotes
            row.getCell(10).value = term.notes;

            fieldCount++;
            row.commit();
        });

        entry.notes.forEach(function(note){

            var row = exportHelper(ws, fieldCount, index);

            //FIELD_TYPE
            row.getCell(3).value = 'Note';

            //FIELD_TEXT
            row.getCell(4).value = note.text;

            fieldCount++;
            row.commit();

        });

        entry.tags.forEach(function (tag) {

            var row = exportHelper(ws, fieldCount, index);

            //FIELD_TYPE
            row.getCell(3).value = 'Tag';

            //FIELD_TEXT
            row.getCell(4).value = tag.content;

            fieldCount++;
            row.commit();
        });

        var row = exportHelper(ws, fieldCount, index);
        row.getCell(3).value = 'ENTRY_TYPE';
        row.getCell(4).value = entry.type;

        fieldCount++;
        row.commit();
    });

    ws.commit();

    return wb.commit()
    .then(function () {
        stream.end();
        return filename;
    });

};

var exportHelper = function (ws, fieldCount, index) {

     ws.addRow(
         {entryId: index + 1, fieldId: fieldCount}
     );

    return ws.lastRow;
};
