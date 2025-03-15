# Building with Dependencies

After adding Sparkle and HotKey to the project, you need to configure your Xcode project properly to ensure everything builds correctly.

## Running the Setup Script

For the easiest setup, run the provided script:

```bash
./scripts/setup-dependencies.sh
```

This script will:

1. Install the Sparkle framework
2. Generate signing keys for updates
3. Set up Swift Package Manager dependencies
4. Guide you on the next steps

## Swift Package Manager Dependencies

This project uses Swift Package Manager for dependencies like HotKey. If you're experiencing the "No such module 'HotKey'" error, try these steps:

1. Open the Xcode project (`src/Barista.xcodeproj`)
2. Go to File → Swift Packages → Reset Package Caches
3. Go to File → Swift Packages → Resolve Package Versions
4. Clean the build folder (Shift+Cmd+K)
5. Build the project again

If issues persist, try adding the HotKey package manually:

1. In Xcode, go to File → Swift Packages → Add Package Dependency
2. Enter the URL: `https://github.com/soffes/HotKey`
3. Select "Up to Next Major" version with "0.1.3" as the minimum version
4. Make sure the "barista" target is selected

## Adding the Copy Frameworks Build Phase

To ensure Sparkle is properly bundled with the app:

1. Open the Xcode project (`src/Barista.xcodeproj`)
2. Select the project in the Project Navigator
3. Select the "Barista" target
4. Go to the "Build Phases" tab
5. Click the "+" button in the top-left corner and select "New Run Script Phase"
6. Rename the phase to "Copy Frameworks"
7. Enter the following script:

```bash
${PROJECT_DIR}/../scripts/copy-frameworks.sh
```

8. Make sure this build phase comes **after** the "Copy Bundle Resources" phase

## Configuring Code Signing

If you encounter code signing issues:

1. Go to the "Build Settings" tab of your target
2. Find the "Code Signing" section
3. Make sure "Code Signing Identity" is set to your correct identity
4. Set "Code Sign On Copy" to "Yes" for the target

## Building from Command Line

To build from the command line:

```bash
cd src
xcodebuild -project Barista.xcodeproj -scheme Barista -configuration Release
```

## Troubleshooting

If you encounter build issues:

1. **Module Not Found Errors**:
   - Run `./scripts/setup-dependencies.sh`
   - Make sure Swift Package Manager dependencies are correctly set up
   - Check that Xcode can access the package repositories

2. **Framework Not Found**:
   - Make sure the Sparkle framework is in the correct location (Frameworks/Sparkle.framework)
   - Verify the Copy Frameworks build script is working properly

3. **Code Signing Errors**:
   - Check your code signing identity and entitlements
   - Make sure you have the right permissions to sign the app and frameworks

4. **Runtime Issues**:
   - Check the console for errors related to loading frameworks
   - Make sure frameworks are properly copied into the app bundle

The UpdateManager class is designed to handle missing frameworks gracefully, so your app will still work without Sparkle - it just won't have auto-update functionality.
