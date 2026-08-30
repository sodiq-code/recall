/**
 * Recall — assemble the six WebMCP tools with their handlers.
 *
 * This module bridges the tool SPECS (lib/webmcp/tools.ts — the schemas +
 * annotations) with the tool HANDLERS (lib/webmcp/handlers.ts — the functions
 * that call the Recall API). The result is the full WebMCPToolDefinition[]
 * passed to `registerWebMCPTools()` when a signed-in user opens /app.
 *
 * Keeping this assembly separate from both the specs and the handlers means:
 *   - the specs stay pure data (no fetch calls) — reusable in docs, the API
 *     manifest, and the playground
 *   - the handlers stay pure functions (no tool metadata) — testable in
 *     isolation
 *   - this module is the single place that says "tool X uses handler Y"
 */
import type { WebMCPToolDefinition } from "./types";
import {
  queryTool,
  addFactTool,
  updateFactTool,
  forgetFactTool,
  summarizeTool,
  timelineTool,
} from "./tools";
import {
  queryHandler,
  addFactHandler,
  updateFactHandler,
  forgetFactHandler,
  summarizeHandler,
  timelineHandler,
  type QueryInput,
  type AddFactInput,
  type UpdateFactInput,
  type ForgetFactInput,
  type SummarizeInput,
  type TimelineInput,
} from "./handlers";

/** The six WebMCP tools with their handlers wired in, ready for registration. */
export const RECALL_TOOLS: WebMCPToolDefinition[] = [
  {
    name: queryTool.name,
    description: queryTool.description,
    inputSchema: queryTool.inputSchema,
    annotations: queryTool.annotations,
    execute: (input) => queryHandler(input as unknown as QueryInput),
  },
  {
    name: addFactTool.name,
    description: addFactTool.description,
    inputSchema: addFactTool.inputSchema,
    annotations: addFactTool.annotations,
    execute: (input) => addFactHandler(input as unknown as AddFactInput),
  },
  {
    name: updateFactTool.name,
    description: updateFactTool.description,
    inputSchema: updateFactTool.inputSchema,
    annotations: updateFactTool.annotations,
    execute: (input) => updateFactHandler(input as unknown as UpdateFactInput),
  },
  {
    name: forgetFactTool.name,
    description: forgetFactTool.description,
    inputSchema: forgetFactTool.inputSchema,
    annotations: forgetFactTool.annotations,
    execute: (input) => forgetFactHandler(input as unknown as ForgetFactInput),
  },
  {
    name: summarizeTool.name,
    description: summarizeTool.description,
    inputSchema: summarizeTool.inputSchema,
    annotations: summarizeTool.annotations,
    execute: (input) => summarizeHandler(input as unknown as SummarizeInput),
  },
  {
    name: timelineTool.name,
    description: timelineTool.description,
    inputSchema: timelineTool.inputSchema,
    annotations: timelineTool.annotations,
    execute: (input) => timelineHandler(input as unknown as TimelineInput),
  },
];
