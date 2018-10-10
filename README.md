# KeyTerms - Terminology Management Tool
KeyTerms is a centralized terminology management tool.  It enables organizations to retain, share, search and standardize institutional terminology.   KeyTerms facilitates collaboration across groups within an enterprise, but also supports more localized terminological control by individual groups within the enterprise.  With its very flexible and customizable terminology model, KeyTerms provides individual groups within an enterprise the ability to curate their own terminology, with fine-grained control over which other groups can view and edit their terms.  KeyTerms allows groups within the enterprise to establish individualized annotation guidelines and term sharing policies.  It enables but does not require sharing outside of one’s group. Because all of the operations for creating, editing, searching and filtering are realized via the KeyTerms RESTful API, developers create custom user interfaces using the API and back-end search and storage capabilities to serve the needs of their own users.  The KeyTerms solution suite includes a back-end server and application programming interface (API), along with two user-facing browser-based tools: a terminology management interface for terminology management; and, an administration tool for controlling user roles and group preferences.

# Installation Notes

## Quick Installer for CentOS 7

The Quick Installer scripts will help you install all pre-requisites, initialize your mongoDB, set up your first admin account, and set up both the KeyTerms Client & Server to run as services

1. Download the KeyTerms repo
2. From the root of the repo run ```$ sudo sh bin/scripts/init.sh```
3. Follow the command-line prompts

## Manual Installation

### Prerequisites
* Tomcat
* MongoDB (~v3.4.16)
* Node (~v6.14.3)
* ElasticSearch (~5.6.9)

## Client Configuration
All KeyTerms client configuration settings can be found in `$KTCLIENT_BASE/config.js` The configuration settings include:

1. **apiUrl** - The URL of the KeyTerms server instance that this client should interface with.  The URL should specify the appropriate protocol, URL and port for the intended KeyTerms server instance.
    * Example: `http://keyterms.mycompany.net:4000/`
2. **mailto** - The email address the "Contact" tab should send users to for KeyTerms questions and support.
    * Example: `KEYTERMS_SUPPORT@mycompany.net`

## Development Mode

To run KeyTerms in development mode:

1. Download the KeyTerms repo
2. Go into to the ```KeyTerms-Server/dist/``` directory
3. Run ```npm install```
4. Copy ```config-default.js``` to ```config.js```, and adjust ```config.js``` appropriately
5. Run ```npm start```

For the client:

1. Go into the ```KeyTerms-Client``` directory
2. Run ```npm install```
3. In the ```src``` directory, copy ```config-default.js``` to ```config.js```, and adjust ```config.js``` appropriately
4. Start the client by using http-server (install via ```npm install http-server -g```) by running ```http-server``` from within the ```src``` directory
