#!/usr/bin/env bash

server_root=$(cd "$(dirname $0)/.."; pwd)
zip_file="keyterms-server-$(date +%Y-%m-%d.%H-%M).tgz"

echo "Creating deploy directory..."
cd $server_root
rm -rf deploy
mkdir deploy
cd deploy

echo "Cloning dist directory..."
mkdir -p keyterms-server/dist
cd keyterms-server/dist
cp -r $server_root/dist/* .

echo "Running npm install..."
npm install

echo "Cleaning out docs, logs, and tmp directories..."
rm -rf ./docs/dist/*
rm -rf ./logs/*
rm -rf ./tmp/*

read -p 'Generate API documentation? (y|N) ' docschoice
case "$docschoice" in
    y|Y)
        npm run gen-docs
        ;;
    *)
        ;;
esac

echo "Packaging installation notes..."
cd ..
cp $server_root/install_notes.* .

if [ "$1" = "--full" ]; then
    echo "Including dependency binaries..."
    mkdir lib
    cp -r $server_root/lib/* ./lib
fi

echo "Compressing server files..."
cd ..
tar -czf $zip_file ./keyterms-server/

echo "Cleaning up..."
rm -rf ./keyterms-server/

echo "Deployment created as $zip_file"
