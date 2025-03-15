#!/bin/bash

# This script copies the Sparkle framework into the app bundle

# Get the path to the Sparkle framework
SPARKLE_FRAMEWORK_PATH="/Users/chrisbreuer/Code/barista/Frameworks/Sparkle.framework"

# Get the path to the app bundle's Frameworks directory
APP_FRAMEWORKS_PATH="/Users/chrisbreuer/Library/Developer/Xcode/DerivedData/Barista-fxdtkqfsjyxxvybjtoomfebcwjrt/Build/Products/Debug/Barista.app/Contents/Frameworks"

# Create the Frameworks directory if it doesn't exist
mkdir -p "${APP_FRAMEWORKS_PATH}"

# Copy the Sparkle framework into the app bundle
cp -R "${SPARKLE_FRAMEWORK_PATH}" "${APP_FRAMEWORKS_PATH}/"

# Make the script executable
chmod -R 755 "${APP_FRAMEWORKS_PATH}/Sparkle.framework"

echo "Copied Sparkle framework to ${APP_FRAMEWORKS_PATH}/Sparkle.framework"