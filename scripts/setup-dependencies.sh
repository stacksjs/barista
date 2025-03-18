#!/bin/bash
# Script to set up all dependencies for Barista

# Color setup
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Barista Dependencies Setup  ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Step 1: Install Sparkle Framework
echo -e "${YELLOW}Step 1: Installing Sparkle Framework...${NC}"
./scripts/install_sparkle.sh
echo ""

# Step 2: Generate signing keys for Sparkle
echo -e "${YELLOW}Step 2: Generating signing keys...${NC}"
./scripts/generate_ed25519_keys.sh
echo ""

# Step 3: Set up Swift Package Manager dependencies
echo -e "${YELLOW}Step 3: Setting up Swift Package Manager dependencies...${NC}"

# Create .xcodespm directory if it doesn't exist
mkdir -p .xcodespm

# Create a Swift package resolution file if it doesn't exist
if [ ! -f "Package.resolved" ]; then
    echo -e "${YELLOW}Creating Package.resolved file...${NC}"
    cat > Package.resolved << EOF
{
  "object": {
    "pins": [
      {
        "package": "HotKey",
        "repositoryURL": "https://github.com/soffes/HotKey",
        "state": {
          "branch": null,
          "revision": "a3cf605d7a96f6ff50e04fcb6dea6e2613cfcbe4",
          "version": "0.2.1"
        }
      },
      {
        "package": "Sparkle",
        "repositoryURL": "https://github.com/sparkle-project/Sparkle",
        "state": {
          "branch": null,
          "revision": "5e408a3f3b5b148446f192c7bcc8aadbc8979b31",
          "version": "2.7.0"
        }
      }
    ]
  },
  "version": 1
}
EOF
fi

# Check if swift is available
if command -v swift >/dev/null 2>&1; then
    echo -e "${YELLOW}Resolving Swift Package dependencies...${NC}"
    swift package resolve
else
    echo -e "${RED}Swift command not found. Please install Xcode command line tools.${NC}"
    echo -e "${RED}You can install them with: xcode-select --install${NC}"
fi

# Step 4: Update build phase info
echo -e "${YELLOW}Step 4: Checking build phases...${NC}"
echo -e "${YELLOW}Please make sure you've added the Copy Frameworks build phase to your Xcode project.${NC}"
echo -e "${YELLOW}See docs/BUILD_INSTRUCTIONS.md for details.${NC}"
echo ""

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open the Xcode project: src/Barista.xcodeproj"
echo "2. Add the Copy Frameworks build phase if you haven't already"
echo "3. Build and run the app"
echo ""
echo "For more details see:"
echo "- docs/BUILD_INSTRUCTIONS.md"
echo "- docs/SPARKLE_UPDATES.md"
echo ""