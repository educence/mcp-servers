# GitHub MCP - Golden Usage Examples
**Version:** 1.0  
**Last Updated:** 2026-01-10

---

## Tool: GITHUB_GET_REPOSITORY_CONTENT

Reads file content from repo.

### Schema
```json
{
  "owner": "string",
  "repo": "string", 
  "path": "string",
  "ref": "string (optional, branch/tag/sha)"
}
```

### Golden Example
```json
{
  "owner": "educence",
  "repo": "mcp-servers",
  "path": "contracts/claude-execution-contract-v1.0.md",
  "ref": "master"
}
```

### Common Errors
- **404**: Path case-sensitive. Check exact casing.
- **Content is Base64**: Decode before using.

---

## Tool: GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS

Creates or updates file in repo.

### Schema
```json
{
  "owner": "string",
  "repo": "string",
  "path": "string",
  "message": "string (commit message)",
  "content": "string (plain text, auto-base64-encoded)",
  "branch": "string",
  "sha": "string (required for updates, optional for creates)"
}
```

### Golden Example (New file)
```json
{
  "owner": "educence",
  "repo": "mcp-servers",
  "path": "contracts/claude-execution-contract-v1.1-proposed.md",
  "message": "Propose v1.1: Add cost guardrail clarification",
  "content": "# Contract content here...",
  "branch": "master"
}
```

### Golden Example (Update existing)
```json
{
  "owner": "educence",
  "repo": "mcp-servers",
  "path": "contracts/claude-execution-contract-v1.0.md",
  "message": "Fix typo in Self-Test Gate section",
  "content": "# Updated content...",
  "branch": "master",
  "sha": "abc123..." 
}
```

### Common Errors
- **409 Conflict**: SHA mismatch. Fetch current file first to get latest SHA.
- **422**: Content encoding issue. Tool auto-encodes, don't pre-encode.
