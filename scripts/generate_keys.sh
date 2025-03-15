#!/bin/bash

# Generate an EdDSA key pair for Sparkle updates
./Frameworks/Sparkle.framework/Resources/sparkle_generate_keys

echo ""
echo "Instructions:"
echo "1. Copy the PUBLIC key to the SUPublicEDKey entry in your Info.plist"
echo "2. Keep the PRIVATE key secure and use it to sign your updates"
