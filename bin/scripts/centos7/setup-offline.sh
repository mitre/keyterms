#!/bin/sh

################################################################################
# Sets up KeyTerms for offline installation.
#
# ---- THIS SCRIPT SHOULD BE RUN AS ROOT. ----
################################################################################

# Directories
APP_DIR=/usr/opt
PROJ_DIR=$(cd "$(dirname $0)/../../.."; pwd)
LIB_DIR=$PROJ_DIR/lib
SCRIPTS_DIR=$PROJ_DIR/bin/scripts
SERVICES_DIR=$PROJ_DIR/bin/services
CONF_DIR=$PROJ_DIR/bin/conf
CLIENT_DIR=$PROJ_DIR/Keyterms-Client
SERVER_DIR=$PROJ_DIR/Keyterms-Server

# Groups and users
APP_GROUP=keyterms
TOMCAT_USERNAME=kt_tomcat
NODEJS_USERNAME=kt_nodejs

# Services
TOMCAT_DAEMON=tomcat.service

# Get supported dependency versions
source $SCRIPTS_DIR/supported-dependencies

# Check if running as root, abort if not.
if ! whoami | grep -q "root$"; then
    echo 'Script must be run as root. Aborting'
    exit 0
fi

################################################################################
# Set up application group and directory
################################################################################

# Create application group for KeyTerms if it doesn't exist.
echo ' '; echo 'Setting up application group ...'
if [ $(getent group $APP_GROUP) ]; then
    echo "... $APP_GROUP group exists."
else
    echo "... creating $APP_GROUP group ..."
    groupadd $APP_GROUP
    echo "... $APP_GROUP group created."
fi

# Create application directory
echo ' '; echo 'Setting up directory for KeyTerms ...'
mkdir -p $APP_DIR
chown root:$APP_GROUP $APP_DIR
chmod -R g+w $APP_DIR
cd $APP_DIR
echo "... application directory: $APP_DIR"

################################################################################
# Unpack KeyTerms server and client
################################################################################

# Unpack server
cd $PROJ_DIR
tar -xf $LIB_DIR/keyterms-server.tgz && mv keyterms-server Keyterms-Server

# Unpack client
tar -xf $LIB_DIR/keyterms-client.tgz && mv keyterms-client Keyterms-Client

################################################################################
# Check for Tomcat installation
################################################################################

echo ' '; echo '---------------------------------------------------------------'
echo 'Checking for Tomcat installation ...'
if [ -n "$CATALINA_HOME" ]; then
    export TOMCAT_USER=$(stat -c '%U' $CATALINA_HOME)
    echo "... Tomcat user is $TOMCAT_USER"
    if ! id -Gn $TOMCAT_USER | grep -q -c $APP_GROUP; then
        echo '... adding Tomcat user to KeyTerms group ...'
        usermod -a -G $APP_GROUP $TOMCAT_USER
    fi
    echo ' '
    sh $CATALINA_HOME/bin/version.sh
else
    read -p "... Tomcat installation not found. If Tomcat has been installed, make sure CATALINA_HOME is exported. If not, install Tomcat (v$SUPPORTED_TOMCAT_VERSION) now? (y|N) " tomcatchoice
    case "$tomcatchoice" in
        y|Y)
            ARCHIVE="apache-tomcat-$SUPPORTED_TOMCAT_VERSION"
            mkdir -p $APP_DIR/tomcat
            cd $APP_DIR/tomcat

            # Check if Tomcat was bundled
            if ! [ -e $LIB_DIR/$ARCHIVE.tar.gz ]; then
                echo '... Tomcat was not bundled with KeyTerms, and cannot be installed.'
                echo 'Exiting.'; exit 0
            fi

            echo '... unpacking Tomcat ...'
            tar -xf $ARCHIVE.tar.gz
            rm -f $ARCHIVE.tar.gz
            export CATALINA_HOME="$APP_DIR/tomcat/$ARCHIVE"

            echo '... creating Tomcat user ...'
            export TOMCAT_USER=$TOMCAT_USERNAME
            useradd -M -g $APP_GROUP $TOMCAT_USER
            chown -R $TOMCAT_USER:$APP_GROUP $CATALINA_HOME

             echo "... Tomcat setup finished. CATALINA_HOME is $CATALINA_HOME"
            ;;
        *)
            echo '... Tomcat will not be installed at this time, but setup cannot continue without Tomcat.'
            echo 'Exiting'; exit 0
            ;;
    esac
