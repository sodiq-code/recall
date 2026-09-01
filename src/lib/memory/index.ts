import { db } from "@/lib/db";
import { LIMITS } from "@/lib/constants";
import type { InArgs } from "@libsql/client";

/**
 * Recall — memory data-access layer.
 *
 * The typed CRUD module the /api/memory/* routes and the /app canvas use to
 * read and write the user's memory vault. Every method takes a userId (derived
 * from the session in the route handler) so the access is always scoped —
 * there is no global "list all facts" path.
 *
 * The Fact model:
 *   - content: 1-500 chars (validated)
 *   - tags: max 10 per fact, each 1-30 chars, lowercase alphanumeric + hyphen
 *   - source: "user" (typed in Recall) or "agent" (added via addFact tool)
 *   - sourceOrigin: "recall.app" or a granted agent origin
 *   - deletedAt: soft-delete (forget) — the audit log retains integrity via
 *     result hashes, so a forgotten fact can be rolled back
 *   - relevanceScore: frequency-based, incremented on query hits 
 *
 * Tags are stored in a normalized FactTag table (factId, tag) with a unique
 * constraint. create/update sync the FactTag rows to match the provided tags.
 */

export interface Fact {
  id: string;
  content: string;
  tags: string[];
  source: "user" | "agent";
  sourceOrigin: string;
  capabilityTokenId: string | null;
  relevanceScore: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface FactInput {
  content: string;
  tags?: string[];
}

export interface ListFactsOptions {
  /** Filter by tag (exact match). */
  tag?: string;
  /** Include soft-deleted facts. Defaults to false. */
  includeDeleted?: boolean;
  /** Max facts to return (default 50, max 200). */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}

export interface QueryFactsOptions {
  query: string;
  tags?: string[];
  limit?: number;
}

// ---------------------------------------------------------------------------
// Validation + normalization
// ---------------------------------------------------------------------------

export class FactValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = "FactValidationError";
  }
}

/** Validate fact content (1-500 chars). */
export function validateContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length < LIMITS.FACT_MIN_LENGTH) {
    throw new FactValidationError(
      `Fact content must be at least ${LIMITS.FACT_MIN_LENGTH} character.`,
      "content",
    );
  }
  if (trimmed.length > LIMITS.FACT_MAX_LENGTH) {
    throw new FactValidationError(
      `Fact content must be at most ${LIMITS.FACT_MAX_LENGTH} characters.`,
      "content",
    );
  }
  return trimmed;
}

/**
 * Normalize + validate a list of tags.
 *
 * Tags are: lowercase, alphanumeric + hyphen, 1-30 chars, max 10 per fact.
 * Duplicate tags are deduplicated.
 */
