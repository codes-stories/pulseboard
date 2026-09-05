#!/bin/bash
# PulseBoard Agent Release Builder
# Builds multi-arch binaries and packages for GitHub releases

set -e

# Configuration
VERSION="${1:-$(git describe --tags --always --dirty)}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
RELEASE_DIR="${REPO_ROOT}/release/v${VERSION}"
AGENT_DIR="${REPO_ROOT}/pulse_agent_v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PulseBoard Agent Release Builder     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo -e "${BLUE}Release dir: ${RELEASE_DIR}${NC}"
echo ""

# Clean and create release directory
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# Build Erlang agent for multiple platforms using Docker
echo -e "${BLUE}Building Erlang agent for multiple platforms...${NC}"

# Build with rebar3 for current platform first
cd "${AGENT_DIR}"
echo -e "${BLUE}Building for current platform...${NC}"
rebar3 as prod tar

# Find the built release
RELEASE_TAR=$(find _build/prod/rel -name "pulse_agent_v1-*.tar.gz" | head -1)
if [ -f "${RELEASE_TAR}" ]; then
    cp "${RELEASE_TAR}" "${RELEASE_DIR}/pulse_agent_v1-${VERSION}-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m).tar.gz"
    echo -e "${GREEN}Copied ${RELEASE_TAR}${NC}"
fi

# Build for other platforms using Docker
PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
)

for PLATFORM in "${PLATFORMS[@]}"; do
    echo -e "${BLUE}Building for ${PLATFORM}...${NC}"
    
    # Use docker buildx for cross-compilation
    if docker buildx build --platform "${PLATFORM}" \
        -f "${AGENT_DIR}/Dockerfile" \
        -t "pulse-agent:${VERSION}-${PLATFORM//\//-}" \
        --output type=local,dest="${RELEASE_DIR}/agent-${PLATFORM//\//-}" \
        "${AGENT_DIR}" 2>/dev/null; then
        
        # Package the binary
        AGENT_BIN="${RELEASE_DIR}/agent-${PLATFORM//\//-}/pulse_agent_v1"
        if [ -f "${AGENT_BIN}" ]; then
            OS=$(echo "${PLATFORM}" | cut -d'/' -f1)
            ARCH=$(echo "${PLATFORM}" | cut -d'/' -f2)
            ARCHIVE_NAME="pulse-agent-${OS}-${ARCH}.tar.gz"
            
            cd "${RELEASE_DIR}"
            tar -czf "pulse-agent-$(echo ${PLATFORM} | sed 's|/|-|g').tar.gz" -C "agent-${PLATFORM//\//-}" pulse_agent_v1
            echo -e "${GREEN}Created pulse-agent-$(echo ${PLATFORM} | sed 's|/|-|g').tar.gz${NC}"
        fi
    else
        echo -e "${YELLOW}Failed to build for ${PLATFORM} (may not be supported)${NC}"
    fi
done

# Build Go backend binaries
echo -e "${BLUE}Building Go backend binaries...${NC}"
cd "${REPO_ROOT}/backend"

GO_BINARIES=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
)

for PLATFORM in "${GO_BINARIES[@]}"; do
    OS=$(echo "${PLATFORM}" | cut -d'/' -f1)
    ARCH=$(echo "${PLATFORM}" | cut -d'/' -f2)
    
    echo -e "${BLUE}Building backend for ${OS}/${ARCH}...${NC}"
    
    EXT=""
    [ "${OS}" = "windows" ] && EXT=".exe"
    
    BINARY_NAME="backend-${OS}-${ARCH}${EXT}"
    GOOS=${OS} GOARCH=${ARCH} go build -o "${RELEASE_DIR}/${BINARY_NAME}" ./cmd/api
    
    if [ -f "${RELEASE_DIR}/${BINARY_NAME}" ]; then
        echo -e "${GREEN}Created ${BINARY_NAME}${NC}"
    fi
done

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
cd "${REPO_ROOT}/pluseboard-monitoring"
npm run build 2>/dev/null || echo -e "${YELLOW}Frontend build failed or not configured${NC}"

