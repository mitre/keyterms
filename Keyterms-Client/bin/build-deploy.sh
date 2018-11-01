#!/usr/bin/env bash

client_root="$(cd "$(dirname $0)/.."; pwd)"
zip_file="keyterms-client-$(date +%Y-%m-%d.%H-%M).tgz"

echo "Running npm install..."
cd $client_root
npm install

echo "Creating deploy directory..."
rm -rf deploy
mkdir deploy

echo 'Building public directory...'
mkdir public/keyterms
read -p 'Compile code to ES5? (y|N) ' choice
case "$choice" in
    y|Y)
        npm run build
        ;;
    *)
        npm run build-es6
        ;;
esac

echo "Cloning public directory..."
cd deploy
mkdir keyterms-client
cd keyterms-client
cp -r $client_root/public/ .

echo "Packaging installation notes..."
cp $client_root/install_notes.* .

echo "Compressing client files..."
cd ..
tar -czf $zip_file ./keyterms-client/

echo "Cleaning up..."
rm -rf ./keyterms-client/

echo "Deployment created as $zip_file"
