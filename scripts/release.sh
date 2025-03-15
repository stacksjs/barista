#!/bin/bash
# Script to automate releasing a new version of Barista with Sparkle updates
# Usage: ./release.sh 1.8 13 "Fixed bugs and improved performance"

if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <version> <build> <release_notes>"
    echo "Example: $0 1.8 13 \"Fixed bugs and improved performance\""
    exit 1
fi

VERSION=$1
BUILD=$2
RELEASE_NOTES=$3
TEMP_DIR="./temp_release"
APP_PATH="./build/Release/Barista.app"
ZIP_NAME="Barista-$VERSION.zip"

# Ensure the temp directory exists
mkdir -p "$TEMP_DIR"

echo "Preparing release for Barista $VERSION (build $BUILD)..."

# Check if we need to build the app
read -p "Do you want to build the app? (y/n): " BUILD_APP
if [[ $BUILD_APP == "y" || $BUILD_APP == "Y" ]]; then
    echo "Building Barista.app..."

    # Replace this with your actual build command
    xcodebuild -project ./src/Barista.xcodeproj -scheme Barista -configuration Release

    if [ ! -d "$APP_PATH" ]; then
        echo "Error: Build failed or app not found at $APP_PATH"
        exit 1
    fi
else
    # If not building, check if the app exists
    read -p "Enter the path to your built Barista.app: " CUSTOM_APP_PATH
    if [ -n "$CUSTOM_APP_PATH" ]; then
        APP_PATH="$CUSTOM_APP_PATH"
    fi

    if [ ! -d "$APP_PATH" ]; then
        echo "Error: App not found at $APP_PATH"
        exit 1
    fi
fi

# Create a zip of the app
echo "Creating zip archive..."
ditto -c -k --keepParent "$APP_PATH" "$TEMP_DIR/$ZIP_NAME"

# Sign the update
echo "Signing the update..."
./sign_update.sh "$TEMP_DIR/$ZIP_NAME"

# Get the file size
FILE_SIZE=$(wc -c < "$TEMP_DIR/$ZIP_NAME")

# Get the signature (we need to extract it from the output of sign_update.sh)
echo "Please enter the signature from above:"
read SIGNATURE

# Update the appcast.xml
echo "Updating appcast.xml..."
cat > appcast.xml << EOF
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Barista Updates</title>
    <description>Most recent changes with links to updates.</description>
    <language>en</language>
    <item>
      <title>Version $VERSION</title>
      <description>
        <![CDATA[
          <h2>Changes in Barista $VERSION</h2>
          <ul>
            <li>$RELEASE_NOTES</li>
          </ul>
        ]]>
      </description>
      <pubDate>$(date -R)</pubDate>
      <enclosure
        url="https://github.com/stacksjs/barista/releases/download/v$VERSION/$ZIP_NAME"
        sparkle:version="$BUILD"
        sparkle:shortVersionString="$VERSION"
        length="$FILE_SIZE"
        type="application/octet-stream"
        sparkle:edSignature="$SIGNATURE" />
      <sparkle:minimumSystemVersion>13.5</sparkle:minimumSystemVersion>
    </item>
  </channel>
</rss>
EOF

# Ask if the user wants to commit and push to GitHub
read -p "Do you want to commit and push appcast.xml to GitHub? (y/n): " PUSH_TO_GITHUB
if [[ $PUSH_TO_GITHUB == "y" || $PUSH_TO_GITHUB == "Y" ]]; then
    echo "Committing and pushing appcast.xml..."
    git add appcast.xml
    git commit -m "Update appcast for version $VERSION (build $BUILD)"
    git push
else
    echo "Skipping git commit and push."
fi

# Ask if the user wants to create a GitHub release
read -p "Do you want to create a GitHub release? (y/n): " CREATE_RELEASE
if [[ $CREATE_RELEASE == "y" || $CREATE_RELEASE == "Y" ]]; then
    echo "To create a GitHub release, please do the following manually:"
    echo "1. Go to https://github.com/stacksjs/barista/releases/new"
    echo "2. Set the tag version to v$VERSION"
    echo "3. Set the release title to 'Barista $VERSION'"
    echo "4. Add release notes: $RELEASE_NOTES"
    echo "5. Upload the file: $TEMP_DIR/$ZIP_NAME"
    echo "6. Publish the release"
fi

echo "Release preparation complete!"
echo "The updated appcast.xml has been created."
echo "Your release zip is available at: $TEMP_DIR/$ZIP_NAME"
