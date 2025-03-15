#!/bin/bash
# Script to sign updates for Sparkle using OpenSSL

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <file_to_sign>"
    exit 1
fi

FILE_TO_SIGN="$1"
PRIVATE_KEY="./keys/sparkle_private.pem"

if [ ! -f "$FILE_TO_SIGN" ]; then
    echo "Error: File '$FILE_TO_SIGN' not found."
    exit 1
fi

if [ ! -f "$PRIVATE_KEY" ]; then
    echo "Error: Private key file '$PRIVATE_KEY' not found."
    echo "Generate keys first using ./generate_ed25519_keys.sh"
    exit 1
fi

# Calculate the file length in bytes
FILE_LENGTH=$(wc -c < "$FILE_TO_SIGN")

# Generate the base64 signature
echo "Generating EdDSA signature for $FILE_TO_SIGN..."
SIGNATURE=$(openssl dgst -sha256 -sign "$PRIVATE_KEY" "$FILE_TO_SIGN" | openssl base64 -A)

echo ""
echo "======== FILE INFORMATION ========"
echo "Filename: $(basename "$FILE_TO_SIGN")"
echo "File size (bytes): $FILE_LENGTH"
echo ""
echo "======== SIGNATURE ========"
echo "$SIGNATURE"
echo "==========================="
echo ""
echo "Add this information to your appcast.xml file:"
echo ""
echo "<enclosure"
echo "  url=\"https://github.com/username/barista/releases/download/vX.X.X/$(basename "$FILE_TO_SIGN")\""
echo "  sparkle:version=\"VERSION_NUMBER\" "
echo "  sparkle:shortVersionString=\"VERSION_STRING\""
echo "  length=\"$FILE_LENGTH\""
echo "  type=\"application/octet-stream\""
echo "  sparkle:edSignature=\"$SIGNATURE\" />"
echo ""
