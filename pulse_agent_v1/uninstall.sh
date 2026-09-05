#!/bin/bash
# PulseBoard Agent Uninstaller

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BINARY_NAME="pulse-agent"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_PATH="${INSTALL_DIR}/${BINARY_NAME}"

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PulseBoard Agent Uninstaller         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if binary exists
if [ ! -f "${BINARY_PATH}" ]; then
    echo -e "${YELLOW}Binary not found at ${BINARY_PATH}${NC}"
    exit 0
fi

# Stop service if running
if systemctl is-active --quiet pulse-agent 2>/dev/null; then
    echo -e "${BLUE}Stopping systemd service...${NC}"
    sudo systemctl stop pulse-agent
    sudo systemctl disable pulse-agent 2>/dev/null || true
fi

# Remove binary
echo -e "${BLUE}Removing binary from ${BINARY_PATH}...${NC}"
rm -f "${BINARY_PATH}"

# Remove systemd service file if exists
SERVICE_FILE="/etc/systemd/system/pulse-agent.service"
if [ -f "${SERVICE_FILE}" ]; then
    echo -e "${BLUE}Removing systemd service...${NC}"
    sudo rm -f "${SERVICE_FILE}"
    sudo systemctl daemon-reload
fi

# Remove config directory
CONFIG_DIR="${HOME}/.config/pulse-agent"
if [ -d "${CONFIG_DIR}" ]; then
    echo -e "${BLUE}Removing config directory ${CONFIG_DIR}...${NC}"
    rm -rf "${CONFIG_DIR}"
fi

# Remove from PATH in shell config (optional - just warn)
SHELL_CONFIGS=("${HOME}/.bashrc" "${HOME}/.zshrc" "${HOME}/.profile")
for config in "${SHELL_CONFIGS[@]}"; do
    if [ -f "$config" ] && grep -q "PulseBoard Agent" "$config"; then
        echo -e "${YELLOW}Note: PATH entry for ${INSTALL_DIR} still exists in $config${NC}"
        echo -e "${YELLOW}You may want to manually remove the 'PulseBoard Agent' section from $config${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ PulseBoard Agent uninstalled successfully!${NC}"
echo ""
echo -e "${YELLOW}Note: You may need to restart your terminal or run:${NC}"
echo "  source ~/.bashrc  # or ~/.zshrc"