fi

echo "... setting up Tomcat service ..."
if [ -e /etc/systemd/system/$TOMCAT_DAEMON ]; then
    dt=$(date +%Y%m%d%H%M%S)
    mv /etc/systemd/system/$TOMCAT_DAEMON $CATALINA_HOME/$TOMCAT_DAEMON.bak.${dt}
    echo "$TOMCAT_DAEMON has been backed up to $CATALINA_HOME/bin/$TOMCAT_DAEMON.bak.${dt}"
 fi
 cp $SERVICES_DIR/$TOMCAT_DAEMON /etc/systemd/system/
 chown -R $TOMCAT_USER:$APP_GROUP $CATALINA_HOME
 systemctl daemon-reload

################################################################################
# Check for Node.js installation
################################################################################

echo ' '; echo '---------------------------------------------------------------'
echo 'Checking for Node.js installation...'
if ! [ -x "$(command -v node)" ] | [ -x "$(command -v nodejs)" ]; then
    read -p "... Node.js not installed. Install Node.js (v$SUPPORTED_NODEJS_VERSION) now? (y|N) " nodechoice
    case "$nodechoice" in
        y|Y)
            ARCHIVE="node-v$SUPPORTED_NODEJS_VERSION-linux-x64"
            mkdir -p $APP_DIR/nodejs
            cd $APP_DIR/nodejs

            # Check if Node.js was bundled
            if ! [ -e $LIB_DIR/$ARCHIVE.tar.gz ]; then
                echo '... Node.js was not bundled with KeyTerms, and cannot be installed.'
                echo 'Exiting.'; exit 0
            fi

            echo '... unpacking nodejs ...'
            tar -xf $ARCHIVE.tar.gz
            rm -f $ARCHIVE.tar.gz

            # Set up symlinks
            if [ -L /usr/bin/node ]; then rm -rf /usr/bin/node; fi
            if [ -L /usr/bin/nodejs ]; then rm -rf /usr/bin/nodejs; fi
            if [ -L /usr/bin/npm ]; then rm -rf /usr/bin/npm; fi
            if [ -x $APP_DIR/nodejs/$ARCHIVE/bin/npm ]; then
                ln -s $APP_DIR/nodejs/$ARCHIVE/bin/npm /usr/bin/npm
            fi
            if [ -x $APP_DIR/nodejs/$ARCHIVE/bin/node ]; then
                ln -s $APP_DIR/nodejs/$ARCHIVE/bin/node /usr/bin/node
                ln -s $APP_DIR/nodejs/$ARCHIVE/bin/nodejs /usr/bin/nodejs
            fi

            echo '... creating nodejs user ...'
            export NODEJS_USER=$NODEJS_USERNAME
            useradd -M -g $APP_GROUP $NODEJS_USER
            chown -R $NODEJS_USER:$APP_GROUP $APP_DIR/nodejs

            echo "... nodejs installed in $APP_DIR/nodejs/$ARCHIVE"
            ;;
        *)
            echo '... Node.js will not be installed at this time, but setup cannot continue without Node.js.'
            echo 'Exiting'; exit 0
            ;;
    esac
else
    if [ -x "$(command -v node)" ]; then
        NODE_V=`node --version`
        echo "... Node.js version $NODE_V is installed."
    else
        NODE_V=`nodejs --version`
        echo "... Node.js version $NODE_V is installed."
    fi
    export NODEJS_USER=$NODEJS_USERNAME
    if cut -d: -f1 /etc/passwd | grep -q -w $NODEJS_USER
    then
        echo "... nodejs user exists: $NODEJS_USER"
        if ! id -Gn $NODEJS_USER | grep -q -c $APP_GROUP ; then
            usermod -a -G $APP_GROUP $NODEJS_USER
        fi
    else
        echo  "... creating user $NODEJS_USER"
        useradd -M -g $APP_GROUP $NODEJS_USER
        chown -R $NODEJS_USER:$APP_GROUP $APP_DIR/nodejs
    fi
fi

################################################################################
# Check for mongo installation
################################################################################

