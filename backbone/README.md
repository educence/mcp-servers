# Jen OS Backbone

This folder contains the architectural specification for Jen OS's automation backbone.

## Core Principle

One backbone, not more tools. Everything goes through the same 2-3 rails:

1. **Spine** - Single spec that encodes identity, safety, and lanes
2. **Router** - n8n as the only dispatcher for tasks and tools
3. **Tool Surface** - Small, consistent set of MCP/n8n tools

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONT DOORS                            │
│  Claude.ai │ Claude Code │ Any MCP Client │ Manual Trigger  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         SPINE                               │
│  • Jen Model (identity, values, constraints)                │
│  • Safety Charter (human invariants, ethical lines)         │
│  • Agent Contract (what each bot can/cannot do)             │
│  Source: Notion page, read by all agents first              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ROUTER (n8n)                             │
│  • Router Tasks DB polling (PENDING → CLAIMED → DONE)       │
│  • Webhook endpoints for direct tool calls                  │
│  • Logging all executions to Notion                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TOOL SURFACE                             │
│  read_os      │ Read from Notion spine/state                │
│  write_os     │ Write to Notion (with validation)           │
│  run_task     │ Create Router Task for async execution      │
│  shell_op     │ Allowlisted shell commands only             │
│  call_claude  │ Invoke Claude API for sub-tasks             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       STATE                                 │
│  GitHub      │ Code, IaC, workflow definitions              │
│  Notion      │ OS state, tasks, artifacts, learnings        │
│  Hetzner     │ Infrastructure (managed via API, not SSH)    │
└─────────────────────────────────────────────────────────────┘
```

## Files in This Folder

- `README.md` - This file (architecture overview)
- `lanes.md` - Detailed lane definitions and tool schemas
- `spine-contract.md` - Agent contracts and safety rules
- `transport-options.md` - Comparison of n8n connectivity methods

## Key Workflows

Located in `../n8n-workflows/`:

- `jen-os-shell-proxy.json` - Allowlisted shell access via webhook
- `jen-os-router-tasks-bridge.json` - Polls Notion for tasks, executes via Claude API

## Why This Matters

When the backbone is real:
- Tools become interchangeable cables (swap Tailscale for Cloudflare without changing how you work)
- AIs stop being separate worlds (all see same spine, use same tools, report to same router)
- "Prosperous system" becomes measurable (Router Tasks complete, OS updates, workflows run safely)
