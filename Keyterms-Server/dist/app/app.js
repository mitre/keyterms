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

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}

var isTestRun = /test/i.test(process.env.NODE_ENV);
var isProd = /prod/i.test(process.env.NODE_ENV);

var log = require('./utils/logger').logger;

var Promise = require('bluebird');
Promise.config({
	warnings: false,
	longStackTraces: false
});

var express = require('express');
var session = require('express-session');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var https = require('https');
var fs = require('fs');
var MongoDbStore = require('connect-mongodb-session')(session);
var cors = require('cors');
var corsgate = require('cors-gate');
var flash = require('connect-flash');

var db = require('./db');
var config = require('../config').server;
var dbConfig = require('../config').db;
var testDb = require('../test/testConfig.js').db;
var sysUtils = require('./utils/system');

var app = express();
log.info('=========================================================');

// view engine setup
app.engine('.ejs', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Include all necessary Routers
var api = require('./api'); // indirectly calls /app/api/db/initDb.js through requiring dependencies
var admin = require('./admin');
var upload = require('./upload');

// favicon requests
app.get('/favicon.ico', (req, res) => res.sendStatus(200));

// For coookeParser and express-sessions to work in union, their secrets must be the same
var secret = config.sessionSecret;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(secret, {}));
app.use(flash());

// CORS middleware - mounted on app so all the login endpoint can be reached
// TODO: if login endpoints move to their own router, only mount this on /api and /auth
app.use(corsgate.originFallbackToReferrer());
var _env_ = isProd ? 'prod' : 'dev';
app.use(cors({
	origin: config[_env_].allowedCorsDomains,
	methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['X-Custom-Header', 'X-Requested-With', 'Content-Type', 'Origin', 'Accept', 'Authorization'],
	credentials: true,
	maxAge: 60 * 60 * 24,	// one day
	optionsSuccessStatus: 200
}));
var serverOrigin = (config.useHTTPS ? 'https://' : 'http://') + config.location;
console.log(serverOrigin);
app.use(corsgate({
	strict: true,
	allowSafe: true,
	origin: serverOrigin
}));

// only mount api docs in dev mode
if (!isProd && !isTestRun) {
	// warn user if the only file in ../doc/dist is .gitkeep
	if (fs.readdirSync(path.join(__dirname, '../docs/dist')).length <= 1) {
		log.warn('Api docs have not yet been generated, run `npm run gen-docs` to generate the latest API documentation');
	}
	else {
		/**
		 * @api {get} /docs api docs
		 * @apiName API Documentation
		 * @apiGroup Documentation
		 * @apiVersion 3.0.0
		 * @apiDescription Returns the KeyTerms documentation pages, viewable by a browser
		 *
		 */
		app.use('/docs', express.static(path.join(__dirname, '/../docs/dist')));
		log.verbose('API documentation successfully mounted');
	}
}

// mounts morgan to log all endpoint connections
var morganFormat = isTestRun ? ':method :url :status :response-time ms - :res[content-length]' : 'dev';
app.use(logger(morganFormat, {'stream': require('./utils/logger').stream}));

// mount all client-side libraries
app.use('/libs', express.static(path.join(__dirname, '../libs')));
app.use('/upload/libs', express.static(path.join(__dirname, '../libs')));
app.use('/admin/libs', express.static(path.join(__dirname, '../libs')));

var userPassStrategy = require('./auth').strategies.userPassStrategy;

// Initializes a session Store, using our Mongo instance as the backend (different db for test env)
var sessionConfig = {
	uri: 'mongodb://' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.db,
	collection: 'sessions'
};
if (isTestRun) {
	sessionConfig = {
		uri: 'mongodb://' + testDb.host + ':' + testDb.port + '/' + testDb.db,
		collection: 'sessions'
	};
}

var sessionStore = new MongoDbStore(sessionConfig);

app.use(session({
	secret: secret,
	store: sessionStore,
	resave: true,
	saveUninitialized: true,
	cookie: {
		httpOnly: false,
		secure: config.useHTTPS,
		maxAge: config.cookieExpiration		// must be in milliseconds
	}
}));
app.use(passport.initialize());
app.use(passport.session()); // TODO: possibly re-write this for certs to function
 								// (http://stackoverflow.com/questions/34675655/when-serialize-and-deserialize-call-in-passport-js)

