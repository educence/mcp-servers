/**
 * JEN OS MCP SERVER v2 - POWERFUL EDITION
 * 
 * A comprehensive MCP server for Jen OS with:
 * - HTTP transport (remote access from n8n, Claude Desktop, etc.)
 * - Security layer (SSRF protection, content validation)
 * - Full Notion integration (Router Tasks, Artifacts, Patterns, Sessions)
 * - Content pipeline tools (ingest, draft, queue, publish)
 * - Bot Reactor orchestration support
 * 
 * Transport: HTTP (port 3847) + stdio fallback
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import http from "http";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  port: parseInt(process.env.PORT || "3847"),
  transport: process.env.TRANSPORT || "http",
  notion: {
    token: process.env.NOTION_TOKEN,
    databases: {
      routerTasks: process.env.ROUTER_TASKS_DB || "f65e7d1486474bd88c0598add298f0d8",
      artifacts: process.env.ARTIFACTS_DB || "d425ea1f026c4ad997e458fe3fd6c5b3",
      patterns: process.env.PATTERNS_DB || "f1d4bb3548854086b099e368a5c2449b",
      sessions: process.env.SESSIONS_DB || "67f12bf0eafb4321aba88f922969bc90",
      systemKnowledge: process.env.SYSTEM_KNOWLEDGE_DB || "f5169ab773924c8ba93f185930c76c12",
      contentQueue: process.env.CONTENT_QUEUE_DB || null,
    },
    pages: {
      spine: process.env.SPINE_PAGE || null,
      jenModel: process.env.JEN_MODEL_PAGE || null,
    }
  }
};

// =============================================================================
// SECURITY LAYER
// =============================================================================

const SECURITY = {
  forbiddenWords: ["shame", "stupid", "idiot", "worthless", "failure", "pathetic", "loser"],
  
  allowedHosts: new Set([
    "api.notion.com",
    "notion.so",
    "api.anthropic.com",
    "api.perplexity.ai",
    "thedankoe.com",
    "letters.thedankoe.com",
    "api.github.com",
    "raw.githubusercontent.com",
  ]),
  
  privateIPPatterns: [
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^localhost$/i,
    /^0\.0\.0\.0$/,
  ],
  
  rateLimits: new Map(),
  maxRequestsPerMinute: 60,
};

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    for (const pattern of SECURITY.privateIPPatterns) {
      if (pattern.test(parsed.hostname)) {
        throw new Error(`Blocked: Private IP address (${parsed.hostname})`);
      }
    }
    if (!SECURITY.allowedHosts.has(parsed.hostname)) {
      throw new Error(`Blocked: Host not in allowlist (${parsed.hostname})`);
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Blocked: Invalid protocol (${parsed.protocol})`);
    }
    return true;
  } catch (e) {
    if (e.message.startsWith("Blocked:")) throw e;
    throw new Error(`Invalid URL: ${url}`);
  }
}

function validateContent(text) {
  const lower = text.toLowerCase();
  const violations = [];
  for (const word of SECURITY.forbiddenWords) {
    if (lower.includes(word)) {
      violations.push(word);
    }
  }
  return {
    isValid: violations.length === 0,
    violations,
    message: violations.length > 0 
      ? `Content violates Jen OS safety rules. Forbidden words found: ${violations.join(", ")}`
      : "Content passes validation"
  };
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const windowStart = now - 60000;
  if (!SECURITY.rateLimits.has(clientId)) {
    SECURITY.rateLimits.set(clientId, []);
  }
  const requests = SECURITY.rateLimits.get(clientId);
  const recentRequests = requests.filter(t => t > windowStart);
  SECURITY.rateLimits.set(clientId, recentRequests);
  if (recentRequests.length >= SECURITY.maxRequestsPerMinute) {
    throw new Error(`Rate limit exceeded. Max ${SECURITY.maxRequestsPerMinute} requests per minute.`);
  }
  recentRequests.push(now);
  return true;
}

// =============================================================================
// NOTION CLIENT
// =============================================================================

let notion = null;

function getNotion() {
  if (!notion) {
    if (!CONFIG.notion.token) {
      throw new Error("NOTION_TOKEN environment variable required");
    }
    notion = new Client({ auth: CONFIG.notion.token });
  }
  return notion;
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

const TOOLS = {
  async jenos_query_pending_tasks({ limit = 10, type_filter = null }) {
    const n = getNotion();
    const filter = { and: [{ property: "Status", select: { equals: "PENDING" } }] };
    if (type_filter) filter.and.push({ property: "Type", select: { equals: type_filter } });
    const response = await n.databases.query({
      database_id: CONFIG.notion.databases.routerTasks,
      filter,
      page_size: limit,
      sorts: [{ property: "Created", direction: "ascending" }]
    });
    const tasks = response.results.map(page => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || "Untitled",
      type: page.properties.Type?.select?.name || "UNKNOWN",
      priority: page.properties.Priority?.select?.name || "NORMAL",
      payload: page.properties.Payload?.rich_text?.[0]?.plain_text || "",
      created: page.properties.Created?.created_time,
    }));
    return { count: tasks.length, has_more: response.has_more, tasks };
  },
  
  async jenos_claim_task({ task_id, claimed_by = "mcp-server" }) {
    const n = getNotion();
    await n.pages.update({
      page_id: task_id,
      properties: {
        Status: { select: { name: "CLAIMED" } },
        "Claimed By": { rich_text: [{ text: { content: claimed_by } }] },
        "Claimed At": { date: { start: new Date().toISOString() } }
      }
    });
    return { success: true, task_id, claimed_by, claimed_at: new Date().toISOString() };
  },
  
  async jenos_complete_task({ task_id, result, notes = "" }) {
    const n = getNotion();
    await n.pages.update({
      page_id: task_id,
      properties: {
        Status: { select: { name: "DONE" } },
        Result: { rich_text: [{ text: { content: result.substring(0, 2000) } }] },
        "Execution Notes": { rich_text: [{ text: { content: notes.substring(0, 2000) } }] },
        "Completed At": { date: { start: new Date().toISOString() } }
      }
    });
    return { success: true, task_id, status: "DONE" };
  },
  
  async jenos_reject_task({ task_id, reason }) {
    const n = getNotion();
    await n.pages.update({
      page_id: task_id,
      properties: {
        Status: { select: { name: "REJECTED" } },
        "Execution Notes": { rich_text: [{ text: { content: reason.substring(0, 2000) } }] },
        "Completed At": { date: { start: new Date().toISOString() } }
      }
    });
    return { success: true, task_id, status: "REJECTED", reason };
  },
  
  async jenos_create_task({ title, type, payload, priority = "NORMAL", target = null }) {
    const n = getNotion();
    const properties = {
      Name: { title: [{ text: { content: title } }] },
      Type: { select: { name: type } },
      Status: { select: { name: "PENDING" } },
      Priority: { select: { name: priority } },
      Payload: { rich_text: [{ text: { content: JSON.stringify(payload).substring(0, 2000) } }] }
    };
    if (target) properties.Target = { select: { name: target } };
    const page = await n.pages.create({
      parent: { database_id: CONFIG.notion.databases.routerTasks },
      properties
    });
    return { success: true, task_id: page.id, title, type, status: "PENDING" };
  },
  
  async jenos_create_artifact({ name, type, content, department = "Jen_OS", tags = [] }) {
    const validation = validateContent(content);
    if (!validation.isValid) return { success: false, error: validation.message };
    const n = getNotion();
    const page = await n.pages.create({
      parent: { database_id: CONFIG.notion.databases.artifacts },
      properties: {
        "Artifact Name": { title: [{ text: { content: name } }] },
        Type: { select: { name: type } },
        Content: { rich_text: [{ text: { content: content.substring(0, 2000) } }] },
        Department: { select: { name: department } },
        Status: { select: { name: "Draft" } },
        Tags: { multi_select: tags.map(t => ({ name: t })) },
        "Created By": { rich_text: [{ text: { content: "MCP Server" } }] }
      }
    });
    return { success: true, artifact_id: page.id, name, url: `https://notion.so/${page.id.replace(/-/g, "")}` };
  },
  
  async jenos_log_pattern({ name, type, description, source, application = null }) {
    const n = getNotion();
    const properties = {
      Name: { title: [{ text: { content: name } }] },
      Type: { select: { name: type } },
      Description: { rich_text: [{ text: { content: description.substring(0, 2000) } }] },
      Source: { rich_text: [{ text: { content: source } }] },
      "Date Captured": { date: { start: new Date().toISOString().split("T")[0] } }
    };
    if (application) properties.Application = { rich_text: [{ text: { content: application } }] };
    const page = await n.pages.create({ parent: { database_id: CONFIG.notion.databases.patterns }, properties });
    return { success: true, pattern_id: page.id, name };
  },
  
  async jenos_log_session({ title, mode, summary, artifacts = [], outcome_tag = "LEARN" }) {
    const n = getNotion();
    const page = await n.pages.create({
      parent: { database_id: CONFIG.notion.databases.sessions },
      properties: {
        Title: { title: [{ text: { content: title } }] },
        Mode: { select: { name: mode } },
        Summary: { rich_text: [{ text: { content: summary.substring(0, 2000) } }] },
        "Outcome Tag": { select: { name: outcome_tag } },
        Date: { date: { start: new Date().toISOString().split("T")[0] } }
      }
    });
    return { success: true, session_id: page.id, title, outcome_tag };
  },
  
  async jenos_validate_content({ text }) { return validateContent(text); },
  
  async jenos_validate_url({ url }) {
    try {
      validateUrl(url);
      return { isValid: true, url, message: "URL is safe and allowed" };
    } catch (e) {
      return { isValid: false, url, message: e.message };
    }
  },
  
  async jenos_query_knowledge({ domain = null, limit = 10 }) {
    const n = getNotion();
    const filter = domain ? { property: "Domain", select: { equals: domain } } : undefined;
    const response = await n.databases.query({ database_id: CONFIG.notion.databases.systemKnowledge, filter, page_size: limit });
    const knowledge = response.results.map(page => ({
      id: page.id,
      name: page.properties.Name?.title?.[0]?.plain_text || "Untitled",
      domain: page.properties.Domain?.select?.name,
      summary: page.properties["Compact Summary"]?.rich_text?.[0]?.plain_text || "",
      source: page.properties["Source URL"]?.url,
    }));
    return { count: knowledge.length, knowledge };
  },
  
  async jenos_queue_content_draft({ title, content, source, channel = "Substack", tags = [] }) {
    const validation = validateContent(content);
    if (!validation.isValid) return { success: false, error: validation.message };
    const result = await TOOLS.jenos_create_artifact({
      name: title,
      type: "Content Draft",
      content: `Source: ${source}\nChannel: ${channel}\n\n${content}`,
      department: "Content_Engine",
      tags: ["content-queue", channel.toLowerCase(), ...tags]
    });
    return { ...result, channel, status: "NEEDS_REVIEW" };
  },
  
  async jenos_dispatch_to_agent({ agent, goal, constraints = {}, output_needed }) {
    const task = await TOOLS.jenos_create_task({
      title: goal,
      type: "EXECUTE_ACTION",
      payload: { target_agent: agent, goal, constraints, output_needed, dispatched_at: new Date().toISOString() },
      priority: constraints.priority || "NORMAL",
      target: agent
    });
    return { success: true, task_id: task.task_id, agent, goal, message: `Task dispatched to ${agent}. Monitor Router Tasks for completion.` };
  },
  
  async jenos_log_delta({ description, domain, source = "MCP Server" }) {
    return await TOOLS.jenos_log_pattern({
      name: `Delta: ${description.substring(0, 50)}...`,
      type: "Delta",
      description,
      source,
      application: domain
    });
  },
  
  async jenos_health_check() {
    const checks = { server: true, notion: false, databases: {} };
    try {
      const n = getNotion();
      await n.users.me();
      checks.notion = true;
      for (const [name, id] of Object.entries(CONFIG.notion.databases)) {
        if (id) {
          try {
            await n.databases.retrieve({ database_id: id });
            checks.databases[name] = true;
          } catch { checks.databases[name] = false; }
        }
      }
    } catch (e) {
      checks.notion = false;
      checks.error = e.message;
    }
    return { status: checks.notion ? "healthy" : "degraded", transport: CONFIG.transport, port: CONFIG.port, checks };
  }
};

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

const TOOL_DEFINITIONS = [
  { name: "jenos_query_pending_tasks", description: "Query pending tasks from Router Tasks DB", inputSchema: { type: "object", properties: { limit: { type: "number", default: 10 }, type_filter: { type: "string" } } }, annotations: { readOnlyHint: true } },
  { name: "jenos_claim_task", description: "Claim a pending task", inputSchema: { type: "object", properties: { task_id: { type: "string" }, claimed_by: { type: "string", default: "mcp-server" } }, required: ["task_id"] } },
  { name: "jenos_complete_task", description: "Mark task as DONE", inputSchema: { type: "object", properties: { task_id: { type: "string" }, result: { type: "string" }, notes: { type: "string" } }, required: ["task_id", "result"] } },
  { name: "jenos_reject_task", description: "Reject a task", inputSchema: { type: "object", properties: { task_id: { type: "string" }, reason: { type: "string" } }, required: ["task_id", "reason"] } },
  { name: "jenos_create_task", description: "Create Router Task", inputSchema: { type: "object", properties: { title: { type: "string" }, type: { type: "string" }, payload: { type: "object" }, priority: { type: "string", default: "NORMAL" }, target: { type: "string" } }, required: ["title", "type", "payload"] } },
  { name: "jenos_create_artifact", description: "Create artifact (validated)", inputSchema: { type: "object", properties: { name: { type: "string" }, type: { type: "string" }, content: { type: "string" }, department: { type: "string", default: "Jen_OS" }, tags: { type: "array", items: { type: "string" } } }, required: ["name", "type", "content"] } },
  { name: "jenos_log_pattern", description: "Log pattern to library", inputSchema: { type: "object", properties: { name: { type: "string" }, type: { type: "string" }, description: { type: "string" }, source: { type: "string" }, application: { type: "string" } }, required: ["name", "type", "description", "source"] } },
  { name: "jenos_log_session", description: "Log work session", inputSchema: { type: "object", properties: { title: { type: "string" }, mode: { type: "string" }, summary: { type: "string" }, artifacts: { type: "array", items: { type: "string" } }, outcome_tag: { type: "string", default: "LEARN" } }, required: ["title", "mode", "summary"] } },
  { name: "jenos_validate_content", description: "Validate content against safety rules", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, annotations: { readOnlyHint: true } },
  { name: "jenos_validate_url", description: "Validate URL against SSRF rules", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, annotations: { readOnlyHint: true } },
  { name: "jenos_query_knowledge", description: "Query System Knowledge DB", inputSchema: { type: "object", properties: { domain: { type: "string" }, limit: { type: "number", default: 10 } } }, annotations: { readOnlyHint: true } },
  { name: "jenos_queue_content_draft", description: "Queue content draft for review", inputSchema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, source: { type: "string" }, channel: { type: "string", default: "Substack" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content", "source"] } },
  { name: "jenos_dispatch_to_agent", description: "Dispatch task to Bot Reactor agent", inputSchema: { type: "object", properties: { agent: { type: "string" }, goal: { type: "string" }, constraints: { type: "object" }, output_needed: { type: "string" } }, required: ["agent", "goal", "output_needed"] } },
  { name: "jenos_log_delta", description: "Log learning delta", inputSchema: { type: "object", properties: { description: { type: "string" }, domain: { type: "string" }, source: { type: "string", default: "MCP Server" } }, required: ["description", "domain"] } },
  { name: "jenos_health_check", description: "Check server health", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }
];

// =============================================================================
// SERVER SETUP
// =============================================================================

const server = new Server({ name: "jen-os-mcp", version: "2.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try { checkRateLimit(name); } catch (e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
  const tool = TOOLS[name];
  if (!tool) return { content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
  try {
    const result = await tool(args || {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    console.error(`[${name}] Error:`, error.message);
    return { content: [{ type: "text", text: JSON.stringify({ error: error.message }) }], isError: true };
  }
});

async function main() {
  console.error(`[jen-os-mcp] Starting server v2.0.0`);
  console.error(`[jen-os-mcp] Transport: ${CONFIG.transport}`);
  console.error(`[jen-os-mcp] Tools available: ${TOOL_DEFINITIONS.length}`);
  if (CONFIG.transport === "http") {
    const httpServer = http.createServer();
    const transport = new StreamableHTTPServerTransport({ server: httpServer });
    httpServer.listen(CONFIG.port, "0.0.0.0", () => {
      console.error(`[jen-os-mcp] HTTP server listening on port ${CONFIG.port}`);
    });
    await server.connect(transport);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
  console.error(`[jen-os-mcp] Server ready`);
}

main().catch((error) => { console.error("[jen-os-mcp] Fatal error:", error); process.exit(1); });