# Package frontend dist
if [ -d ".next" ]; then
    cd "${REPO_ROOT}/pluseboard-monitoring"
    tar -czf "${RELEASE_DIR}/frontend-dist.tar.gz" .next public
    echo -e "${GREEN}Created frontend-dist.tar.gz${NC}"
fi

# Copy configuration files
echo -e "${BLUE}Copying configuration files...${NC}"
cd "${REPO_ROOT}"

cp docker-compose.prod.yml "${RELEASE_DIR}/" 2>/dev/null || true
cp pulse_agent_v1/config.yaml.example "${RELEASE_DIR}/config.yaml.example" 2>/dev/null || true

# Create install script
cat > "${RELEASE_DIR}/install.sh" << 'EOF'
#!/bin/bash
# PulseBoard Agent Installer
# Usage: curl -fsSL https://github.com/gaurav/pulseboard/releases/latest/download/install.sh | bash

set -e

REPO="gaurav/pulseboard"
BINARY_NAME="pulse-agent"
INSTALL_DIR="${HOME}/.local/bin"
VERSION="${VERSION:-latest}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac
    case $OS in
        linux) OS="linux" ;;
        darwin) OS="darwin" ;;
        *) echo -e "${RED}Unsupported OS: $OS${NC}"; exit 1 ;;
    esac
    PLATFORM="${OS}-${ARCH}"
    echo -e "${BLUE}Detected platform: ${PLATFORM}${NC}"
}

get_latest_version() {
    if [ "$VERSION" = "latest" ]; then
        echo -e "${BLUE}Fetching latest release version...${NC}"
        VERSION=$(curl -s "https://api.github.com/repos/gaurav/pulseboard/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        [ -z "$VERSION" ] && { echo -e "${RED}Failed to fetch latest version${NC}"; exit 1; }
        echo -e "${GREEN}Latest version: ${VERSION}${NC}"
    fi
}

download_binary() {
    BINARY_NAME="pulse-agent-${PLATFORM}"
    ARCHIVE_NAME="${BINARY_NAME}.tar.gz"
    DOWNLOAD_URL="https://github.com/gaurav/pulseboard/releases/download/${VERSION}/${ARCHIVE_NAME}"
    
    echo -e "${BLUE}Downloading ${ARCHIVE_NAME}...${NC}"
    TMP_DIR=$(mktemp -d)
    trap "rm -rf ${TMP_DIR}" EXIT
    cd "${TMP_DIR}"
    
    if ! curl -fL --progress-bar -o "${ARCHIVE_NAME}" "${DOWNLOAD_URL}"; then
        echo -e "${RED}Failed to download ${ARCHIVE_NAME}${NC}"
        exit 1
    fi
    
    tar -xzf "${ARCHIVE_NAME}"
    [ ! -f "pulse-agent" ] && { echo -e "${RED}Binary not found${NC}"; exit 1; }
    chmod +x pulse-agent
    BINARY_PATH="${TMP_DIR}/pulse-agent"
}

install_binary() {
    echo -e "${BLUE}Installing to ${INSTALL_DIR}...${NC}"
    mkdir -p "${INSTALL_DIR}"
    cp "${BINARY_PATH}" "${INSTALL_DIR}/pulse-agent"
    chmod +x "${INSTALL_DIR}/pulse-agent"
    echo -e "${GREEN}Installed to ${INSTALL_DIR}/pulse-agent${NC}"
}

setup_path() {
    case ":${PATH}:" in
        *":${INSTALL_DIR}:"*) echo -e "${GREEN}${INSTALL_DIR} already in PATH${NC}" ;;
        *)
            echo -e "${YELLOW}Adding ${INSTALL_DIR} to PATH...${NC}"
            SHELL_CONFIG="${HOME}/.bashrc"
            [ -n "${ZSH_VERSION}" ] && SHELL_CONFIG="${HOME}/.zshrc"
            echo "" >> "${SHELL_CONFIG}"
            echo "# PulseBoard Agent" >> "${SHELL_CONFIG}"
            echo "export PATH=\"\${PATH}:${INSTALL_DIR}\"" >> "${SHELL_CONFIG}"
            echo -e "${GREEN}Added to ${SHELL_CONFIG}${NC}"
            echo -e "${YELLOW}Run: source ${SHELL_CONFIG}${NC}"
            ;;
    esac
}

