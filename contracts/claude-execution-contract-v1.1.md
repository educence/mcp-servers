# Claude Execution Contract v1.1
**Version:** 1.1  
**Updated:** 2026-01-10  
**Purpose:** Define Claude's execution behavior in Jen OS

---

## 1. Contract Loading Protocol

On first serious task:
1. Fetch from GitHub: `educence/mcp-servers/contracts/claude-execution-contract-v1.x.md`
2. Fetch overrides from Notion: 🎛️ OS Controls (ID: d16f3b02-cc1e-4101-a58a-ca45a9984fbe)
3. Announce config, then obey

If GitHub unavailable → use Notion fallback
If both unavailable → ENV=dev, RISK=Medium, announce limitations

---

## 2. Missing Criticals Fallback

Before executing any non-trivial task:

1. **ENV missing?** → Assume dev, state explicitly
2. **RISK missing?** → Assume Medium, confirm with Jen
3. **Scope unclear?** → STOP and ask: execution or architecture?
4. **Hard block:** No prod/irreversible actions without explicit ENV + RISK

---

## 3. Data Plane: PARA Databases

### Target Databases for Outputs
| Type | Database | ID |
|------|----------|-----|
| Quick capture | 📥 Inbox | 7fc0484b49cf4c8d9b90e1f766aa2bc2 |
| Active work | 🎯 Projects | 6d0e108de2134db69a7c5ce4c842a665 |
| Responsibilities | 🌱 Areas | 3866085ff6614b209160a003c8447735 |
| Reference | 📚 Resources | 4b0480e29d9443a2b06a84e10949e4c1 |
| Contacts | 👥 People | d366e90de5164484a0ba8ada72e6f117 |

### Routing Rules
- Actionable tasks with deadlines → Projects
- Quick notes, ideas, questions → Inbox
- Reference material, links, research → Resources
- New contacts mentioned → People

---

## 4. Tool Selection

### When to use which tool:

| Tool | Use For |
|------|---------|
| Notion MCP | Direct Notion reads/writes |
| Rube/Composio | Cross-app workflows (Gmail+Slack, etc) |
| n8n | Scheduled triggers, webhooks |
| GitHub MCP | Contract updates, code repos |
| Filesystem | Local artifacts, logs |

### Rube Recipes Available
| Recipe | ID | Flow |
|--------|-----|------|
| Daily Email Digest | rcp_l2JHN5GsuDeA | Gmail → AI → Slack |

---

## 5. Execution Modes

### Direct Mode
- Single-tool operations
- Immediate feedback
- No confirmation needed for reads

### Recipe Mode  
- Cross-app workflows
- Use RUBE_EXECUTE_RECIPE
- Confirm before sends/posts

### Architecture Mode
- Design documents, specs
- No live changes
- Output to Notion/GitHub

---

## 6. Logging

Log every significant action to AI Traces (ID: 49407a62d3f940d0861b5f6ffe3c3ec1):
- Tool used
- Parameters
- Outcome
- Patterns observed

---

## Changelog
- v1.1 (2026-01-10): Added PARA databases, Rube integration, tool selection guidance
- v1.0: Initial contract with Missing Criticals