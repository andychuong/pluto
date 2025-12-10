#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

INSTALL_DIR="$HOME/.pluto"
BIN_LOCATIONS=("/usr/local/bin/pluto" "$HOME/.local/bin/pluto")

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║                                           ║"
echo "║   🪐 PLUTO UNINSTALLER                    ║"
echo "║                                           ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Confirm uninstall
read -p "Are you sure you want to uninstall Pluto? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Uninstall cancelled.${NC}"
    exit 0
fi

echo ""

# Remove symlinks
for BIN_PATH in "${BIN_LOCATIONS[@]}"; do
    if [ -L "$BIN_PATH" ] || [ -f "$BIN_PATH" ]; then
        if [ -w "$(dirname "$BIN_PATH")" ]; then
            rm -f "$BIN_PATH"
            echo -e "${GREEN}✓${NC} Removed ${BIN_PATH}"
        else
            sudo rm -f "$BIN_PATH" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed ${BIN_PATH}" || true
        fi
    fi
done

# Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}✓${NC} Removed ${INSTALL_DIR}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Pluto has been uninstalled.${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "Note: Project-specific .pluto/ folders were not removed."
echo -e "You can delete them manually if needed."
echo ""
