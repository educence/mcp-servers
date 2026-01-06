import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Database IDs from Jen OS
const DB_IDS = {
  routerTasks: 'f65e7d1486474bd88c0598add298f0d8',
  artifacts: 'd425ea1f026c4ad997e458fe3fd6c5b3',
  patterns: 'f1d4bb3548854086b099e368a5c2449b',
  sessions: '67f12bf0eafb4321aba88f922969bc90',
};

// Validation rules - Jen OS constraints
const FORBIDDEN_WORDS = ['shame', 'stupid', 'idiot', 'worthless', 'failure'];

function validatePayload(payload) {
  const violations = [];
  const payloadStr = JSON.stringify(payload).toLowerCase();
  
  for (const word of FORBIDDEN_WORDS) {
    if (payloadStr.includes(word)) {
      violations.push(`Contains forbidden word: ${word}`);
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}

// Create the MCP server
const server = new Server(
  {
    name: 'jen-os-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_pending_tasks',
        description: 'Get all PENDING tasks from Router Tasks database',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return (default 10)',
            },
          },
        },
      },
      {
        name: 'update_task_status',
        description: 'Update a task status in Router Tasks (PENDING, CLAIMED, DONE, REJECTED)',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The Notion page ID of the task',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'CLAIMED', 'DONE', 'REJECTED'],
              description: 'New status for the task',
            },
            executionNotes: {
              type: 'string',
              description: 'Notes about the execution',
            },
          },
          required: ['pageId', 'status'],
        },
      },
      {
        name: 'create_artifact',
        description: 'Create a new artifact in the Artifacts database',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the artifact',
            },
            type: {
              type: 'string',
              enum: ['Document', 'Prompt', 'Code', 'Design', 'Offer', 'Template', 'Spec', 'Workflow', 'Page'],
              description: 'Type of artifact',
            },
            content: {
              type: 'string',
              description: 'Content of the artifact',
            },
            department: {
              type: 'string',
              enum: ['Content_Lab', 'Client_Services', 'Product_Build', 'Jen_OS', 'Relationships'],
              description: 'Department this artifact belongs to',
            },
          },
          required: ['name', 'type'],
        },
      },
      {
        name: 'create_pattern',
        description: 'Create a new pattern in the Patterns database',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the pattern',
            },
            type: {
              type: 'string',
              enum: ['Behavior', 'System', 'Failure_Mode', 'Success_Signal', 'Heuristic', 'Anti_Pattern'],
              description: 'Type of pattern',
            },
            situation: {
              type: 'string',
              description: 'When this pattern applies',
            },
            behavior: {
              type: 'string',
              description: 'What to do when pattern is recognized',
            },
            outcome: {
              type: 'string',
              description: 'Expected outcome',
            },
          },
          required: ['name', 'type', 'situation', 'behavior'],
        },
      },
      {
        name: 'log_session',
        description: 'Log a session to the Sessions Index database',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Session title',
            },
            platform: {
              type: 'string',
              enum: ['Claude', 'Perplexity', 'ChatGPT', 'Other'],
              description: 'Platform used',
            },
            mode: {
              type: 'string',
              enum: ['Generative', 'Execution', 'Analysis', 'Routing', 'Reflective', 'Challenge', 'Responsive'],
              description: 'Session mode',
            },
            summary: {
              type: 'string',
              description: 'Summary of the session',
            },
            shipped: {
              type: 'boolean',
              description: 'Whether something was shipped',
            },
          },
          required: ['title', 'platform'],
        },
      },
      {
        name: 'validate_content',
        description: 'Validate content against Jen OS constraints (no shame, positive-sum)',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to validate',
            },
          },
          required: ['content'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'query_pending_tasks': {
        const limit = args?.limit || 10;
        const response = await notion.databases.query({
          database_id: DB_IDS.routerTasks,
          filter: {
            property: 'Status',
            select: {
              equals: 'PENDING',
            },
          },
          page_size: limit,
        });

        const tasks = response.results.map((page) => ({
          pageId: page.id,
          taskId: page.properties['Task ID']?.title?.[0]?.plain_text || '',
          type: page.properties['Type']?.select?.name || '',
          target: page.properties['Target']?.select?.name || '',
          panel: page.properties['Panel']?.select?.name || '',
          payload: page.properties['Payload']?.rich_text?.[0]?.plain_text || '',
          status: page.properties['Status']?.select?.name || '',
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, tasks, count: tasks.length }, null, 2),
            },
          ],
        };
      }

      case 'update_task_status': {
        const { pageId, status, executionNotes } = args;

        const properties = {
          Status: {
            select: { name: status },
          },
        };

        if (executionNotes) {
          properties['Execution Notes'] = {
            rich_text: [{ text: { content: executionNotes } }],
          };
        }

        properties['Executed By'] = {
          rich_text: [{ text: { content: 'jen-os-mcp' } }],
        };

        await notion.pages.update({
          page_id: pageId,
          properties,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, pageId, newStatus: status }, null, 2),
            },
          ],
        };
      }

      case 'create_artifact': {
        const { name: artifactName, type, content, department } = args;

        // Validate content
        const validation = validatePayload({ name: artifactName, content });
        if (!validation.isValid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: 'Validation failed', violations: validation.violations }, null, 2),
              },
            ],
          };
        }

        const properties = {
          'Artifact Name': {
            title: [{ text: { content: artifactName } }],
          },
          Type: {
            select: { name: type },
          },
          Status: {
            select: { name: 'Draft' },
          },
          'Created By': {
            select: { name: 'Automated' },
          },
        };

        if (department) {
          properties.Department = {
            select: { name: department },
          };
        }

        if (content) {
          properties.Content = {
            rich_text: [{ text: { content: content.substring(0, 2000) } }],
          };
        }

        const page = await notion.pages.create({
          parent: { database_id: DB_IDS.artifacts },
          properties,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, pageId: page.id, name: artifactName }, null, 2),
            },
          ],
        };
      }

      case 'create_pattern': {
        const { name: patternName, type, situation, behavior, outcome } = args;

        const properties = {
          'Pattern Name': {
            title: [{ text: { content: patternName } }],
          },
          Type: {
            select: { name: type },
          },
          Confidence: {
            select: { name: 'Hypothesis' },
          },
          'Times Observed': {
            number: 1,
          },
          Situation: {
            rich_text: [{ text: { content: situation } }],
          },
          Behavior: {
            rich_text: [{ text: { content: behavior } }],
          },
        };

        if (outcome) {
          properties.Outcome = {
            rich_text: [{ text: { content: outcome } }],
          };
        }

        const page = await notion.pages.create({
          parent: { database_id: DB_IDS.patterns },
          properties,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, pageId: page.id, name: patternName }, null, 2),
            },
          ],
        };
      }

      case 'log_session': {
        const { title, platform, mode, summary, shipped } = args;

        const properties = {
          Session: {
            title: [{ text: { content: title } }],
          },
          Platform: {
            select: { name: platform },
          },
          Date: {
            date: { start: new Date().toISOString().split('T')[0] },
          },
        };

        if (mode) {
          properties.Mode = {
            select: { name: mode },
          };
        }

        if (summary) {
          properties.Summary = {
            rich_text: [{ text: { content: summary.substring(0, 2000) } }],
          };
        }

        if (shipped !== undefined) {
          properties.Shipped = {
            checkbox: shipped,
          };
        }

        const page = await notion.pages.create({
          parent: { database_id: DB_IDS.sessions },
          properties,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, pageId: page.id, title }, null, 2),
            },
          ],
        };
      }

      case 'validate_content': {
        const { content } = args;
        const validation = validatePayload({ content });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validation, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }, null, 2),
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, error: error.message }, null, 2),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jen OS MCP Server running');
}

main().catch(console.error);
