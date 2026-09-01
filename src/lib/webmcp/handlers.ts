/**
 * Recall — WebMCP tool handlers.
 *
 * Each handler is the `execute` function Recall passes to
 * `document.modelContext.registerTool()`. The handler runs in the page
 * sandbox (the browser's existing trust boundary) and calls back to the
 * Recall backend over same-origin fetch — the browser sends the session
 * cookie automatically, so the call is authenticated as the signed-in user.
 *
 * The six tools use the same protocol: (1) ChatGPT calls
 * document.modelContext.[toolName](args) in the Recall tab; (2) the handler
 * executes in the page sandbox; (3) the handler calls the Recall backend via
 * authenticated fetch; (4) the backend performs the operation, appends to the
 * audit log; (5) the handler returns the result to ChatGPT."
 *
 * The handlers call the SAME /api/memory/* routes the canvas uses ,
 * so there is exactly one code path per operation — the agent and the user
 * see the same data with the same provenance.
 */

/** The input shape for the query tool. */
export interface QueryInput {
  query: string;
  tags?: string[];
  limit?: number;
}

/** The input shape for the addFact tool. */
export interface AddFactInput {
  content: string;
  tags?: string[];
}

/** The input shape for the updateFact tool. */
export interface UpdateFactInput {
  factId: string;
  content?: string;
  tags?: string[];
}

/** The input shape for the forgetFact tool. */
export interface ForgetFactInput {
  factId: string;
}

/** The input shape for the summarize tool. */
export interface SummarizeInput {
  tags?: string[];
  limit?: number;
}

/** The input shape for the timeline tool. */
export interface TimelineInput {
  limit?: number;
}

/** The public Fact shape (matches the /api/memory response). */
export interface FactResult {
  id: string;
  content: string;
  tags: string[];
  source: "user" | "agent";
  sourceOrigin: string;
  relevanceScore: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * query — retrieve relevant facts from the user's memory vault.
 *
 * Calls POST /api/memory/query with the natural-language query + optional
 * tag filters. Uses two-stage search:
 *   1. Substring + tag match (query string matched against content AND tags)
 *   2. Recent-facts fallback (never returns empty)
 *
 * Returns the matching facts + metadata about which stage produced them.
 */
export async function queryHandler(input: QueryInput): Promise<{
  facts: FactResult[];
  count: number;
  fallback?: boolean;
  note?: string;
}> {
  const res = await fetch("/api/memory/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: input.query ?? "",
      tags: input.tags ?? [],
      limit: input.limit,
    }),
  });
  if (!res.ok) {
    return { facts: [], count: 0 };
  }
  return res.json();
}

/**
 * addFact — add a new fact to the user's memory vault.
 *
 * Calls POST /api/memory. The fact is created with source: "agent",
 * sourceOrigin: "chatgpt.com" (or the granted origin). Returns the created
 * fact so the agent can reference it in subsequent calls.
 */
export async function addFactHandler(input: AddFactInput): Promise<{
  fact: FactResult;
  note?: string;
}> {
  const res = await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: input.content,
      tags: input.tags ?? [],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to add fact");
  }
  return res.json();
}

/**
 * updateFact — update an existing fact's content and/or tags.
 *
 * Calls PATCH /api/memory/:id. Only the provided fields are updated.
 */
export async function updateFactHandler(
  input: UpdateFactInput,
): Promise<{ fact: FactResult }> {
  const body: Record<string, unknown> = {};
  if (input.content !== undefined) body.content = input.content;
  if (input.tags !== undefined) body.tags = input.tags;

  const res = await fetch(`/api/memory/${input.factId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update fact");
  }
  return res.json();
}

/**
 * forgetFact — soft-delete a fact (reversible from the audit log).
 *
 * Calls DELETE /api/memory/:id. The fact is hidden from queries but
 * retained in the audit log so it can be rolled back.
 */
export async function forgetFactHandler(
  input: ForgetFactInput,
): Promise<{ fact: FactResult; forgotten: boolean }> {
  const res = await fetch(`/api/memory/${input.factId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to forget fact");
  }
  return res.json();
}

/**
 * summarize — return a deterministic top-N summary of the memory vault.
 *
 * Calls POST /api/memory/summarize. Returns the top N facts ranked by
 * relevance score. The LLM (ChatGPT) does the prose synthesis — Recall only
 * returns the ranked facts .
 */
export async function summarizeHandler(input: SummarizeInput): Promise<{
  facts: FactResult[];
  count: number;
  ranking: string;
}> {
  const res = await fetch("/api/memory/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tags: input.tags ?? [],
      limit: input.limit,
    }),
  });
  if (!res.ok) {
    return { facts: [], count: 0, ranking: "unknown" };
  }
  return res.json();
}

/**
 * timeline — return a chronological list of recent agent actions.
 *
 * Calls GET /api/audit (the audit log endpoint). Returns recent audit entries
 * sorted by timestamp (newest first).
 */
export async function timelineHandler(input: TimelineInput): Promise<{
  entries: unknown[];
  count: number;
}> {
  const limit = input.limit ?? 20;
  const res = await fetch(`/api/audit?limit=${limit}`);
  if (!res.ok) {
    return { entries: [], count: 0 };
  }
  const data = await res.json();
  return {
    entries: data.entries ?? data.auditEntries ?? [],
    count: data.count ?? (data.entries?.length ?? 0),
  };
}
