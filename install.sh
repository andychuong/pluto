#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PLUTO_VERSION="1.0.0"
INSTALL_DIR="$HOME/.pluto"
BIN_DIR="/usr/local/bin"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║                                           ║"
echo "║   🪐 PLUTO INSTALLER                      ║"
echo "║   AI Agent & Command Installer            ║"
echo "║                                           ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required but not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18 or higher is required.${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm -v) detected"

# Create installation directory
echo -e "\n${YELLOW}Installing Pluto to ${INSTALL_DIR}...${NC}\n"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing existing installation...${NC}"
    rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"

# Download and extract (for now, we'll clone from the repo structure)
# In production, this would download a release tarball
# For local development, we copy from the installer directory

# Check if we're running locally (installer directory exists nearby)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/installer" ]; then
    echo -e "${CYAN}Installing from local source...${NC}"
    cp -r "$SCRIPT_DIR/installer/"* "$INSTALL_DIR/"
else
    # Download from GitHub releases (placeholder URL - update when repo is public)
    echo -e "${CYAN}Downloading Pluto v${PLUTO_VERSION}...${NC}"

    DOWNLOAD_URL="https://github.com/your-org/pluto/releases/download/v${PLUTO_VERSION}/pluto-${PLUTO_VERSION}.tar.gz"

    if command -v curl &> /dev/null; then
        curl -fsSL "$DOWNLOAD_URL" -o "/tmp/pluto.tar.gz" || {
            echo -e "${RED}Failed to download Pluto. Please check your internet connection.${NC}"
            exit 1
        }
    elif command -v wget &> /dev/null; then
        wget -q "$DOWNLOAD_URL" -O "/tmp/pluto.tar.gz" || {
            echo -e "${RED}Failed to download Pluto. Please check your internet connection.${NC}"
            exit 1
        }
    else
        echo -e "${RED}Error: curl or wget is required.${NC}"
        exit 1
    fi

    tar -xzf "/tmp/pluto.tar.gz" -C "$INSTALL_DIR"
    rm "/tmp/pluto.tar.gz"
fi

# Install dependencies
echo -e "\n${CYAN}Installing dependencies...${NC}\n"
cd "$INSTALL_DIR"
npm install --silent

# Make entry point executable
chmod +x "$INSTALL_DIR/src/index.js"

# Create symlink in bin directory
echo -e "\n${CYAN}Creating command symlink...${NC}"

# Check if we can write to /usr/local/bin, otherwise use ~/.local/bin
if [ -w "$BIN_DIR" ]; then
    ln -sf "$INSTALL_DIR/src/index.js" "$BIN_DIR/pluto"
    echo -e "${GREEN}✓${NC} Symlink created at ${BIN_DIR}/pluto"
else
    # Try with sudo
    echo -e "${YELLOW}Need sudo access to create symlink in ${BIN_DIR}${NC}"
    sudo ln -sf "$INSTALL_DIR/src/index.js" "$BIN_DIR/pluto" || {
        # Fallback to ~/.local/bin
        BIN_DIR="$HOME/.local/bin"
        mkdir -p "$BIN_DIR"
        ln -sf "$INSTALL_DIR/src/index.js" "$BIN_DIR/pluto"
        echo -e "${GREEN}✓${NC} Symlink created at ${BIN_DIR}/pluto"

        # Check if ~/.local/bin is in PATH
        if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
            echo -e "\n${YELLOW}Note: Add ${BIN_DIR} to your PATH:${NC}"
            echo -e "  Add this line to your ~/.bashrc or ~/.zshrc:"
            echo -e "  ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
        fi
    }
fi

# Verify installation
echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Pluto installed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "Get started by running:"
echo -e "  ${CYAN}pluto init${NC}     - Set up Pluto in your project"
echo -e "  ${CYAN}pluto list${NC}     - View available agents"
echo -e "  ${CYAN}pluto --help${NC}   - Show all commands"
echo ""
