#!/bin/bash

################################################################################
# Initial setup script. Asks user for OS and online/offline install.
################################################################################

SCRIPT_DIR=$(cd "$(dirname $0)"; pwd)

# Check if running as root, exit if not.
if ! whoami | grep -q "root$"; then
    echo 'Script must be run as root. Exiting'
    exit 0
fi

# Prompt for OS
AVAILABLE_OS=$(ls -dm */ | sed -e 's/centos7/CENTOS7/g' | sed -e 's/\///g' | sed -e 's/, /|/g')
read -p "Choose the operating system that KeyTerms is being installed on ($AVAILABLE_OS): " oschoice
oschoice=$(echo $oschoice | awk '{tolower($0)}')
if [ -z "$oschoice" ]; then
    oschoice='centos7'
fi
if [ -z "$(find $SCRIPT_DIR -mindepth 1 -maxdepth 1 -type d -name $oschoice)" ]; then
    echo 'Invalid option. Exiting'
    exit 0
fi
ln -fs "$oschoice" "$SCRIPT_DIR/chosen-os"

# Prompt for proxy settings
read -p 'If you are behind an http proxy, please enter the proxy URL (press enter if no proxy): ' proxyhttp
if [ -n "$proxyhttp" ]; then
    export http_proxy=$proxyhttp
fi
read -p 'If you are behind an https proxy, please enter the proxy URL (press enter if no proxy, or enter "same" if same as http proxy): ' proxyhttps
case "$proxyhttps" in
    same|Same|SAME)
        export https_proxy=$proxyhttp
        ;;
    *)
        if [ -n "$proxyhttps" ]; then
            export https_proxy=$proxyhttps
        fi
        ;;
esac

# Prompt for local or offline install
read -p 'Install locally or prepare offline deployment? (LOCAL|offline) ' envchoice
if [ -z "$envchoice" ]; then
    envchoice='local'
fi
case "$envchoice" in
    local|LOCAL)
        # Run the local setup script
        echo 'Running local setup...'
        NEXT_SCRIPT=$oschoice/setup.sh
        ;;
    offline|OFFLINE)
        # Run the build-deploy script
        echo 'Running offline deployment build...'
        NEXT_SCRIPT=$oschoice/build-deploy.sh
        ;;
    *)
        echo 'Invalid choice. Exiting'
        exit 0
        ;;
esac

sh $NEXT_SCRIPT
