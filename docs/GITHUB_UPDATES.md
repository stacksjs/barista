# Using GitHub for Sparkle Updates

This guide explains how to use GitHub to host your Sparkle updates for Barista.

## Overview

GitHub is an excellent free platform for hosting your app updates. You can use GitHub in two main ways:

1. **GitHub Releases**: Host your app binaries and appcast.xml in GitHub Releases
2. **GitHub Pages**: Host your appcast.xml on GitHub Pages for better control

## Option 1: Using GitHub Releases (Recommended)

### Step 1: Create a GitHub Repository

If you haven't already, create a public GitHub repository for your app.

### Step 2: Generate Update Keys

Generate your signing keys:

```bash
chmod +x generate_ed25519_keys.sh
./generate_ed25519_keys.sh
```

### Step 3: Update Info.plist

Update your Info.plist with the GitHub URL for your appcast and your public key:

```xml
<key>SUFeedURL</key>
<string>https://raw.githubusercontent.com/username/barista/main/appcast.xml</string>
<key>SUPublicEDKey</key>
<string>YOUR_PUBLIC_KEY</string>
```

### Step 4: Create a Release on GitHub

1. Build your app for release
2. Sign your app update:

   ```bash
   chmod +x sign_update.sh
   ./sign_update.sh /path/to/Barista.zip
   ```

3. Go to your GitHub repository and create a new release:
   - Tag version: v1.8 (or whatever your version is)
   - Release title: Barista 1.8
   - Upload the Barista.zip file to the release

### Step 5: Update appcast.xml

Update the appcast.xml file with the correct:

- URL (pointing to your GitHub release download)
- Version information
- File size
- Signature (from the sign_update.sh script)

```xml
<enclosure
  url="https://github.com/username/barista/releases/download/v1.8/Barista.zip"
  sparkle:version="13"
  sparkle:shortVersionString="1.8"
  length="12345678"
  type="application/octet-stream"
  sparkle:edSignature="YOUR_SIGNATURE" />
```

### Step 6: Commit the appcast.xml to GitHub

```bash
git add appcast.xml
git commit -m "Update appcast for version 1.8"
git push
```

## Option 2: Using GitHub Pages

If you prefer to use GitHub Pages, follow these additional steps:

1. Create a `gh-pages` branch or configure your repository to use GitHub Pages
2. Host your appcast.xml file on GitHub Pages
3. Update your SUFeedURL to point to your GitHub Pages URL:

   ```xml
   <key>SUFeedURL</key>
   <string>https://username.github.io/barista/appcast.xml</string>
   ```

## Automating Updates

You can automate this process with a simple script:

```bash
#!/bin/bash
# Usage: ./release.sh 1.8 13 "Fixed bugs and added features"

VERSION=$1
BUILD=$2
RELEASE_NOTES=$3

# Build your app (customize this command)
# xcodebuild -project Barista.xcodeproj -scheme Barista -configuration Release

# Create a zip file
ditto -c -k --keepParent "build/Release/Barista.app" "Barista-$VERSION.zip"

# Sign the update
./sign_update.sh "Barista-$VERSION.zip"

# Update appcast.xml (you would need to implement this part)
# ...

# Commit and push
git add appcast.xml
git commit -m "Release version $VERSION (build $BUILD)"
git push

# Create a GitHub release
gh release create "v$VERSION" "Barista-$VERSION.zip" --title "Barista $VERSION" --notes "$RELEASE_NOTES"
```

## Updating Your App

Every time you release a new version:

1. Build your app
2. Sign the update with sign_update.sh
3. Create a new GitHub release with the app zip file
4. Update your appcast.xml with the new version details and signature
5. Commit and push the updated appcast.xml

## Testing Updates

To test if your update system is working:

1. Install an older version of your app
2. Update the appcast.xml to advertise a newer version
3. Launch the app and use "Check for Updates"
4. The app should download and install the update from GitHub

## Conclusion

GitHub provides a free and reliable way to host your app updates. With this setup, your app can check for updates, download them from GitHub releases, and install them automatically.
