#!/bin/sh

################################################################################
# Main install script for KeyTerms. Assumes all dependencies are installed
#   and running as services where applicable. To check dependency setup, run
#   setup.sh.
#
# ---- THIS SCRIPT SHOULD BE RUN AS ROOT. ----
################################################################################

# Directories
APP_DIR=/usr/opt
PROJ_DIR=$(cd "$(dirname $0)/../../.."; pwd)
BIN_DIR=$PROJ_DIR/bin
SCRIPTS_DIR=$PROJ_DIR/bin/scripts
SERVICES_DIR=$BIN_DIR/services
LIB_DIR=$PROJ_DIR/lib
CLIENT_DIR=$PROJ_DIR/Keyterms-Client
SERVER_DIR=$PROJ_DIR/Keyterms-Server
CONF_DIR=$BIN_DIR/conf

# Dependencies
NLP_SERVICES_WAR=NLPServices.war
NLP_WAR=keytermsnlp.war

# Services
TOMCAT_DAEMON=tomcat.service

# Installation variables
source $SCRIPTS_DIR/install-vars

# Users and groups
APP_GROUP=keyterms
test -n "$TOMCAT_USER" || TOMCAT_USER=kt_tomcat
test -n "$NODEJS_USER" || NODEJS_USER=kt_nodejs

# Query for SSL install
echo ' '; read -p 'Install KeyTerms over SSL? (y|N) ' sslOption
case "$sslOption" in
    y|Y) USE_SSL=1 ;;
    *) USE_SSL=0 ;;
esac

################################################################################
# Install Keyterms server
################################################################################

