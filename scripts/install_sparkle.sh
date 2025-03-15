#!/bin/bash

# Script to download and set up Sparkle framework for the Barista app

# Create Frameworks directory if it doesn't exist
mkdir -p Frameworks

# Set up version and URL
SPARKLE_VERSION="2.7.0"
SPARKLE_URL="https://github.com/sparkle-project/Sparkle/releases/download/$SPARKLE_VERSION/Sparkle-$SPARKLE_VERSION.tar.xz"

# Download Sparkle
echo "Downloading Sparkle $SPARKLE_VERSION..."
curl -L "$SPARKLE_URL" -o sparkle.tar.xz

# Extract Sparkle
echo "Extracting Sparkle..."
tar -xf sparkle.tar.xz

# Copy Sparkle.framework to our Frameworks directory
echo "Installing Sparkle.framework..."
cp -R Sparkle.framework Frameworks/

# Clean up downloaded and extracted files
rm -f sparkle.tar.xz
rm -rf Sparkle.framework

# Create generate_keys.sh for key generation
cat > generate_keys.sh << 'EOF'
#!/bin/bash

# Generate an EdDSA key pair for Sparkle updates
./Frameworks/Sparkle.framework/Resources/sparkle_generate_keys

echo ""
echo "Instructions:"
echo "1. Copy the PUBLIC key to the SUPublicEDKey entry in your Info.plist"
echo "2. Keep the PRIVATE key secure and use it to sign your updates"
EOF

chmod +x generate_keys.sh

echo "Sparkle framework has been installed!"
echo "To generate keys for app updates, run: ./generate_keys.sh"
echo ""
echo "Don't forget to update your Info.plist with your appcast URL and public key!"