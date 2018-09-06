# KeyTerms Client Installation Quick Guide
*Last edited: 15 April 2018*

## Dependencies

All dependencies for the KeyTerms client are included with the installation bundle.  No additional installations are required.

For informational purposes only, KeyTerms client is built with:
* Google's [Angular.js](https://angularjs.org/) - version 1.5.5
* Twitter's [Bootstrap](http://getbootstrap.com/) - version 3.36
    * The [Paper Theme](https://bootswatch.com/paper/) for [Bootstrap](http://getbootstrap.com/) from [Bootswatch](https://bootswatch.com/) - verison 3.3.7
* [Bootstrap for Angular](https://angular-ui.github.io/bootstrap/) - version 1.3.2
* [Font Awesome](http://fontawesome.io/) - version 4.5



## Configurations

All KeyTerms client configuration settings can be found in `$KTCLIENT_BASE/config.js` The configuration settings include:

1. **apiUrl** -The URL of the KeyTerms server instance that this client should interface with.  The URL should specify the appropriate protocol, URL and port for the intended KeyTerms server instance.
    * Example: `http://keyterms.mycompany.net:4000/`
2. **mailto** - The email address the "Contact" tab should send users to for KeyTerms questions and support.
    * Example: `KEYTERMS_SUPPORT@mycompany.net`

## Running KeyTerms Client

Out of the box, KeyTerms Client is self-contained. It relies purely on static pages and therefore can be served by any web server technology,
such as Node's [http-server](https://www.npmjs.com/package/http-server) or Python's [simple-server](http://2ality.com/2014/06/simple-http-server.html)

Running KeyTerms client in a web server such as Tomcat should be as simple dropping source code into an appropriate static directory and starting the server.  See your chosen web server's documentation for information on how to deploy web content.
