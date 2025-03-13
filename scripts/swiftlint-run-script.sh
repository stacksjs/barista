#!/bin/bash

# Path to SwiftLint from Swift Package Manager
SWIFT_PACKAGE_DIR="${BUILD_DIR%Build/*}SourcePackages/artifacts"
SWIFTLINT_CMD=$(ls "$SWIFT_PACKAGE_DIR"/swiftlintplugins/SwiftLintBinary/SwiftLintBinary.artifactbundle/swiftlint-*-macos/bin/swiftlint 2>/dev/null | head -n 1)

if test -f "$SWIFTLINT_CMD" 2>/dev/null; then
    echo "Using SwiftLint from Swift Package Manager: $SWIFTLINT_CMD"
    "$SWIFTLINT_CMD" --fix && "$SWIFTLINT_CMD"
elif command -v swiftlint >/dev/null 2>&1; then
    echo "Using SwiftLint from PATH"
    swiftlint --fix && swiftlint
else
    echo "warning: SwiftLint not found. Add it via Swift Package Manager:"
    echo "1. File > Add Packages..."
    echo "2. Enter: https://github.com/SimplyDanny/SwiftLintPlugins"
    echo "3. Add the SwiftLintBuildToolPlugin to your target's build phases"
fi