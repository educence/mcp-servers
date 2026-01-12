#!/bin/bash
# Jen OS MCP Infrastructure Deployment Script
# Run on Hetzner: ssh root@157.180.30.27
# Usage: ./deploy.sh [component]
# Components: all, github-mcp, jen-os-mcp, n8n

set -e

SECRETS_DIR="$HOME/secrets"
MCP_DIR="/opt/mcp-servers"
NETWORK_NAME="jen-os-network"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[JEN-OS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check prerequisites
check_prereqs() {
    log "Checking prerequisites..."
    command -v docker &> /dev/null || error "Docker not installed"
    command -v docker compose &> /dev/null || error "Docker Compose not installed"
    [ -d "$SECRETS_DIR" ] || { warn "Creating secrets directory"; mkdir -p "$SECRETS_DIR"; chmod 700 "$SECRETS_DIR"; }
}

# Create network
create_network() {
    log "Ensuring Docker network exists..."
    docker network create $NETWORK_NAME 2>/dev/null || true
}

# Check required secrets
check_secrets() {
    local missing=0
    
    [ -f "$SECRETS_DIR/github-pat.txt" ] || { warn "Missing: $SECRETS_DIR/github-pat.txt"; missing=1; }
    [ -f "$SECRETS_DIR/notion-token.txt" ] || { warn "Missing: $SECRETS_DIR/notion-token.txt"; missing=1; }
    
    if [ $missing -eq 1 ]; then
        echo ""
        echo "Create missing secrets:"
        echo "  echo 'ghp_xxx' > $SECRETS_DIR/github-pat.txt"
        echo "  echo 'secret_xxx' > $SECRETS_DIR/notion-token.txt"
        echo "  chmod 600 $SECRETS_DIR/*.txt"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] || exit 1
    fi
}

# Clone/update repo
update_repo() {
    log "Updating MCP servers repo..."
    if [ -d "$MCP_DIR" ]; then
        cd "$MCP_DIR" && git pull
    else
        git clone https://github.com/educence/mcp-servers.git "$MCP_DIR"
    fi
}

# Deploy GitHub MCP
deploy_github_mcp() {
    log "Deploying GitHub MCP Server..."
    cd "$MCP_DIR/github-mcp"
    
    # Create .env from secret
    if [ -f "$SECRETS_DIR/github-pat.txt" ]; then
        echo "GITHUB_PERSONAL_ACCESS_TOKEN=$(cat $SECRETS_DIR/github-pat.txt)" > .env
    else
        error "GitHub PAT not found at $SECRETS_DIR/github-pat.txt"
    fi
    
    docker compose pull
    docker compose up -d
    log "GitHub MCP deployed!"
}

# Deploy Jen OS MCP
deploy_jen_os_mcp() {
    log "Deploying Jen OS MCP Server..."
    cd "$MCP_DIR/jen-os-mcp-v2"
    
    # Create .env from secrets
    if [ -f "$SECRETS_DIR/notion-token.txt" ]; then
        cat > .env << EOF
NOTION_TOKEN=$(cat $SECRETS_DIR/notion-token.txt)
TRANSPORT=http
PORT=3847
ROUTER_TASKS_DB=d4889fd9e8a241578d6cf1ad43b798de
ARTIFACTS_DB=d425ea1f026c4ad997e458fe3fd6c5b3
PATTERNS_DB=f1d4bb354885408b099e368a5c2449b
SESSIONS_DB=67f12bf0eafb4321aba88f922969bc90
SYSTEM_KNOWLEDGE_DB=f5169ab773924c8ba93f185930c76c12
EOF
    else
        error "Notion token not found at $SECRETS_DIR/notion-token.txt"
    fi
    
    docker compose build
    docker compose up -d
    log "Jen OS MCP deployed on port 3847!"
}

# Status check
status() {
    log "Checking service status..."
    echo ""
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|mcp|n8n'
    echo ""
}

# Main
main() {
    local component=${1:-all}
    
    check_prereqs
    create_network
    check_secrets
    update_repo
    
    case $component in
        all)
            deploy_github_mcp
            deploy_jen_os_mcp
            ;;
        github-mcp)
            deploy_github_mcp
            ;;
        jen-os-mcp)
            deploy_jen_os_mcp
            ;;
        status)
            status
            ;;
        *)
            echo "Usage: $0 [all|github-mcp|jen-os-mcp|status]"
            exit 1
            ;;
    esac
    
    status
    log "Deployment complete!"
}

main "$@"
