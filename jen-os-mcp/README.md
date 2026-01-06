# Jen OS MCP Server

Your own MCP server for AI orchestration. Connects Claude, Perplexity, n8n, and any MCP-compatible tool to your Notion OS.

## Tools Available

| Tool | Description |
|------|-------------|
| `query_pending_tasks` | Get PENDING tasks from Router Tasks |
| `update_task_status` | Update task status (PENDING/CLAIMED/DONE/REJECTED) |
| `create_artifact` | Create new artifact in Artifacts DB |
| `create_pattern` | Log a pattern to Patterns DB |
| `log_session` | Log a session to Sessions Index |
| `validate_content` | Check content against Jen OS constraints |

## Setup

### 1. Install dependencies

```bash
cd jen-os-mcp
npm install
```

### 2. Set environment variable

```bash
export NOTION_TOKEN=ntn_your_token_here
```

### 3. Run the server

```bash
npm start
```

## Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jen-os": {
      "command": "node",
      "args": ["C:/Users/jense/mcp-servers/jen-os-mcp/src/index.js"],
      "env": {
        "NOTION_TOKEN": "ntn_your_token_here"
      }
    }
  }
}
```

## Deploy to Hetzner

```bash
# SSH to your server
ssh root@YOUR_HETZNER_IP

# Clone the repo
git clone https://github.com/educence/mcp-servers.git
cd mcp-servers/jen-os-mcp

# Install and run
npm install
NOTION_TOKEN=ntn_xxx npm start
```

## Jen OS Constraints

All content is validated against:
- No shame-based language
- Positive-sum only
- Respects autonomy, competence, relatedness, dignity

## Database IDs (hardcoded)

- Router Tasks: `f65e7d1486474bd88c0598add298f0d8`
- Artifacts: `d425ea1f026c4ad997e458fe3fd6c5b3`
- Patterns: `f1d4bb3548854086b099e368a5c2449b`
- Sessions: `67f12bf0eafb4321aba88f922969bc90`
