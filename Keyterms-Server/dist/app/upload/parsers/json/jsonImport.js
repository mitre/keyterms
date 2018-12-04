var log = require('../includes').log;
var ImporterBase = require('../importerBase');

class jsonParser extends ImporterBase {
    constructor (glossary, jsonEntryArr, base) {
        super(glossary, base);

        log.verbose('Initializing JSON Parser...');
        this.jsonEntries = jsonEntryArr;

    }

    getTerms(terms) {

        var termArr = [];
        var term = {};


        for(var i = 0; i < terms.length; i++) {
            term = {};
            term.notes = [];

            term.termText  = terms[i].termText;
            term.langCode = terms[i].langCode;
            term.variety = terms[i].variety;
            term.script = terms[i].script;

            if(terms[i].notes && terms[i].notes.length) {
                term.notes.push(terms[i].notes);
            }
            termArr.push(term);
        }

        return termArr;
    };

    parse () {

        var self = this;
        var entries = this.jsonEntries;
        var entry = self.createEntry();
        var lastEntryID = 0;

        return new Promise( function( resolve ) {

            for (var i = 0; i < entries.length; i++) {

                entry = self.createEntry();
                entry.terms = [];


                entry.terms = self.getTerms(entries[i].terms);
                entry.termLinks = entries[i].termLinks;
                entry.tags = entries[i].tags;

                if(entries[i].notes.length) {
                    entry.notes.push(entries[i].notes);
                }

                entry.type = entries[i].type;
                entry.schemaVersion = entries[i].schemaVersion;

                self.entries[i] = entry;
                lastEntryID = i;

                if(i < entries.length - 1) {
                    self.queueEntry(i, entry);
                }
            };

            self.queueLastEntry(lastEntryID, resolve);
        })
    }
}

module.exports = jsonParser;
