#!/bin/bash
# One-click setup script for Sparkle auto-updates

# Color setup
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Barista Sparkle Auto-update Setup  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Step 1: Install Sparkle Framework
echo -e "${YELLOW}Step 1: Installing Sparkle Framework...${NC}"
./scripts/install_sparkle.sh
echo ""

# Step 2: Generate signing keys
echo -e "${YELLOW}Step 2: Generating signing keys...${NC}"
./scripts/generate_ed25519_keys.sh
PUBLIC_KEY=$(cat ./keys/sparkle_public.pem | grep -v "BEGIN PUBLIC KEY" | grep -v "END PUBLIC KEY" | tr -d '\n')
echo ""

# Step 3: Update Info.plist with the public key
echo -e "${YELLOW}Step 3: Checking if Info.plist needs updating...${NC}"
INFO_PLIST="./src/barista/Info.plist"

if grep -q "SUPublicEDKey" "$INFO_PLIST"; then
    echo "Info.plist already contains SUPublicEDKey. You may need to update it manually with your new key:"
    echo ""
    echo "$PUBLIC_KEY"
else
    echo "Please update your Info.plist manually with the following key:"
    echo ""
    echo "<key>SUPublicEDKey</key>"
    echo "<string>$PUBLIC_KEY</string>"
fi

echo ""
echo -e "${YELLOW}Step 4: Setting up GitHub repository information...${NC}"
read -p "Enter your GitHub username or organization name: " GITHUB_USER

# Update appcast.xml with the GitHub URL
sed -i '' "s|stacksjs/barista|$GITHUB_USER/barista|g" appcast.xml
echo "Updated appcast.xml with your GitHub information"
echo ""

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To release a new version:"
echo "1. Update your app"
echo "2. Run ./scripts/release.sh VERSION BUILD_NUMBER \"Release notes\""
echo "   Example: ./scripts/release.sh 1.8 13 \"Fixed menu bar issues\""
echo ""
echo "For more details see:"
echo "- docs/SPARKLE_UPDATES.md"
echo "- docs/GITHUB_UPDATES.md"
echo ""