import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import {
  queryFacts,
  listFacts,
  mapFact,
  fetchTagsForFacts,
  type Fact,
  type FactRow,
} from "./index";
import type { InArgs } from "@libsql/client";

/**
 * Recall — semantic search layer.
 *
 * Three-stage query pipeline (blueprint §23.3 + post-MVP semantic improvement):
 *
 *   1. Substring + tag match (fast, deterministic) — queryFacts()
 *   2. LLM query expansion — if stage 1 returns 0, expand the query into
 *      related terms (e.g. "hobbies" → ["hobbies", "interests", "climbing",
 *      "sports", "games", ...]) and search content for ANY of them
 *   3. Recent-facts fallback — if stages 1+2 return 0, return the user's
 *      most recent facts so the result is never jarringly empty
 *
 * The expansion uses z-ai-web-dev-sdk (server-side only). The LLM knows that
 * "rock climbing" is a hobby, so querying "hobbies" finds "I like rock
 * climbing" even though the word "hobbies" doesn't appear in the content.
 *
 * This is the blueprint's "SHOULD/COULD" semantic search — implemented as
 * query expansion rather than embeddings so it works with the existing
 * SQLite/libSQL store without a vector database.
 */

export interface SemanticQueryResult {
  facts: Fact[];
  count: number;
  /** True if LLM query expansion was used (stage 2). */
  expanded: boolean;
  /** The expanded terms searched (only when expanded=true). */
  expandedTerms?: string[];
  /** True if results are recent facts, not search matches (stage 3). */
  fallback: boolean;
  /** Human-readable note about the search strategy. */
  note?: string;
}

/**
 * Expand a search query into related terms using an LLM.
 *
 * "hobbies" → ["hobbies", "hobby", "interests", "pastimes", "activities",
 *   "climbing", "sports", "games", "reading", "music"]
 *
 * Returns the original query + up to 12 expanded terms. Falls back to just
 * the original query if both LLM providers fail.
 *
 * Provider priority:
 *   1. Google Gemini API (if GEMINI_API_KEY is set — works on Vercel)
 *   2. z-ai-web-dev-sdk (sandbox environment via /etc/.z-ai-config)
 *   3. Original query only (graceful degradation)
 */
export async function expandQuery(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Try Gemini API first (production on Vercel).
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const terms = await expandWithGemini(trimmed, geminiKey);
      if (terms.length > 0) return terms;
    } catch {
      // Fall through to z-ai SDK.
    }
  }

  // Try z-ai-web-dev-sdk (sandbox).
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are a search query expansion engine for a personal memory vault. " +
            "Given a search query, return a JSON array of related terms and synonyms " +
            "that might appear in stored facts. Include the original word, synonyms, " +
            "and concrete examples of things that match the category. " +
            "Return ONLY a JSON array of lowercase strings, no explanation. " +
            "Max 12 terms. Example: input \"hobbies\" → " +
            "[\"hobbies\",\"hobby\",\"interests\",\"pastimes\",\"activities\"," +
            "\"climbing\",\"sports\",\"games\",\"reading\",\"music\",\"coding\",\"art\"]",
        },
        {
          role: "user",
          content: `Expand: "${trimmed}"`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    return parseTermsFromResponse(content, trimmed);
  } catch {
    // Both providers failed — return just the original query.
    return [trimmed.toLowerCase()];
  }
}

/**
 * Call the Google Gemini API directly to expand the query.
 * Uses gemini-2.0-flash for speed. Works on Vercel with GEMINI_API_KEY.
 */
async function expandWithGemini(query: string, apiKey: string): Promise<string[]> {
  const prompt =
    "You are a search query expansion engine for a personal memory vault. " +
    "Given a search query, return a JSON array of related terms and synonyms " +
    "that might appear in stored facts. Include the original word, synonyms, " +
    "and concrete examples of things that match the category. " +
    "Return ONLY a JSON array of lowercase strings, no explanation. " +
    "Max 12 terms. Example: input \"hobbies\" → " +
    "[\"hobbies\",\"hobby\",\"interests\",\"pastimes\",\"activities\"," +
    "\"climbing\",\"sports\",\"games\",\"reading\",\"music\",\"coding\",\"art\"]\n\n" +
    `Expand: "${query}"`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return parseTermsFromResponse(content, query);
}