//passport stategy to authenticate against the DB
passport.use(userPassStrategy.stratCB);

passport.serializeUser(userPassStrategy.serializeUser);

passport.deserializeUser(userPassStrategy.deserializeUser);


app.get('/login', function(req, res){
    var errors = req.flash('error');
	res.header('Content-Type', 'text/html; charset=utf-8');
	res.render('login', {
		authFailure: errors.length > 0,
		errors: errors
	});
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login', failureFlash: 'Username/Password Invalid'}), function (req, res) {

	if (!!req.query.path) {
        return res.redirect(req.query.path);
    }
	else {
        console.log(req.user);
        return res.json(req.user);
    }
});

var protocolRegex = /^https?:\/\//i;

// https://stackoverflow.com/a/33786899
app.get('/logout', function(req, res) {
	if (!!req.user) {
		req.logout();
		req.session.destroy( function () {
			res.clearCookie('connect.sid'); 		// this is the default name for the express-session cookie

			var redirectTo = '/login';

			var host = req.headers['host'] || '';
			var referer = req.headers['referer'] || '';
			referer = referer.replace(protocolRegex, '').split('/');

			if (referer[0] !== '' && referer[0] === host && !!referer[1]) {
				redirectTo = '/' + referer[1];
			}

			res.redirect(redirectTo);
		});
	}
	else {
		res.sendStatus(404);
	}
});

app.get('/whoami', function(req, res) {
	if(!!req.user) {
		var user = req.user.toObject();
		user.password = undefined;
		res.json(user);
	}
	else{
		res.sendStatus(404);
	}
});

// TEMP FOR DEV
// TODO: I don't believe we need this anymore
//app.all('/', (req, res) => res.redirect('/api'));
app.get('/', (req, res) => res.redirect('/api'));

// mount the api and admin express.Router instances
app.use('/api', api);

// ensure authenticated or redirect to the Keyterms login page
app.use( function (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	} else {
		var url = encodeURIComponent(req.originalUrl);
		return res.redirect('/login?path=' + url);
	}
});
app.use('/upload', upload);
app.use('/admin', admin);
// docs are now mounted above

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	if (req.path === '/favicon.ico') {
		return res.sendStatus(404);
	}
    var err = new Error('Not found');
    err.status = 404;
    next(err);
});

// error handlers - NOTE: express requires error middleware handlers to have 4 arguments variables defined

/* eslint-disable no-unused-vars */

// development error handler
// will print stacktrace, commented out because we don't need to see the stacktrace
if (!isProd && !isTestRun) {
	app.use(function(err, req, res, next) {
		console.error(`[ERROR]: ${ err.message }`);
	    res.status(err.status || 404);
	    res.render('error', {
	      message: err.message,
	      error: err
	    });
  	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {

  	res.sendStatus(err.status || 404);

});

/* eslint-enable no-unused-vars */

var dbOptions = null;
Promise.resolve()
.then(function () {
	if (!isTestRun) {
		return db.init(dbOptions);
	}
})
.then( function () {
	// continuously monitor the ElasticSearch Connection
	return sysUtils.testElasticConnection();
})
.then( function () {
	return sysUtils.verifyIndexTemplate();
})
.then( function () {
	return sysUtils.getKeyTermsVersion();
})
.then( function (ktVersion) {
	var onStartUp = function (host, port, secure) {
		log.verbose('Current NODE_ENV value: ' + app.get('env'));
		log.info('Starting up KeyTerms v%s, running on pid: %s', ktVersion, process.pid);
		log.info('KeyTerms Service is listening at http%s://%s:%s', secure ? 's' : '', (host === '::') ? 'localhost' : host, port);
	};

	var portConfig = isProd ? config.prod : config.dev;
	var port = portConfig.http;

	var server = app;

	if (config.useHTTPS) {
		var TLSOptions = config.TLSOptions;
		TLSOptions.key = fs.readFileSync(config.SSLCerts.key);
		TLSOptions.cert = fs.readFileSync(config.SSLCerts.cert);
		TLSOptions.ca = config.SSLCerts.ca.map(ca => fs.readFileSync(ca));

		port = portConfig.https;
		server = https.createServer(TLSOptions, app);

	}

	var listener = server.listen(port, function () {
		var host = listener.address().address;
		var port = listener.address().port;
		onStartUp(host, port);
	});
});

exports.app = app;
