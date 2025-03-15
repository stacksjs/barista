#!/bin/bash
# Generate Ed25519 keys for Sparkle using OpenSSL

# Create keys directory if it doesn't exist
mkdir -p ./keys

# Generate private key
echo "Generating private key..."
openssl genpkey -algorithm ED25519 -out ./keys/sparkle_private.pem

# Extract public key
echo "Extracting public key..."
openssl pkey -in ./keys/sparkle_private.pem -pubout -out ./keys/sparkle_public.pem

# Format the public key for Info.plist
echo "Formatting public key for Info.plist..."
PUBLIC_KEY=$(cat ./keys/sparkle_public.pem | grep -v "BEGIN PUBLIC KEY" | grep -v "END PUBLIC KEY" | tr -d '\n')

echo ""
echo "======== SPARKLE PUBLIC KEY ========"
echo "$PUBLIC_KEY"
echo "==================================="
echo ""
echo "Copy the above public key into your Info.plist as the SUPublicEDKey value."
echo "Keep the private key (./keys/sparkle_private.pem) secure - you'll need it to sign updates."
echo ""
echo "Keys have been saved to the ./keys directory"