verify_install() {
    echo -e "${BLUE}Verifying...${NC}"
    "${INSTALL_DIR}/pulse-agent" --version && echo -e "${GREEN}Verified!${NC}"
}

print_next_steps() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Installed! Next steps:${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo "  1. Configure: pulse-agent config"
    echo "  2. Set env: export PULSE_AGENT_KAFKA_BROKERS=\"kafka:9092\""
    echo "  3. Start: pulse-agent start"
    echo "  4. Service: sudo pulse-agent install-service"
    echo ""
    echo "Docs: https://docs.pulseboard.io"
}

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

main "$@"
EOF

chmod +x "${RELEASE_DIR}/install.sh"

# Create uninstall script
cp "${AGENT_DIR}/uninstall.sh" "${RELEASE_DIR}/uninstall.sh" 2>/dev/null || true
chmod +x "${RELEASE_DIR}/uninstall.sh" 2>/dev/null || true

# Create checksums
cd "${RELEASE_DIR}"
echo -e "${BLUE}Generating checksums...${NC}"
sha256sum *.tar.gz *.tar.gz 2>/dev/null | tee SHA256SUMS
sha256sum *.exe 2>/dev/null | tee -a SHA256SUMS

# Create release notes template
cat > "${RELEASE_DIR}/RELEASE_NOTES.md" << EOF
# PulseBoard v${VERSION}

## 🚀 Release Highlights

### New Features
- OTLP ingestion endpoints (/v1/traces, /v1/metrics, /v1/logs, /v1/profiles)
- Prometheus remote-write endpoint (/api/v1/write)
- OpenTelemetry normalization layer
- Prometheus remote-write endpoint
- Service discovery framework

### Bug Fixes
- Fixed Kafka producer connection handling
- Improved normalization for metrics histograms
- Fixed agent config loading

### Breaking Changes
- None

## 📦 Installation

### Quick Install
\`\`\`bash
curl -fsSL https://github.com/gaurav/pulseboard/releases/download/v${VERSION}/install.sh | bash
\`\`\`

### Manual Download
| Platform | Archive | SHA256 |
|----------|---------|--------|
EOF

# Add checksums to release notes
for file in *.tar.gz *.exe; do
    if [ -f "$file" ]; then
        checksum=$(sha256sum "$file" | cut -d' ' -f1)
        echo "| $file | [Download](https://github.com/gaurav/pulseboard/releases/download/v${VERSION}/$file) | \`$checksum\` |" >> RELEASE_NOTES.md
    fi
done

cat >> "${RELEASE_DIR}/RELEASE_NOTES.md" << 'EOF'

## 🔧 Configuration

See [config.yaml.example](config.yaml.example) for all options.

### Quick Config
```yaml
kafka:
  enabled: true
  brokers: ["kafka1:9092"]
  topic: "api-logs"

otlp:
  enabled: true
  http_port: 8083
```

## 📊 Monitoring the Agent

```bash
# Health check
curl http://localhost:8082/health

# OTLP endpoint
curl http://localhost:8083/health

# Metrics
curl http://localhost:8082/metrics
```

## 📚 Documentation

- [Deployment Guide](../DEPLOYMENT.md)
- [Monitoring Guide](../MONITORING_IMPLEMENTATION_GUIDE.md)
- [Testing Guide](../pulse_agent_v1/TESTING_GUIDE.md)

## 🐛 Known Issues

- Protobuf support for OTLP/remote-write not yet implemented (use JSON)

## 🙏 Contributors

Thanks to all contributors!

---

**Full Changelog**: https://github.com/gaurav/pulseboard/compare/v1.0.0...v${VERSION}
EOF

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Release package created!             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Location: ${RELEASE_DIR}${NC}"
echo ""
echo -e "${YELLOW}Contents:${NC}"
ls -la "${RELEASE_DIR}"
echo ""
echo -e "${BLUE}To create GitHub release:${NC}"
echo "  gh release create v${VERSION} ${RELEASE_DIR}/* --title \"PulseBoard v${VERSION}\" --notes-file ${RELEASE_DIR}/RELEASE_NOTES.md"