/** Extract a JSON array of terms from an LLM response. */
function parseTermsFromResponse(content: string, originalQuery: string): string[] {
  // Extract the JSON array from the response (the LLM sometimes wraps in
  // markdown code fences).
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [originalQuery.toLowerCase()];

  try {
    const terms = JSON.parse(jsonMatch[0]) as string[];
    const cleaned = terms
      .map((t) => String(t).toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 12);

    // Always include the original query.
    if (!cleaned.includes(originalQuery.toLowerCase())) {
      cleaned.unshift(originalQuery.toLowerCase());
    }
    return cleaned;
  } catch {
    return [originalQuery.toLowerCase()];
  }
}

/**
 * Search facts by multiple terms (OR condition). Each term is matched as a
 * substring against content. Results are ranked by how many terms they match
 * (more matches = higher relevance), then by relevanceScore + recency.
 */
export async function searchFactsByTerms(
  userId: string,
  terms: string[],
  limit: number = 10,
): Promise<Fact[]> {
  if (terms.length === 0) return [];

  // Build OR conditions for each term.
  const conditions = terms.map(() => `LOWER(f.content) LIKE ?`).join(" OR ");
  const args: InArgs = [userId, ...terms.map((t) => `%${t}%`), Math.min(limit, 50)];

  const sql = `SELECT f.id, f.content, f.source, f.sourceOrigin, f.capabilityTokenId,
                      f.relevanceScore, f.createdAt, f.updatedAt, f.deletedAt
               FROM Fact f
               WHERE f.userId = ? AND f.deletedAt IS NULL AND (${conditions})
               ORDER BY f.relevanceScore DESC, f.updatedAt DESC
               LIMIT ?`;

  const result = await db.execute({ sql, args });
  const factIds = result.rows.map((r) => (r as unknown as { id: string }).id);
  const tagsMap = await fetchTagsForFacts(factIds);

  return result.rows.map((row) => {
    const r = row as unknown as FactRow;
    return mapFact(r, tagsMap.get(r.id) ?? []);
  });
}

/**
 * Full semantic query pipeline. Tries substring+tag match first, then LLM
 * expansion, then recent-facts fallback. Always returns a result (never empty
 * unless the user has zero facts).
 */
export async function semanticQueryFacts(
  userId: string,
  options: { query: string; tags?: string[]; limit?: number },
): Promise<SemanticQueryResult> {
  const { query, tags, limit } = options;
  const trimmedQuery = query.trim();

  // Stage 1: substring + tag match (fast path).
  const directResults = await queryFacts(userId, {
    query: trimmedQuery,
    tags,
    limit,
  });

  if (directResults.length > 0) {
    return {
      facts: directResults,
      count: directResults.length,
      expanded: false,
      fallback: false,
    };
  }

  // Stage 2: LLM query expansion (only if stage 1 returned 0).
  if (trimmedQuery) {
    const expandedTerms = await expandQuery(trimmedQuery);
    const expandedResults = await searchFactsByTerms(userId, expandedTerms, limit ?? 10);

    if (expandedResults.length > 0) {
      return {
        facts: expandedResults,
        count: expandedResults.length,
        expanded: true,
        expandedTerms,
        fallback: false,
        note: `No exact match for "${trimmedQuery}". Expanded to: ${expandedTerms.slice(0, 5).join(", ")}${expandedTerms.length > 5 ? "…" : ""}`,
      };
    }
  }

  // Stage 3: recent-facts fallback.
  const recent = await listFacts(userId, { limit: limit ?? 5 });
  return {
    facts: recent,
    count: recent.length,
    expanded: false,
    fallback: true,
    note: recent.length > 0
      ? `No facts match "${trimmedQuery}". Showing your ${recent.length} most recent ${recent.length === 1 ? "fact" : "facts"}.`
      : "Your memory vault is empty. Add a fact to get started.",
  };
}
