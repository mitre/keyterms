#!/usr/bin/env bash

client_root=$(cd "$(dirname $0)/.."; pwd)
zip_file="keyterms-client.tgz"

echo 'Building public directory...'
cd $client_root
read -p 'Compile code to ES5? (y|N) ' choice
case "$choice" in
    y|Y)
        npm run build
        ;;
    *)
        npm run build-es6
        ;;
esac

echo "Running npm install..."
npm install

echo "Creating deploy directory..."
rm -rf deploy
mkdir deploy
cd deploy

echo "Cloning public directory..."
mkdir -p keyterms-client/dist
cd keyterms-client/dist
cp -r $client_root/public/ .

echo "Packaging installation notes..."
cd ..
cp $client_root/install_notes.* .

echo "Compressing client files..."
cd ..
tar -czf $zip_file ./keyterms-client/

echo "Cleaning up..."
rm -rf ./keyterms-client/

echo "Deployment created as $zip_file"
