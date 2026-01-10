# Notion MCP - Golden Usage Examples
**Version:** 1.0  
**Last Updated:** 2026-01-10

---

## Tool: notion-fetch

Fetches page content by ID or URL.

### Schema
```json
{
  "id": "string (page ID or full Notion URL)"
}
```

### Golden Example
```json
{
  "id": "2e31e68e-cd06-81c0-8052-da9462979cd8"
}
```

### Common Errors
- **404**: Page not shared with integration. Fix: Check Notion connection permissions.
- **Invalid ID**: Ensure 32-char UUID format (with or without dashes).

---

## Tool: notion-search

Searches across workspace.

### Schema
```json
{
  "query": "string",
  "query_type": "internal | user"
}
```

### Golden Example
```json
{
  "query": "Claude contract execution",
  "query_type": "internal"
}
```

---

## Tool: notion-create-pages

Creates pages in database or as standalone.

### Schema
```json
{
  "parent": {"type": "data_source_id", "data_source_id": "UUID"},
  "pages": [{"properties": {...}, "content": "markdown"}]
}
```

### Golden Example (AI Traces entry)
```json
{
  "parent": {"type": "data_source_id", "data_source_id": "ee0d2d0a-3c04-4a9a-8105-82464f514d43"},
  "pages": [{
    "properties": {
      "Trace ID": "TRACE-2026-01-10-001",
      "Type": "Execution",
      "Status": "Complete"
    },
    "content": "## Summary\n\nTask completed successfully."
  }]
}
```

### Common Errors
- **Validation error**: Property names must match database schema exactly (case-sensitive).
- **Missing parent**: For database pages, use data_source_id not database_id if multiple views exist.