echo ' '; echo '---------------------------------------------------------------'
echo 'Checking mongo installation ...'
if ! [ -x "$(command -v mongo)" ] | [ -x "$(command -v mongod)" ] ; then
    echo "... mongo is not installed. If you choose not to install mongo, you must later configure KeyTerms to point to an external mongo server."
    read -p "... Install mongo (v$SUPPORTED_MONGODB_VERSION) now? (y|N) " mongochoice
    case "$mongochoice" in
        y|Y)
            MONGO_LIB=$LIB_DIR/mongodb
            VER=$SUPPORTED_MONGODB_VERSION
            RPM_BASE="$MONGO_LIB/mongodb-org-$VER.rpm"
            RPM_SERVER="$MONGO_LIB/mongodb-org-server-$VER.rpm"
            RPM_SHELL="$MONGO_LIB/mongodb-org-shell-$VER.rpm"
            RPM_MONGOS="$MONGO_LIB/mongodb-org-mongos-$VER.rpm"
            RPM_TOOLS="$MONGO_LIB/mongodb-org-tools-$VER.rpm"

            # Install mongo packages if they're provided
            echo '... installing mongo ...'
            test -e RPM_BASE && rpm -U RPM_BASE
            test -e RPM_SERVER && rpm -U RPM_SERVER
            test -e RPM_SHELL && rpm -U RPM_SHELL
            test -e RPM_MONGOS && rpm -U RPM_MONGOS
            test -e RPM_TOOLS && rpm -U RPM_TOOLS
            echo '... mongo installation complete.'

            echo '... setting up mongo service ...'
            SE_STATUS=`getenforce`
            if [ "$SE_STATUS" = "Enforcing" ]; then
                echo "SE linux is enforcing, adding mongo default port 27017."
                semanage port -a -t mongod_port_t -p tcp 27017
            else
                if [ "$SE_STATUS" = "Disabled" ]; then
                    echo "SE linux is disabled.  Mongo default port 27017 should be accessible."
                else
                    echo "Se linux is in permissive mode. Mongo default port 27017 should be accessible."
                fi
            fi
            systemctl start mongod.service
            systemctl enable mongod.service
            ;;
        *)
            echo '... skipping mongo installation.'
            ;;
    esac
else
    if [ -x "$(command -v mongo)" ]; then
        MONGO_V=`mongo --version`
        echo "... mongo version $MONGO_V is installed."
    else
        MONGOD_V=`mongod --version`
        echo "... mongod version $MONGOD_V is installed."
    fi
fi

################################################################################
# Check for elasticsearch installation
################################################################################

echo ' '; echo '---------------------------------------------------------------'
echo 'Checking for elasticsearch installation ...'
ELASTIC_SYSTEMCTL_LIST_STAT=`systemctl list-unit-files | grep -o ^elasticsearch`
if [ ${ELASTIC_SYSTEMCTL_LIST_STAT} ] || yum list installed elasticsearch >/dev/null 2>&1 || rpm -q elasticsearch; then
    ES_INSTALLED_VERSION=`rpm -q elasticsearch`
    if ! [ ${ES_INSTALLED_VERSION} ]; then
        ES_INSTALLED_VERSION=`yum info elasticsearch | perl -le 's/version\\s*\\:\\s*([0-9](?:[\\\\.[0-9]+)*/$1/'`
    fi
    echo "... elasticsearch v${ES_INSTALLED_VERSION} is already installed."
else
    echo "... elasticsearch installation not found. If you choose not to install elasticsearch, you must later configure KeyTerms to point to an external elasticsearch instance."
    read -p "... Install elasticsearch (v$SUPPORTED_ELASTIC_VERSION) now? (y|N) " elasticchoice
    case "$elasticchoice" in
        y|Y)
            ARCHIVE="elasticsearch-$SUPPORTED_ELASTIC_VERSION"

            # Check if elasticsearch was bundled
            if ! [ -e $LIB_DIR/$ARCHIVE.rpm ]; then
                echo '... elasticsearch was not bundled with KeyTerms, and cannot be installed.'
                echo 'Exiting.'; exit 0
            fi

            echo '... installing elasticsearch ...'
            rpm --install "./$ARCHIVE.rpm"
            echo '... elasticsearch install finished.'

            echo '... starting elasticsearch service ...'
            systemctl start elasticsearch.service
            systemctl enable elasticsearch.service
            ;;
        *)
            echo '... skipping elasticsearch installation.'
            ;;
    esac
fi

################################################################################
# Run installer
################################################################################

cd $PROJ_DIR
echo ' '
read -p 'Setup finished. Run installer now? (y|N) ' choice
case "$choice" in
    y|Y)
        sh $SCRIPTS_DIR/chosen-os/install.sh
        ;;
    *)
        echo 'Exiting.'
        ;;
esac
