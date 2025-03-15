#!/bin/bash
# Script to copy Sparkle.framework into the app bundle
# To use this script, add a "Run Script" build phase in Xcode with:
# ${PROJECT_DIR}/../scripts/copy-frameworks.sh

# Make sure this script can be run from anywhere
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Define paths
FRAMEWORKS_DIR="$PROJECT_ROOT/Frameworks"
SPARKLE_FRAMEWORK="$FRAMEWORKS_DIR/Sparkle.framework"
TARGET_FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"

# Check if Sparkle framework exists
if [ ! -d "$SPARKLE_FRAMEWORK" ]; then
    echo "Warning: Sparkle.framework not found at $SPARKLE_FRAMEWORK."
    echo "Auto-updates will be disabled."
    exit 0
fi

# Create the Frameworks directory in the app bundle if it doesn't exist
mkdir -p "$TARGET_FRAMEWORKS_DIR"

# Copy Sparkle.framework to the app bundle
echo "Copying Sparkle.framework to $TARGET_FRAMEWORKS_DIR"
cp -R "$SPARKLE_FRAMEWORK" "$TARGET_FRAMEWORKS_DIR"

# Set permissions
chmod -R a+rX "$TARGET_FRAMEWORKS_DIR/Sparkle.framework"

# Check if the copy was successful
if [ -d "$TARGET_FRAMEWORKS_DIR/Sparkle.framework" ]; then
    echo "Successfully copied Sparkle.framework to the app bundle."
else
    echo "Error: Failed to copy Sparkle.framework to the app bundle."
    exit 1
fi