export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const normalized = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (normalized.length === 0) continue;
    if (normalized.length > LIMITS.TAG_MAX_LENGTH) {
      throw new FactValidationError(
        `Tag "${raw}" is too long (max ${LIMITS.TAG_MAX_LENGTH} chars).`,
        "tags",
      );
    }
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      throw new FactValidationError(
        `Tag "${raw}" contains invalid characters.`,
        "tags",
      );
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  if (result.length > LIMITS.TAG_MAX_PER_FACT) {
    throw new FactValidationError(
      `A fact can have at most ${LIMITS.TAG_MAX_PER_FACT} tags.`,
      "tags",
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface FactRow {
  id: string;
  content: string;
  source: string;
  sourceOrigin: string;
  capabilityTokenId: string | null;
  relevanceScore: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function parseDate(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Turso returns DATETIME as "YYYY-MM-DD HH:MM:SS" or ISO.
    const iso = value.includes("T")
      ? value
      : value.replace(" ", "T") + "Z";
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return Date.now();
}

function mapFact(row: FactRow, tags: string[]): Fact {
  return {
    id: row.id,
    content: row.content,
    tags,
    source: row.source as "user" | "agent",
    sourceOrigin: row.sourceOrigin,
    capabilityTokenId: row.capabilityTokenId,
    relevanceScore:
      typeof row.relevanceScore === "bigint"
        ? Number(row.relevanceScore)
        : row.relevanceScore,
    createdAt: parseDate(row.createdAt),
    updatedAt: parseDate(row.updatedAt),
    deletedAt: row.deletedAt ? parseDate(row.deletedAt) : null,
  };
}

async function fetchTagsForFact(factId: string): Promise<string[]> {
  const result = await db.execute({
    sql: `SELECT tag FROM FactTag WHERE factId = ? ORDER BY tag`,
    args: [factId],
  });
  return result.rows.map((r) => (r as unknown as { tag: string }).tag);
}

async function fetchTagsForFacts(
  factIds: string[],
): Promise<Map<string, string[]>> {
  if (factIds.length === 0) return new Map();
  const placeholders = factIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `SELECT factId, tag FROM FactTag WHERE factId IN (${placeholders}) ORDER BY factId, tag`,
    args: factIds,
  });
  const map = new Map<string, string[]>();
  for (const row of result.rows) {
    const r = row as unknown as { factId: string; tag: string };
    const list = map.get(r.factId) ?? [];
    list.push(r.tag);
    map.set(r.factId, list);
  }
  return map;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/** Create a new fact. */
export async function createFact(
  userId: string,
  input: FactInput,
  source: "user" | "agent" = "user",
  sourceOrigin = "recall.app",
  capabilityTokenId: string | null = null,
): Promise<Fact> {
  const content = validateContent(input.content);
  const tags = normalizeTags(input.tags);
  const id = crypto.randomUUID();

  const statements: { sql: string; args: InArgs }[] = [
    {
      sql: `INSERT INTO Fact (id, userId, content, source, sourceOrigin, capabilityTokenId, relevanceScore, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      args: [id, userId, content, source, sourceOrigin, capabilityTokenId],
    },
    ...tags.map((tag) => ({
      sql: `INSERT INTO FactTag (id, factId, tag) VALUES (?, ?, ?)`,
      args: [crypto.randomUUID(), id, tag] as InArgs,
    })),
  ];
  await db.batch(statements);

  const created = await getFact(userId, id);
  return created!;
}

/** Get a single fact by ID (returns null if not found or not owned). */
export async function getFact(
  userId: string,
  factId: string,
): Promise<Fact | null> {
  const result = await db.execute({
    sql: `SELECT id, content, source, sourceOrigin, capabilityTokenId, relevanceScore, createdAt, updatedAt, deletedAt FROM Fact WHERE id = ? AND userId = ?`,
    args: [factId, userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as unknown as FactRow;
  const tags = await fetchTagsForFact(factId);
  return mapFact(row, tags);
}

/** List the user's facts (excludes soft-deleted by default). */
export async function listFacts(
  userId: string,
  options: ListFactsOptions = {},
): Promise<Fact[]> {
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;
  const includeDeleted = options.includeDeleted ?? false;

  let sql = `SELECT id, content, source, sourceOrigin, capabilityTokenId, relevanceScore, createdAt, updatedAt, deletedAt FROM Fact WHERE userId = ?`;
  const args: InArgs = [userId];

  if (!includeDeleted) {
    sql += ` AND deletedAt IS NULL`;
  }
  if (options.tag) {
    sql += ` AND id IN (SELECT factId FROM FactTag WHERE tag = ?)`;
    args.push(options.tag);
  }
  sql += ` ORDER BY updatedAt DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  const factIds = result.rows.map((r) => (r as unknown as { id: string }).id);
  const tagsMap = await fetchTagsForFacts(factIds);

  return result.rows.map((row) => {
    const r = row as unknown as FactRow;
    return mapFact(r, tagsMap.get(r.id) ?? []);
  });
}

/** Update a fact's content and/or tags. */
export async function updateFact(
  userId: string,
  factId: string,
  input: Partial<FactInput>,
): Promise<Fact | null> {
  const existing = await getFact(userId, factId);
  if (!existing) return null;

  const content =
    input.content !== undefined ? validateContent(input.content) : existing.content;
  const tags =
    input.tags !== undefined ? normalizeTags(input.tags) : existing.tags;

  // Sync tags: delete all existing, insert the new set.
  const statements: { sql: string; args: InArgs }[] = [
    {
      sql: `UPDATE Fact SET content = ?, updatedAt = datetime('now') WHERE id = ? AND userId = ?`,
      args: [content, factId, userId],
    },
    {
      sql: `DELETE FROM FactTag WHERE factId = ?`,
      args: [factId],
    },
    ...tags.map((tag) => ({
      sql: `INSERT INTO FactTag (id, factId, tag) VALUES (?, ?, ?)`,
      args: [crypto.randomUUID(), factId, tag] as InArgs,
    })),
  ];

  await db.batch(statements);
  return getFact(userId, factId);
}

/** Soft-delete a fact (forget). Reversible from the audit log. */
export async function forgetFact(
  userId: string,
  factId: string,
): Promise<Fact | null> {
  const existing = await getFact(userId, factId);
  if (!existing) return null;

  await db.execute({
    sql: `UPDATE Fact SET deletedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ? AND userId = ?`,
    args: [factId, userId],
  });

  return getFact(userId, factId);
}

/** Restore a soft-deleted fact (undo forget). */
export async function restoreFact(
  userId: string,
  factId: string,
): Promise<Fact | null> {
  await db.execute({
    sql: `UPDATE Fact SET deletedAt = NULL, updatedAt = datetime('now') WHERE id = ? AND userId = ?`,
    args: [factId, userId],
  });
  return getFact(userId, factId);
}

/**
 * Query facts by natural-language string + optional tag filters.
 *
 * Deterministic: substring match on content + tag match, sorted by relevance
 * score . Semantic search is a  for the
 * post-MVP version.
 */
export async function queryFacts(
  userId: string,
  options: QueryFactsOptions,
): Promise<Fact[]> {
  const limit = Math.min(options.limit ?? LIMITS.QUERY_DEFAULT_LIMIT, LIMITS.QUERY_MAX_LIMIT);
  const query = options.query.toLowerCase().trim();
  const tags = options.tags ?? [];

  // Start with all non-deleted facts for the user. When a query string is
  // present, LEFT JOIN FactTag so we can match content OR tag substring.
  let sql = `SELECT DISTINCT f.id, f.content, f.source, f.sourceOrigin, f.capabilityTokenId, f.relevanceScore, f.createdAt, f.updatedAt, f.deletedAt
             FROM Fact f`;
  const args: InArgs = [userId];

  if (query) {
    sql += ` LEFT JOIN FactTag ft ON ft.factId = f.id`;
  }
  sql += ` WHERE f.userId = ? AND f.deletedAt IS NULL`;

  // Tag filter: all provided tags must be present.
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    sql += ` AND f.id IN (SELECT factId FROM FactTag WHERE tag IN (${placeholders}) GROUP BY factId HAVING COUNT(DISTINCT tag) = ?)`;
    args.push(...tags, tags.length);
  }

  // Content OR tag substring match (case-insensitive). Querying "preferences"
  // now matches both facts containing the word AND facts tagged #preferences.
  if (query) {
    sql += ` AND (LOWER(f.content) LIKE ? OR LOWER(ft.tag) LIKE ?)`;
    args.push(`%${query}%`, `%${query}%`);
  }

  sql += ` ORDER BY f.relevanceScore DESC, f.updatedAt DESC LIMIT ?`;
  args.push(limit);

  const result = await db.execute({ sql, args });
  const factIds = result.rows.map((r) => (r as unknown as { id: string }).id);
  const tagsMap = await fetchTagsForFacts(factIds);

  return result.rows.map((row) => {
    const r = row as unknown as FactRow;
    return mapFact(r, tagsMap.get(r.id) ?? []);
  });
}

/**
 * Summarize: return the top N facts by relevance score .
 * Deterministic — the LLM (ChatGPT) does the prose synthesis, not Recall.
 */
export async function summarizeFacts(
  userId: string,
  tags: string[] = [],
  limit: number = LIMITS.QUERY_DEFAULT_LIMIT,
): Promise<Fact[]> {
  return queryFacts(userId, {
    query: "",
    tags,
    limit: Math.min(limit, LIMITS.QUERY_MAX_LIMIT),
  });
}

/** Count the user's active (non-deleted) facts. */
export async function countFacts(userId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as c FROM Fact WHERE userId = ? AND deletedAt IS NULL`,
    args: [userId],
  });
  const c = (result.rows[0] as unknown as { c: number | bigint }).c;
  return typeof c === "bigint" ? Number(c) : (c as number);
}

/** Get all distinct tags the user has used (for the tag filter UI). */
export async function listTags(userId: string): Promise<string[]> {
  const result = await db.execute({
    sql: `SELECT DISTINCT t.tag FROM FactTag t JOIN Fact f ON f.id = t.factId WHERE f.userId = ? AND f.deletedAt IS NULL ORDER BY t.tag`,
    args: [userId],
  });
  return result.rows.map((r) => (r as unknown as { tag: string }).tag);
}
