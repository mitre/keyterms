#!/bin/sh

# Check if npm-bundle is installed
if ! npm list -g npm-bundle; then
    echo 'You must install npm-bundle for this script to work. Run `sudo npm install -g npm-bundle` to install.'
    exit 0
fi

proj_root=$(cd "$(dirname $0)/../../.."; pwd)
zip_file="keyterms-complete.tgz"

# Get supported dependency versions
source $proj_root/bin/scripts/supported-dependencies

# Create deploy folder and copy top-level content over
echo 'Creating deploy directory...'
cd $proj_root
mkdir -p deploy/keyterms-complete
cp -r ./bin/ ./deploy/keyterms-complete/bin/
cp -r ./lib/ ./deploy/keyterms-complete/lib/
cp ./package.json ./deploy/keyterms-complete/package.json

# Prepare server
echo 'Preparing server deployment...'
server_root=$(cd Keyterms-Server; pwd)
sh $server_root/bin/build-deploy.sh
cp $server_root/deploy/keyterms-server.tgz $proj_root/deploy/keyterms-complete/lib/

# Prepare client
echo 'Preparing client deployment...'
client_root=$(cd Keyterms-Client; pwd)
sh $client_root/bin/build-deploy.sh
cp $client_root/deploy/keyterms-client.tgz $proj_root/deploy/keyterms-complete/lib/

# Download third-party dependencies as packages
cd $proj_root/lib

# Java
read -p "Include packaged Java (v10.0.2)? (Y|n) " javachoice
case "$javachoice" in
    n|N)
        echo 'Skipping Java download.'
        ;;
    *)
        wget --no-check-certificate -c --header "Cookie: oraclelicense=accept-securebackup-cookie" http://download.oracle.com/otn-pub/java/jdk/10.0.2+13/19aef61b38124481863b1413dce1855f/jre-10.0.2_linux-x64_bin.rpm
        if [ $? -ne 0 ]; then
            echo 'Download failed. Tomcat will not be included.'
        else
            echo 'Tomcat download successful.'
        fi
        ;;
esac

# Tomcat
read -p "Include packaged Tomcat (v$SUPPORTED_TOMCAT_VERSION)? (Y|n) " tomcatchoice
case "$tomcatchoice" in
    n|N)
        echo 'Skipping Tomcat download.'
        ;;
    *)
        MAJ_VER=$(echo $SUPPORTED_TOMCAT_VERSION | cut -c1-1)
        wget https://archive.apache.org/dist/tomcat/tomcat-$MAJ_VER/v$SUPPORTED_TOMCAT_VERSION/bin/apache-tomcat-$SUPPORTED_TOMCAT_VERSION.tar.gz
        if [ $? -ne 0 ]; then
            echo 'Download failed. Tomcat will not be included.'
        else
            echo 'Tomcat download successful.'
        fi
        ;;
esac

# Node
read -p "Include packaged Node.js (v$SUPPORTED_NODEJS_VERSION)? (Y|n) " nodechoice
case "$nodechoice" in
    n|N)
        echo 'Skipping Node.js download.'
        ;;
    *)
        wget https://nodejs.org/download/release/v$SUPPORTED_NODEJS_VERSION/node-v$SUPPORTED_NODEJS_VERSION-linux-x64.tar.gz
        if [ $? -ne 0 ]; then
            echo 'Download failed. Node.js will not be included.'
        else
            echo 'Node.js download successful.'
        fi
        ;;
esac

# Mongo
read -p "Include packaged mongodb (v$SUPPORTED_MONGODB_VERSION)? (Y|n) " mongochoice
case "$mongochoice" in
    n|N)
        echo 'Skipping mongodb download.'
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
        yumdownloader mongodb-org-$FULL_VER mongodb-org-server-$FULL_VER mongodb-org-shell-$FULL_VER mongodb-org-mongos-$FULL_VER mongodb-org-tools-$FULL_VER
        echo '... mongo download complete.'
        cd ..
        ;;
esac

# ElasticSearch
read -p "Include packaged elasticsearch (v$SUPPORTED_ELASTIC_VERSION)? (Y|n) " elasticchoice
case "$elasticchoice" in
    n|N)
        echo 'Skipping elasticsearch download.'
        ;;
    *)
        wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-$SUPPORTED_ELASTIC_VERSION.rpm
        if [ $? -ne 0 ]; then
            echo 'Download failed. Elasticsearch will not be included.'
        else
            echo 'Elasticsearch download successful.'
        fi
        ;;
esac

# Include packaged http-server
echo 'Bundling http-server...'
npm install http-server
npm-bundle http-server
mv http-server-*.tgz $proj_root/deploy/keyterms-complete/lib/

# Compress entire deployment
echo "Compressing deployment..."
cd $proj_root/deploy
tar -czf $zip_file ./keyterms-complete/

# Clean up deploy folder
echo "Cleaning up..."
rm -rf ./keyterms-complete/
