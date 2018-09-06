var jsonfile = require('jsonfile');
var Promise = require('bluebird');

var Parsers = {
    json: require('./jsonImport')
};

var getParser = function (req, obj, base) {

    return new Parsers.json(req.org, obj, base);

};

var route = function (req) {

    return new Promise( function (resolve, reject) {
        jsonfile.readFile(req.filePath, function (err, obj) {
            if (err) {
                return reject(err);
            }

            return resolve(obj);
        })
    })
    .then(function(obj){
        var base = {
            classification: req.body.classification,
            classificationBlob: req.body.classificationBlob,
            viewScope: req.body.vs,
            createdBy: req.user._id,
            notes: [{
                createdBy: req.user._id,
                type: 'source',
                text: `THIS ENTRY WAS IMPORTED FROM ${req.originalFileName} BY ${req.user.fullName} (${req.user.email}) ON ${(new Date()).toLocaleString()}`
            }]
        };

        var parser = getParser(req, obj, base);
        return parser.parse();
    })

}

module.exports = {
    Parsers: Parsers,
    route: route
};
