#!/bin/bash
# PulseBoard Agent Installer
# Usage: curl -fsSL https://github.com/gaurav/pulseboard/releases/latest/download/install.sh | bash
#        curl -fsSL https://github.com/gaurav/pulseboard/releases/download/v1.0.0/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="gaurav/pulseboard"
BINARY_NAME="pulse-agent"
INSTALL_DIR="${HOME}/.local/bin"
VERSION="${VERSION:-latest}"

# Detect OS and Architecture
detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        armv7l) ARCH="armv7" ;;
        *) 
            echo -e "${RED}Unsupported architecture: $ARCH${NC}"
            exit 1
            ;;
    esac
    
    case $OS in
        linux) OS="linux" ;;
        darwin) OS="darwin" ;;
        freebsd) OS="freebsd" ;;
        *) 
            echo -e "${RED}Unsupported OS: $OS${NC}"
            exit 1
            ;;
    esac
    
    PLATFORM="${OS}-${ARCH}"
    echo -e "${BLUE}Detected platform: ${PLATFORM}${NC}"
}

# Get latest release version from GitHub API
get_latest_version() {
    if [ "$VERSION" = "latest" ]; then
        echo -e "${BLUE}Fetching latest release version...${NC}"
        VERSION=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        if [ -z "$VERSION" ]; then
            echo -e "${RED}Failed to fetch latest version${NC}"
            exit 1
        fi
        echo -e "${GREEN}Latest version: ${VERSION}${NC}"
    fi
}

# Download and verify binary
download_binary() {
    local BINARY_NAME="pulse-agent-${PLATFORM}"
    local ARCHIVE_NAME="${BINARY_NAME}.tar.gz"
    local DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARCHIVE_NAME}"
    local CHECKSUM_URL="${DOWNLOAD_URL}.sha256"
    
    echo -e "${BLUE}Downloading ${ARCHIVE_NAME}...${NC}"
    echo -e "${BLUE}From: ${DOWNLOAD_URL}${NC}"
    
    # Create temp directory
    TMP_DIR=$(mktemp -d)
    trap "rm -rf ${TMP_DIR}" EXIT
    
    cd "${TMP_DIR}"
    
    # Download archive
    if ! curl -fL --progress-bar -o "${ARCHIVE_NAME}" "${DOWNLOAD_URL}"; then
        echo -e "${RED}Failed to download ${ARCHIVE_NAME}${NC}"
        echo -e "${YELLOW}Check if release exists: https://github.com/${REPO}/releases/tag/${VERSION}${NC}"
        exit 1
    fi
    
    # Download and verify checksum if available
    if curl -fL -o "${ARCHIVE_NAME}.sha256" "${CHECKSUM_URL}" 2>/dev/null; then
        echo -e "${BLUE}Verifying checksum...${NC}"
        if ! sha256sum -c "${ARCHIVE_NAME}.sha256" 2>/dev/null; then
            echo -e "${RED}Checksum verification failed!${NC}"
            exit 1
        fi
        echo -e "${GREEN}Checksum verified${NC}"
    else
        echo -e "${YELLOW}No checksum file found, skipping verification${NC}"
    fi
    
    # Extract
    tar -xzf "${ARCHIVE_NAME}"
    
    # Verify binary exists
    if [ ! -f "pulse-agent" ]; then
        echo -e "${RED}Binary not found in archive${NC}"
        exit 1
    fi
    
    # Make executable
    chmod +x pulse-agent
    
    # Store path for install
    BINARY_PATH="${TMP_DIR}/pulse-agent"
}

# Install binary
install_binary() {
    echo -e "${BLUE}Installing to ${INSTALL_DIR}...${NC}"
    
    # Create install directory
    mkdir -p "${INSTALL_DIR}"
    
    # Copy binary
    cp "${BINARY_PATH}" "${INSTALL_DIR}/pulse-agent"
    chmod +x "${INSTALL_DIR}/pulse-agent"
    
    echo -e "${GREEN}Installed pulse-agent to ${INSTALL_DIR}/pulse-agent${NC}"
}

# Add to PATH if needed
setup_path() {
    # Check if install dir is in PATH
    case ":${PATH}:" in
        *":${INSTALL_DIR}:"*) 
            echo -e "${GREEN}${INSTALL_DIR} is already in PATH${NC}"
            ;;
        *)
            echo -e "${YELLOW}Adding ${INSTALL_DIR} to PATH...${NC}"
            
            # Detect shell config file
            if [ -n "${ZSH_VERSION}" ]; then
                SHELL_CONFIG="${HOME}/.zshrc"
            elif [ -n "${BASH_VERSION}" ]; then
                SHELL_CONFIG="${HOME}/.bashrc"
            else
                SHELL_CONFIG="${HOME}/.profile"
            fi
            
            # Add to PATH
            echo "" >> "${SHELL_CONFIG}"
            echo "# PulseBoard Agent" >> "${SHELL_CONFIG}"
            echo "export PATH=\"\${PATH}:${INSTALL_DIR}\"" >> "${SHELL_CONFIG}"
            
            echo -e "${GREEN}Added to ${SHELL_CONFIG}${NC}"
            echo -e "${YELLOW}Run: source ${SHELL_CONFIG} (or restart terminal)${NC}"
            ;;
    esac
}

# Verify installation
verify_install() {
    echo -e "${BLUE}Verifying installation...${NC}"
    
    if "${INSTALL_DIR}/pulse-agent" --version; then
        echo -e "${GREEN}Installation verified!${NC}"
    else
        echo -e "${RED}Verification failed${NC}"
        exit 1
    fi
}

# Print next steps
print_next_steps() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ PulseBoard Agent installed successfully!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Configure the agent:"
    echo -e "     ${BLUE}pulse-agent config${NC}"
    echo ""
    echo "  2. Or set environment variables:"
    echo "     export PULSE_AGENT_KAFKA_BROKERS=\"kafka1:9092,kafka2:9092\""
    echo "     export PULSE_AGENT_KAFKA_TOPIC=\"api-logs\""
    echo "     export PULSE_AGENT_OTEL_ENABLED=\"true\""
    echo "     export PULSE_AGENT_OTEL_PORT=\"8083\""
    echo ""
    echo "  3. Start the agent:"
    echo -e "     ${BLUE}pulse-agent start${NC}"
    echo ""
    echo "  4. Or install as systemd service (Linux):"
    echo -e "     ${BLUE}sudo pulse-agent install-service${NC}"
    echo "     sudo systemctl enable --now pulse-agent"
    echo ""
    echo -e "${YELLOW}Documentation: https://docs.pulseboard.io${NC}"
    echo -e "${YELLOW}Issues: https://github.com/gaurav/pulseboard/issues${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     PulseBoard Agent Installer           ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""
    
    detect_platform
    get_latest_version
    download_binary
    install_binary
    setup_path
    verify_install
    print_next_steps
}

# Run main
main "$@"