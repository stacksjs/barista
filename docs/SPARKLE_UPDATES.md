# Sparkle Updates for Barista

This document explains how to use Sparkle for automatic updates in Barista.

## Setup Instructions

1. **Install Sparkle Framework**

   Run the provided installation script:

   ```bash
   ./install_sparkle.sh
   ```

   This will download Sparkle 2.7.0 and set it up in your project.

2. **Generate Update Keys**

   After running the installation script, generate your EdDSA key pair:

   ```bash
   ./generate_keys.sh
   ```

   This will generate a public and private key pair. The public key should be added to your Info.plist file, and the private key should be kept secure and used to sign updates.

3. **Configure Info.plist**

   The Info.plist has already been configured with the following keys:

   ```xml
   <key>SUFeedURL</key>
   <string>https://your-update-server.com/appcast.xml</string>
   <key>SUPublicEDKey</key>
   <string>YOUR_SPARKLE_ED_PUBLIC_KEY</string>
   <key>SUEnableAutomaticChecks</key>
   <true/>
   <key>SUScheduledCheckInterval</key>
   <integer>86400</integer>
   ```

   Update `SUFeedURL` to point to your appcast.xml location and `SUPublicEDKey` with your generated public key.

4. **Set Up Your Appcast File**

   The appcast.xml file should be hosted on your server. A sample is provided in this repository. Update the following fields:

   - `url`: The URL to download your updated app
   - `sparkle:version`: Your build number (matches CFBundleVersion)
   - `sparkle:shortVersionString`: Your version number (matches CFBundleShortVersionString)
   - `length`: File size in bytes
   - `sparkle:edSignature`: The signature generated with your private key

## Signing Your Updates

To sign your updates, use the `sign_update` tool provided by Sparkle:

```bash
./Frameworks/Sparkle.framework/Resources/sign_update /path/to/your/update.zip -f /path/to/your/private.key
```

Add the generated signature to your appcast.xml file in the `sparkle:edSignature` attribute.

## Testing Updates

To test if your update system is working:

1. Build and run the app
2. Use the "Check for Updates..." menu item
3. The app should check your appcast.xml file and offer the update if available

## Manual Update Checks

Users can manually check for updates via the "Check for Updates..." menu item that's been added to the application menu.

For automatic updates, Sparkle will check on the interval specified in the Info.plist (default: once per day).

## Troubleshooting

If updates aren't working:

- Verify your appcast.xml is accessible from the URL in Info.plist
- Check that your public key in Info.plist matches the private key used for signing
- Verify the version in your appcast is newer than the current app version
- Look for errors in the console related to Sparkle updates
