# GitHub MCP Server for Jen OS

## Overview
Official GitHub MCP server integration for Jen OS. Provides Claude and other MCP clients with direct GitHub access.

## Capabilities
- Repository operations (read/write)
- Issue management
- Pull request operations
- GitHub Actions workflows
- Code security features

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Yes | GitHub PAT with required scopes |
| `GITHUB_TOOLSETS` | No | Comma-separated list: repos,issues,pull_requests,actions,code_security |
| `GITHUB_READ_ONLY` | No | Set to 1 to force read-only mode |

## Deployment on Hetzner

### 1. SSH to server
```bash
ssh root@157.180.30.27
```

### 2. Create secrets directory
```bash
mkdir -p ~/secrets
chmod 700 ~/secrets
```

### 3. Add GitHub token
```bash
echo 'ghp_YOUR_TOKEN_HERE' > ~/secrets/github-pat.txt
chmod 600 ~/secrets/github-pat.txt
```

### 4. Clone and deploy
```bash
cd /opt
git clone https://github.com/educence/mcp-servers.git
cd mcp-servers/github-mcp

# Create .env from secret
echo "GITHUB_PERSONAL_ACCESS_TOKEN=$(cat ~/secrets/github-pat.txt)" > .env

# Create network if not exists
docker network create jen-os-network 2>/dev/null || true

# Start
docker compose up -d
```

### 5. Verify
```bash
docker logs github-mcp
```

## MCP Client Configuration

### Claude Desktop (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<from ~/secrets/github-pat.txt>"
      }
    }
  }
}
```

### Remote HTTP Access (via n8n or other)
The server exposes MCP over stdio. For HTTP access, use an MCP gateway or proxy.

## Token Scopes Required
- `repo` - Full repository access
- `workflow` - GitHub Actions
- `write:packages` - Package management
- `admin:repo_hook` - Webhooks
- `gist` - Gist access
- `notifications` - Notifications
- `read:user` - User profile
- `user:email` - Email access
- `project` - Projects
- `read:org` - Organization membership

## Security Notes
- Token stored in `~/secrets/github-pat.txt` with 600 permissions
- Never commit tokens to git
- Use `GITHUB_READ_ONLY=1` for safer operations
- Limit `GITHUB_TOOLSETS` to only needed features

## Related
- [GitHub MCP Server Docs](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/set-up-the-github-mcp-server)
- [Jen OS Tools Layer](https://notion.so/2e31e68ecd068190b5bbdecdba58282f)
