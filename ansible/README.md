# Jen OS Ansible Deployment

Ansible playbooks for bootstrapping and deploying Jen OS infrastructure on Hetzner VPS.

## Prerequisites

### Local Machine (Control Node)
```bash
# Install Ansible
pip install ansible

# Install Docker collection
ansible-galaxy collection install community.docker
```

### SSH Key
Ensure your SSH key is set up:
```bash
# Generate if needed
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519

# Copy to server (first time only)
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@157.180.30.27
```

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/educence/mcp-servers.git
cd mcp-servers/ansible
```

### 2. Create Secrets on Server
SSH to server first and create secrets:
```bash
ssh root@157.180.30.27

mkdir -p ~/secrets
chmod 700 ~/secrets

# Add your tokens
echo 'ghp_YOUR_GITHUB_PAT' > ~/secrets/github-pat.txt
echo 'secret_YOUR_NOTION_TOKEN' > ~/secrets/notion-token.txt
chmod 600 ~/secrets/*.txt

exit
```

### 3. Run Playbook
```bash
# Full deployment
ansible-playbook site.yml

# Only specific tags
ansible-playbook site.yml --tags "docker,mcp"
ansible-playbook site.yml --tags "n8n"
ansible-playbook site.yml --tags "security"
```

## Available Tags

| Tag | Description |
|-----|-------------|
| `system` | Base packages and updates |
| `security` | UFW firewall, fail2ban |
| `docker` | Docker CE installation |
| `secrets` | Secrets directory setup |
| `mcp` | All MCP servers |
| `github-mcp` | GitHub MCP server only |
| `jen-os-mcp` | Jen OS MCP server only |
| `n8n` | n8n workflow automation |
| `verify` | Health checks |

## What Gets Deployed

```
/root/secrets/
├── github-pat.txt      # GitHub Personal Access Token
└── notion-token.txt    # Notion Integration Token

/opt/mcp-servers/
├── github-mcp/         # Official GitHub MCP Server
├── jen-os-mcp-v2/      # Custom Jen OS Notion MCP
└── ansible/            # These playbooks

/opt/n8n/
└── docker-compose.yml  # n8n workflow automation

Docker Containers:
- github-mcp (ghcr.io/github/github-mcp-server)
- jen-os-mcp (custom build, port 3847)
- n8n (n8nio/n8n, port 5678)
```

## Firewall Ports

| Port | Service | Access |
|------|---------|--------|
| 22 | SSH | Open |
| 80 | HTTP | Open |
| 443 | HTTPS | Open |
| 5678 | n8n | Open |
| 3847 | Jen OS MCP | Open |

## Troubleshooting

### Connection Failed
```bash
# Test SSH
ssh root@157.180.30.27 "echo connected"

# Check Ansible connectivity
ansible hetzner -m ping
```

### Docker Issues
```bash
# On server
docker ps -a
docker logs <container_name>
docker network ls
```

### Missing Secrets
```bash
# Check secrets exist
ls -la /root/secrets/
cat /root/secrets/github-pat.txt | head -c 10
```

## Server Details

- **IP:** 157.180.30.27
- **Provider:** Hetzner
- **OS:** Ubuntu 24.04
- **User:** root

## Related

- [Jen OS Tools Layer](https://notion.so/2e31e68ecd068190b5bbdecdba58282f)
- [Connection System Ground Truth](https://notion.so/2e61e68ecd0681a6a918fc1d5cb70925)
