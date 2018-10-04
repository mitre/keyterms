#!/bin/sh

proj_root=$(cd "$(dirname $0)/../../.."; pwd)
zip_file="keyterms-$(date +%Y-%m-%d.%H-%M).tgz"

# Get supported dependency versions
source $proj_root/bin/scripts/supported-dependencies

# Create deploy folder and copy top-level content over
echo ' '; echo 'Creating deploy directory...'
cd $proj_root
mkdir -p deploy/keyterms
cp -r ./bin/ ./deploy/keyterms/
cp -r ./lib/ ./deploy/keyterms/
cp ./package.json ./deploy/keyterms/package.json

# Prepare server
echo ' '; echo '---------------------------------------------------------------'
echo 'Preparing server deployment...'
server_root=$(cd Keyterms-Server; pwd)
sh $server_root/bin/build-deploy.sh
cp $server_root/deploy/keyterms-server*.tgz $proj_root/deploy/keyterms/lib/

# Prepare client
echo ' '; echo '---------------------------------------------------------------'
echo 'Preparing client deployment...'
client_root=$(cd Keyterms-Client; pwd)
sh $client_root/bin/build-deploy.sh
cp $client_root/deploy/keyterms-client*.tgz $proj_root/deploy/keyterms/lib/

# Download third-party dependencies as packages
echo ' '; echo '---------------------------------------------------------------'
echo 'Preparing dependencies...'
cd $proj_root/deploy/keyterms/lib/

# Java
ARCHIVE="jre-10.0.2_linux-x64_bin.rpm"
echo ' '
read -p "Java 9 or higher is required for KeyTerms. Java 10 is recommended. Include packaged Java 10? (Y|n) " javachoice
case "$javachoice" in
    n|N)
        echo '... skipping Java download.'
        test -f $ARCHIVE && rm -f $ARCHIVE
        ;;
    *)
        if [ -f $ARCHIVE ]; then
            echo '... Java 10 already downloaded. Continuing ...'
        else
            echo '... downloading Java 10 ...'
            curl -# -L -b "oraclelicense=a" http://download.oracle.com/otn-pub/java/jdk/10.0.2+13/19aef61b38124481863b1413dce1855f/$ARCHIVE -O
            if [ $? -ne 0 ]; then
                echo '... download failed. Java will not be included.'
            fi
        fi
        ;;
esac

# Tomcat
ARCHIVE="apache-tomcat-$SUPPORTED_TOMCAT_VERSION.tar.gz"
echo ' '
read -p "Tomcat 9 is required for KeyTerms. Include packaged Tomcat (v$SUPPORTED_TOMCAT_VERSION)? (Y|n) " tomcatchoice
case "$tomcatchoice" in
    n|N)
        echo '... skipping Tomcat download.'
        test -f $ARCHIVE && rm -f $ARCHIVE
        ;;
    *)
        if [ -f $ARCHIVE ]; then
            echo '... Tomcat 9 already downloaded. Continuing ...'
        else
            echo '... downloading Tomcat 9 ...'
            MAJ_VER=$(echo $SUPPORTED_TOMCAT_VERSION | cut -c1-1)
            curl -# -L https://archive.apache.org/dist/tomcat/tomcat-$MAJ_VER/v$SUPPORTED_TOMCAT_VERSION/bin/$ARCHIVE -O
            if [ $? -ne 0 ]; then
                echo '... download failed. Tomcat will not be included.'
            fi
        fi
        ;;
esac

# Node
ARCHIVE="node-v$SUPPORTED_NODEJS_VERSION-linux-x64.tar.gz"
echo ' '
read -p "Node.js version $SUPPORTED_NODEJS_VERSION is required for KeyTerms. Include packaged Node.js (v$SUPPORTED_NODEJS_VERSION)? (Y|n) " nodechoice
case "$nodechoice" in
    n|N)
        echo '... skipping Node.js download.'
        test -f $ARCHIVE && rm -f $ARCHIVE
        ;;
    *)
        if [ -f $ARCHIVE ]; then
            echo '... Node.js already downloaded. Continuing ...'
        else
            echo '... downloading Node.js ...'
            curl -# -L https://nodejs.org/download/release/v$SUPPORTED_NODEJS_VERSION/$ARCHIVE -O
            if [ $? -ne 0 ]; then
                echo '... download failed. Node.js will not be included.'
            fi
        fi
        ;;
esac

# Mongo
echo ' '
read -p "Include packaged mongodb (v$SUPPORTED_MONGODB_VERSION)? (Y|n) " mongochoice
case "$mongochoice" in
    n|N)
        echo '... skipping mongodb download.'
        ;;
    *)
        VER="${SUPPORTED_MONGODB_VERSION%.*}"
        FULL_VER=$SUPPORTED_MONGODB_VERSION
        # Write the repo file if it doesn't exist
        if ! [ -e /etc/yum.repos.d/mongodb-org-$VER.repo ]; then
            cat >/etc/yum.repos.d/mongodb-org-$VER.repo <<EOL
[mongodb-org-$VER]
name=MongoDB $VER Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/$VER/x86_64/
gpgcheck=0
enabled=1
EOL
        fi
        # Check for yum-utils
        yum info yum-utils >/dev/null 2>&1
        if [ $? -ne 0 ]; then
            yum install -y yum-utils
        fi
        # Download mongo packages
        mkdir mongodb
        cd mongodb
        echo '... downloading mongo packages ...'
        for pkg in "mongodb-org-$FULL_VER" "mongodb-org-server-$FULL_VER" "mongodb-org-shell-$FULL_VER" "mongodb-org-mongos-$FULL_VER" "mongodb-org-tools-$FULL_VER"
        do
            if [ -f "$pkg*.rpm" ]; then
                echo "... $pkg already downloaded."
            else
                yumdownloader $pkg
            fi
        done
        echo '... mongo download complete.'
        cd ..
        ;;
esac

# ElasticSearch
ARCHIVE="elasticsearch-$SUPPORTED_ELASTIC_VERSION.rpm"
echo ' '
read -p "Include packaged elasticsearch (v$SUPPORTED_ELASTIC_VERSION)? (Y|n) " elasticchoice
case "$elasticchoice" in
    n|N)
        echo '... skipping elasticsearch download.'
        test -f $ARCHIVE && rm -f $ARCHIVE
        ;;
    *)
        if [ -f $ARCHIVE ]; then
            echo '... elasticsearch already downloaded.'
        else
            echo '... downloading elasticsearch ...'
            curl -# -L https://artifacts.elastic.co/downloads/elasticsearch/$ARCHIVE -O
            if [ $? -ne 0 ]; then
                echo '... download failed. Elasticsearch will not be included.'
            fi
        fi
        ;;
esac

# Compress entire deployment
echo ' '; echo "Compressing deployment..."
cd $proj_root/deploy
tar -czf $zip_file ./keyterms/

# Clean up deploy folder
echo "Cleaning up..."
rm -rf ./keyterms/

echo "Build complete. Deploy archive can be found in $proj_root/deploy/$zip_file."
echo "To continue offline installation, copy this archive to your desired location, unpack, and from within the root directory of the archive run 'sudo sh bin/scripts/chosen-os/setup-offline.sh'."
