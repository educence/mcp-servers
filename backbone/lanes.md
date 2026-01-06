# Jen OS Lanes & Tool Surface

Every interaction with Jen OS goes through one of these lanes.

## Lane Definitions

### 1. Read Lane (`read_os`)

**Purpose:** Retrieve state from the OS without modification.

**Implementations:**
- Notion MCP: `notion-fetch`, `notion-search`
- n8n webhook: `GET /jen-os-read`

**Allowed targets:**
- Spine (always readable)
- Router Tasks (status, history)
- Artifacts (metadata and content)
- Patterns/Learnings

**Schema:**
```json
{
  "target": "spine | tasks | artifacts | patterns",
  "query": "optional search/filter",
  "id": "optional specific page ID"
}
```

### 2. Write Lane (`write_os`)

**Purpose:** Modify OS state with validation.

**Implementations:**
- Notion MCP: `notion-update-page`, `notion-create-pages`
- n8n webhook: `POST /jen-os-write`

**Allowed targets:**
- Router Tasks (create, update status)
- Artifacts (create, update)
- Sessions (log)
- Patterns (create with review flag)

**NOT allowed:**
- Spine modification (requires human approval)
- Deleting anything (soft-delete only via status change)

**Schema:**
```json
{
  "target": "tasks | artifacts | sessions | patterns",
  "operation": "create | update",
  "data": { ... },
  "executed_by": "agent identifier"
}
```

### 3. Task Lane (`run_task`)

**Purpose:** Queue async work for the Router to execute.

**Implementation:**
- Creates entry in Router Tasks DB with status=PENDING
- n8n bridge picks up and processes

**Schema:**
```json
{
  "task_id": "auto-generated",
  "type": "content | app | ui | infra",
  "target": "Bot_Content | Bot_App | Bot_UI | Artifacts | Notion",
  "payload": { ... },
  "constraints": {
    "max_time_minutes": 30,
    "requires_approval": false
  },
  "status": "PENDING"
}
```

### 4. Shell Lane (`shell_op`)

**Purpose:** Execute allowlisted shell commands on Hetzner server.

**Implementation:**
- n8n webhook: `POST /jen-os-shell`
- Requires `X-Jen-OS-Token` header

**Allowlist (current):**
```
docker compose, docker ps, docker logs, docker restart
pm2 status, pm2 list, pm2 logs, pm2 restart, pm2 stop, pm2 start
cat ~/n8n/, ls -la ~/n8n
pwd, whoami, uptime, df -h, free -m
curl -s localhost, systemctl status
```

**Blocklist (always rejected):**
```
rm -rf, rm -r /, > /dev, mkfs, dd if=
chmod 777, curl | bash, wget | bash
eval, $(), `, &&, ||, ;, |
```

**Schema:**
```json
{
  "command": "string (must match allowlist prefix)"
}
```

### 5. Claude Lane (`call_claude`)

**Purpose:** Invoke Claude API for sub-tasks.

**Implementation:**
- n8n HTTP Request node to Anthropic API
- Or direct via Anthropic Administrator toolkit

**Schema:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "system": "Context from Spine",
  "messages": [...],
  "max_tokens": 4096
}
```

## Tool Surface Summary

| Tool | Lane | Transport | Auth |
|------|------|-----------|------|
| `read_os` | Read | Notion MCP or n8n webhook | MCP auth or token |
| `write_os` | Write | Notion MCP or n8n webhook | MCP auth or token |
| `run_task` | Task | Notion MCP (create page) | MCP auth |
| `shell_op` | Shell | n8n webhook | X-Jen-OS-Token |
| `call_claude` | Claude | n8n or direct API | API key |

## Adding New Tools

1. Define which lane it belongs to
2. Document schema in this file
3. Implement in n8n workflow or MCP server
4. Add to Spine's tool registry
5. Test with minimal scope first
