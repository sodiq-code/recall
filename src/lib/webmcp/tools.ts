/**
 * Recall — the six WebMCP tool definitions.
 *
 * This is the canonical source of truth for the tool surface Recall publishes.
 * The schemas and annotations here match the blueprint §26.1 exactly and are
 * reused by:
 *   - the client-side registration module (`lib/webmcp/index.ts`)
 *   - the server-side tool handlers (`app/api/memory/*`, `app/api/audit/*`)
 *   - the permission model (`lib/capability`) and audit log (`lib/audit`)
 *
 * The `execute` handlers are wired on Day 4. On Day 1 the tool definitions
 * exist so the type contract is in place and the landing page can render
 * them in the "six tools" explainer.
 */
import type { JsonSchema, ToolAnnotations } from "./types";

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: ToolAnnotations;
  /** One-line summary for UI display. */
  summary: string;
}

/**
 * query — retrieve relevant facts from the user's memory vault.
 * Read-only, trusted content.
 */
export const queryTool: ToolSpec = {
  name: "query",
  description:
    "Retrieve relevant facts from the user's memory vault. Use when the user asks what you know about them, or when you need to check the user's stated preferences.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural-language query, 1-200 chars",
      },
      tags: {
        type: "array",
        description: "Optional tag filters",
        items: { type: "string" },
        maxItems: 5,
      },
      limit: {
        type: "integer",
        description: "Max facts to return (default 10, max 50)",
        default: 10,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  summary: "Read the user's memory by natural-language query.",
};

/**
 * addFact — add a new fact to the user's memory vault.
 * Writes untrusted (agent-supplied) content.
 */
export const addFactTool: ToolSpec = {
  name: "addFact",
  description:
    "Add a new fact to the user's memory vault. Use when the user states a preference, fact, or context about themselves that should be remembered.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The fact, 1-500 chars",
        minLength: 1,
        maxLength: 500,
      },
      tags: {
        type: "array",
        description: "Optional tags",
        items: { type: "string" },
        maxItems: 10,
      },
    },
    required: ["content"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: true },
  summary: "Write a new fact to the user's memory.",
};

/**
 * updateFact — update an existing fact's content and/or tags.
 * Writes untrusted content.
 */
export const updateFactTool: ToolSpec = {
  name: "updateFact",
  description:
    "Update an existing fact in the user's memory vault. Use to keep a fact current when the user corrects or refines a previously stored preference.",
  inputSchema: {
    type: "object",
    properties: {
      factId: { type: "string", description: "The ID of the fact to update" },
      content: {
        type: "string",
        description: "Updated fact text, 1-500 chars",
        minLength: 1,
        maxLength: 500,
      },
      tags: {
        type: "array",
        description: "Optional replacement tags",
        items: { type: "string" },
        maxItems: 10,
      },
    },
    required: ["factId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: true },
  summary: "Update an existing fact's content or tags.",
};

/**
 * forgetFact — soft-delete a fact (revocable via the audit log).
 */
export const forgetFactTool: ToolSpec = {
  name: "forgetFact",
  description:
    "Soft-delete a fact from the user's memory vault. Use when the user asks to forget or remove a specific fact. The action is recorded and reversible from the audit log.",
  inputSchema: {
    type: "object",
    properties: {
      factId: { type: "string", description: "The ID of the fact to forget" },
    },
    required: ["factId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  summary: "Forget (soft-delete) a fact — reversible from the audit log.",
};

/**
 * summarize — return a deterministic structured summary (top N facts).
 * Read-only, trusted. The LLM (ChatGPT) does the prose synthesis; Recall
 * only returns ranked facts (blueprint §25.2).
 */
export const summarizeTool: ToolSpec = {
  name: "summarize",
  description:
    "Return a structured summary of the user's memory vault — the top N facts ranked by relevance. Use when the user asks to summarize what you know about them.",
  inputSchema: {
    type: "object",
    properties: {
      tags: {
        type: "array",
        description: "Optional tag filters",
        items: { type: "string" },
        maxItems: 5,
      },
      limit: {
        type: "integer",
        description: "Max facts to return (default 10, max 50)",
        default: 10,
      },
    },
    required: [],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  summary: "Deterministic top-N summary of the memory vault.",
};

/**
 * timeline — return a chronological list of agent actions from the audit log.
 * Read-only, trusted.
 */
export const timelineTool: ToolSpec = {
  name: "timeline",
  description:
    "Return a chronological list of recent agent actions on the user's memory vault. Use when the user asks what you have done with their memory lately.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Max entries to return (default 20, max 100)",
        default: 20,
      },
    },
    required: [],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  summary: "Chronological audit-log timeline of agent actions.",
};

/** The six tools, in canonical order. */
export const ALL_TOOLS: ToolSpec[] = [
  queryTool,
  addFactTool,
  updateFactTool,
  forgetFactTool,
  summarizeTool,
  timelineTool,
];

/** Look up a tool spec by name. */
export function getToolSpec(name: string): ToolSpec | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
