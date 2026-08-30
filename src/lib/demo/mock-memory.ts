/**
 * Recall — demo memory vault + simulated tool executor.
 *
 * The Tool Playground (on the landing page and at /playground) lets a visitor
 * explore Recall's six WebMCP tools hands-on — without signing in, without
 * ChatGPT, without a backend. The visitor *plays the agent*: they pick a
 * tool, fill in the args, hit "Call tool", and see the same response shape
 * ChatGPT would receive, plus the audit-log entry Recall would record.
 *
 * This module is the in-memory mock the playground runs against. It is
 * deliberately honest:
 *   - the six facts are clearly labelled `demo: true` so nobody mistakes
 *     them for real user data;
 *   - the executor implements the same deterministic logic the real tool
 *     handlers will use on Days 3-5 (substring + tag match for `query`,
 *     top-N by relevance for `summarize`, audit-log sort for `timeline`);
 *   - every simulated call returns a result *and* a simulated audit entry,
 *     so the playground demonstrates the full provenance contract, not just
 *     the happy path.
 *
 * Blueprint §24.5 ("Memory model"): "Simulated/demo data: the demo-day
 * pre-filled memory (5-10 facts the user starts with, clearly marked
 * 'demo')." This is exactly that seed set.
 */
import type { ToolName } from "@/lib/constants";

/** A single fact in the demo vault. Mirrors the Fact type (blueprint §24.1). */
export interface DemoFact {
  id: string;
  content: string;
  tags: string[];
  source: "user" | "agent";
  sourceOrigin: string;
  createdAt: number;
  updatedAt: number;
  relevanceScore: number;
  demo: boolean;
}

/** A simulated audit entry. Mirrors AuditEntry (blueprint §24.1). */
export interface DemoAuditEntry {
  id: string;
  timestamp: number;
  callerOrigin: string;
  toolName: ToolName;
  args: Record<string, unknown>;
  resultCount: number;
  resultHash: string;
}

/** The seed vault — 7 facts a new demo user starts with. */
export const DEMO_FACTS: DemoFact[] = [
  {
    id: "fact_01",
    content: "Hobbies: rock climbing, bouldering, and trail running.",
    tags: ["hobbies", "sport"],
    source: "user",
    sourceOrigin: "recall.app",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    relevanceScore: 12,
    demo: true,
  },
  {
    id: "fact_02",
    content: "Vegetarian — no meat or fish; eggs and dairy are fine.",
    tags: ["diet", "preference"],
    source: "user",
    sourceOrigin: "recall.app",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    relevanceScore: 8,
    demo: true,
  },
  {
    id: "fact_03",
    content: "Prefers morning meetings (08:00–11:00 local time).",
    tags: ["work", "preference"],
    source: "agent",
    sourceOrigin: "chatgpt.com",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    relevanceScore: 6,
    demo: true,
  },
  {
    id: "fact_04",
    content: "Working on the WebMCP Challenge hackathon (OpenAI / Devpost).",
    tags: ["work", "project"],
    source: "user",
    sourceOrigin: "recall.app",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    relevanceScore: 15,
    demo: true,
  },
  {
    id: "fact_05",
    content: "Lives in the Lagos timezone (WAT, UTC+1).",
    tags: ["location", "preference"],
    source: "user",
    sourceOrigin: "recall.app",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 21,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 21,
    relevanceScore: 9,
    demo: true,
  },
  {
    id: "fact_06",
    content: "Speaks English and Yoruba fluently; learning Arabic.",
    tags: ["language"],
    source: "user",
    sourceOrigin: "recall.app",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    relevanceScore: 7,
    demo: true,
  },
  {
    id: "fact_07",
    content: "Uses a mechanical keyboard and prefers dark-mode UIs.",
    tags: ["preference", "tools"],
    source: "agent",
    sourceOrigin: "chatgpt.com",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    relevanceScore: 4,
    demo: true,
  },
];

/** A few pre-existing demo audit entries, so `timeline` has something to show. */
export const DEMO_AUDIT_SEED: DemoAuditEntry[] = [
  {
    id: "audit_seed_1",
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    callerOrigin: "chatgpt.com",
    toolName: "query",
    args: { query: "what do you know about my hobbies?" },
    resultCount: 1,
    resultHash: "a1b2c3…",
  },
  {
    id: "audit_seed_2",
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    callerOrigin: "chatgpt.com",
    toolName: "addFact",
    args: { content: "Uses a mechanical keyboard…" },
    resultCount: 1,
    resultHash: "d4e5f6…",
  },
  {
    id: "audit_seed_3",
    timestamp: Date.now() - 1000 * 60 * 60 * 26,
    callerOrigin: "recall.app",
    toolName: "updateFact",
    args: { factId: "fact_04", content: "Working on the WebMCP Challenge…" },
    resultCount: 1,
    resultHash: "7g8h9i…",
  },
];

export interface ToolCallResult {
  /** The tool name that was called. */
  tool: ToolName;
  /** The args the caller sent. */
  args: Record<string, unknown>;
  /** The result object the tool returned (the shape ChatGPT would receive). */
  result: unknown;
  /** The simulated audit entry Recall would append. */
  audit: DemoAuditEntry;
  /** Wall-clock ms the simulated call took (for the latency readout). */
  latencyMs: number;
}