# Set up directory
echo ' '; echo 'Setting up Keyterms server directory...'
SERVER_DEPLOY_DIR=$APP_DIR/keyterms/server
mkdir -p $SERVER_DEPLOY_DIR
echo '... copying in server files. This may take a minute ...'
cp -R $SERVER_DIR/dist/* $SERVER_DEPLOY_DIR
chown -R $NODEJS_USER:$APP_GROUP $SERVER_DEPLOY_DIR

# Run npm install (if no node_modules directory)
if [ ! -d "$SERVER_DEPLOY_DIR/node_modules/" ]; then
    echo '... running npm install ...'
    cd $SERVER_DEPLOY_DIR
    npm install
fi

# Copy in config file
echo '... copying over appropriate config file ...'
if [ $USE_SSL -ne 0 ]; then
    cp $CONF_DIR/config.js.localhost.https $SERVER_DEPLOY_DIR/config.js
    SV_PROTOCOL="https"
    SV_PORT="5443"
else
    cp $CONF_DIR/config.js.localhost.http $SERVER_DEPLOY_DIR/config.js
    SV_PROTOCOL="http"
    SV_PORT="5000"
fi

# Set URLs for server config
hostname="$(hostname -f)"
serverLOC="$hostname:$SV_PORT"
sed -i -e "s|myServerLocation|${hostname}|g" $SERVER_DEPLOY_DIR/config.js
sed -i -e "s|myPort|${SV_PORT}|g" $SERVER_DEPLOY_DIR/config.js

read -p "Would you like to use the default database name, \"KeyTerms\"? (Y|n) " dbchoice
case "$dbchoice" in
    n|N )
        echo "Please enter a database name for the KeyTerms collection:"
        read dbname
        perl -pi -e "s/(db:[\t\s]+\')\w+/\1${dbname}/" $SERVER_DEPLOY_DIR/config.js
        echo "Using database $dbname"
        ;;
    * )
        echo "Using database name KeyTerms."
        ;;
esac

# Set up systemd service
echo '... deploying Keyterms server...'
cp $SERVICES_DIR/ktserver.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ktserver
systemctl start ktserver
echo '... Keyterms server deployed and service started (ktserver).'

################################################################################
# Deploy NLP Services and Keyterms client to Tomcat
################################################################################

# Check for CATALINA_HOME
if [ -n "$CATALINA_HOME" ]; then
    echo "CATALINA_HOME is $CATALINA_HOME"
else
    echo "CATALINA_HOME not set. Please export, then re-run this script."
    exit 0
fi

# Check if tomcat service exists and is running
if service --status-all 2>&1 | grep -Fq $TOMCAT_DAEMON; then
    echo "Tomcat service is running. Stopping ..."
    systemctl stop $TOMCAT_DAEMON
fi
echo "Updating Tomcat service ..."
if [ -e $CATALINA_HOME/bin/$TOMCAT_DAEMON ]; then
    dt=$(date +%Y%m%d%H%M%S)
    mv $CATALINA_HOME/bin/$TOMCAT_DAEMON $CATALINA_HOME/bin/$TOMCAT_DAEMON.bak.${dt}
fi
if [ $USE_SSL -eq 0 ]; then
    echo "... configuring Tomcat for HTTP - check $CATALINA_HOME/conf/server.xml if issues occur in Tomcat deployment."
    cp $CONF_DIR/server.xml.http $CATALINA_HOME/conf/server.xml
else
    echo "... configuring Tomcat for HTTPS - check $CATALINA_HOME/conf/server.xml if issues occur in Tomcat deployment."
    echo "USER ACTION REQUIRED: Be sure to configure Tomcat to use your SSL certificates."
    cp $CONF_DIR/server.xml.ssl $CATALINA_HOME/conf/server.xml
fi

# TODO: ADD BIT FOR SETTING HTTP.PROXY IN CONNECTORS IN SERVER.XML

# Update tomcat service with installed version
cp $SERVICES_DIR/$TOMCAT_DAEMON /etc/systemd/system/
sed -i -e "s|TOMCATDIR|${CATALINA_HOME}|g" /etc/systemd/system/$TOMCAT_DAEMON
chown -R $TOMCAT_USER:$APP_GROUP $CATALINA_HOME
systemctl daemon-reload

# Deploy NLP Services
echo ' '; echo 'Deploying NLP Services to Tomcat ...'
cp $LIB_DIR/$NLP_SERVICES_WAR $CATALINA_HOME/webapps
cp $LIB_DIR/$NLP_WAR $CATALINA_HOME/webapps
echo "... deployed under $CATALINA_HOME/webapps"

# Deploy client (if desired)
read -p 'Deploy Keyterms client under Tomcat? (Y|n) ' clientchoice
case "$clientchoice" in
    n|N)
        echo '... skipping Keyterms client installation.'
        ;;
    *) echo '... deploying Keyterms client to Tomcat ...'
        CLIENT_TOMCAT_DIR=$CATALINA_HOME/webapps/keyterms
        mkdir -p $CLIENT_TOMCAT_DIR
        cp -R $CLIENT_DIR/public/keyterms/* $CLIENT_TOMCAT_DIR
        chown -R $TOMCAT_USER:$APP_GROUP $CLIENT_TOMCAT_DIR

        echo '... copying in config file ...'
        cp $CONF_DIR/client-config.js $CLIENT_TOMCAT_DIR/config.js
        serverURL="$SV_PROTOCOL://$hostname:$SV_PORT/"
        sed -i -e "s|myServerLocation|${serverURL}|g" $CLIENT_TOMCAT_DIR/config.js
        echo "... KeyTerms client deployed to $CLIENT_TOMCAT_DIR"
        echo "USER ATTENTION REQUIRED: If you are having problems with the client under tomcat, please verify the server location setting in $CLIENT_TOMCAT_DIR/config.js"

        echo ' '; read -p 'Would you like to install a script in the ROOT webapp to redirect to the KeyTerms client? (y|N) ' redirectchoice
        case $redirectchoice in
            y|Y)
                echo '... backing up ROOT webapp ...'
                ROOT_DIR=$CATALINA_HOME/webapps/ROOT
                if ! [ -d $CATALINA_HOME/webapps/ROOT_BAK ]; then
                    cp -R $CATALINA_HOME/webapps/ROOT $CATALINA_HOME/webapps/ROOT_BAK
                fi
                echo '... configuring ROOT for KeyTerms redirect ...'
                cp $CONF_DIR/root-default-web.xml $ROOT_DIR/WEB-INF/web.xml
                if [ -e $ROOT_DIR/index.html ]; then
                    rm $ROOT_DIR/index.html
                fi
                cp $CONF_DIR/root-redirect-index.jsp $ROOT_DIR/index.jsp
                echo '... done. ROOT will now redirect to KeyTerms'
                ;;
            *)
                echo '... not installing redirect. ROOT webapp will remain accessible.'
                ;;
        esac
        ;;
esac

# Restart Tomcat
systemctl start $TOMCAT_DAEMON
systemctl enable $TOMCAT_DAEMON

################################################################################

# Clean up temporary files
rm -f $SCRIPTS_DIR/proxy-vars
rm -f $SCRIPTS_DIR/install-vars

# Run init-cli script
echo ' '
read -p 'Component installation complete. Run database initialization script? (Y|n) ' dbChoice
case $dbChoice in
    n|N)
        ;;
    *)
        cd $SERVER_DEPLOY_DIR
        npm run init-cli
        echo 'Database initialization complete.'
        ;;
esac

chown -R $NODEJS_USER:$APP_GROUP $SERVER_DEPLOY_DIR
systemctl restart ktserver

echo ' '
echo "KeyTerms installation complete."