/**
 * Execute a simulated tool call against the demo vault.
 *
 * Each branch implements the same deterministic logic the real handler will
 * use on Days 3-5 — so the playground is a faithful preview, not a toy. The
 * only thing that's mocked is the persistence (the demo vault is read-only;
 * addFact / updateFact / forgetFact describe what *would* happen).
 */
export function executeDemoToolCall(
  tool: ToolName,
  args: Record<string, unknown>,
): ToolCallResult {
  const startedAt = performance.now();
  let result: unknown;
  let resultCount = 0;

  switch (tool) {
    case "query": {
      const query = String(args.query ?? "").toLowerCase();
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
      const limit = clampInt(args.limit, 1, 50, 10);
      const matches = DEMO_FACTS.filter((f) => {
        if (tags.length > 0 && !tags.every((t) => f.tags.includes(t))) {
          return false;
        }
        if (!query) return true;
        return (
          f.content.toLowerCase().includes(query) ||
          f.tags.some((t) => t.includes(query))
        );
      })
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
      result = {
        facts: matches.map(toPublicFact),
        count: matches.length,
        truncated: matches.length === limit,
      };
      resultCount = matches.length;
      break;
    }
    case "addFact": {
      const content = String(args.content ?? "").trim();
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
      result = {
        status: "would_add",
        fact: {
          id: `fact_${Math.random().toString(36).slice(2, 8)}`,
          content,
          tags,
          source: "agent",
          sourceOrigin: "chatgpt.com",
          demo: true,
        },
        note: "In demo mode the vault is read-only. The real addFact handler persists this fact and appends a signed audit entry.",
      };
      resultCount = 1;
      break;
    }
    case "updateFact": {
      const factId = String(args.factId ?? "");
      const existing = DEMO_FACTS.find((f) => f.id === factId);
      result = existing
        ? {
            status: "would_update",
            factId,
            before: toPublicFact(existing),
            after: {
              ...toPublicFact(existing),
              content: args.content ?? existing.content,
              tags: Array.isArray(args.tags) ? (args.tags as string[]) : existing.tags,
              updatedAt: Date.now(),
            },
          }
        : { status: "not_found", factId };
      resultCount = existing ? 1 : 0;
      break;
    }
    case "forgetFact": {
      const factId = String(args.factId ?? "");
      const existing = DEMO_FACTS.find((f) => f.id === factId);
      result = existing
        ? {
            status: "would_forget",
            factId,
            content: existing.content,
            reversible: true,
            note: "forgetFact is a soft delete — the fact is hidden from query results but retained in the audit log so it can be rolled back.",
          }
        : { status: "not_found", factId };
      resultCount = existing ? 1 : 0;
      break;
    }
    case "summarize": {
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
      const limit = clampInt(args.limit, 1, 50, 10);
      const top = DEMO_FACTS.filter((f) =>
        tags.length > 0 ? tags.every((t) => f.tags.includes(t)) : true,
      )
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
      result = {
        summary: top.map(toPublicFact),
        count: top.length,
        ranking: "relevanceScore (frequency-based, blueprint §23.3)",
      };
      resultCount = top.length;
      break;
    }
    case "timeline": {
      const limit = clampInt(args.limit, 1, 100, 20);
      const entries = [...DEMO_AUDIT_SEED].sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      result = {
        entries: entries.slice(0, limit),
        count: Math.min(entries.length, limit),
        note: "The real timeline returns from the signed, append-only audit log.",
      };
      resultCount = entries.length;
      break;
    }
  }

  const latencyMs = Math.round(performance.now() - startedAt);
  const audit: DemoAuditEntry = {
    id: `audit_sim_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: Date.now(),
    callerOrigin: "chatgpt.com",
    toolName: tool,
    args,
    resultCount,
    resultHash: hashResult(result),
  };

  return { tool, args, result, audit, latencyMs };
}

function toPublicFact(f: DemoFact) {
  return {
    id: f.id,
    content: f.content,
    tags: f.tags,
    source: f.source,
    sourceOrigin: f.sourceOrigin,
    relevanceScore: f.relevanceScore,
    demo: f.demo,
  };
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hashResult(result: unknown): string {
  // Deterministic, short hash for display. Not cryptographically meaningful —
  // the real handler uses SHA-256 (lib/audit/computeResultHash).
  const str = JSON.stringify(result);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `${hex.slice(0, 4)}…${hex.slice(-2)}`;
}

/** Suggested example args for each tool — used to pre-fill the playground form. */
export const TOOL_EXAMPLES: Record<ToolName, Record<string, unknown>> = {
  query: { query: "hobbies", tags: [], limit: 10 },
  addFact: {
    content: "Prefers async communication over synchronous meetings.",
    tags: ["work", "preference"],
  },
  updateFact: { factId: "fact_03", content: "Prefers morning meetings (09:00–12:00 WAT)." },
  forgetFact: { factId: "fact_07" },
  summarize: { tags: [], limit: 5 },
  timeline: { limit: 20 },
};
