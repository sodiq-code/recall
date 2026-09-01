/**
 * Recall — dev seed script.
 *
 * Populates the local SQLite database with a demo user + a handful of sample
 * facts so the memory canvas is explorable without external dependencies.
 *
 * Run with: `bun run scripts/seed.ts`
 */
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";

const DB_URL = process.env.DATABASE_URL ?? "file:/home/z/my-project/db/custom.db";
const client = createClient({ url: DB_URL });

const DEV_USER_ID = "dev-user-local";

const DEMO_FACTS: { content: string; tags: string[]; source: string }[] = [
  {
    content:
      "Prefers dark mode for all development tools and code editors.",
    tags: ["preferences", "ui"],
    source: "user",
  },
  {
    content:
      "Works primarily in TypeScript and Next.js, with a focus on developer tooling.",
    tags: ["skills", "stack"],
    source: "user",
  },
  {
    content:
      "Timezone is Africa/Lagos (WAT, UTC+1). Schedule meetings after 10am local.",
    tags: ["schedule", "logistics"],
    source: "agent",
  },
  {
    content:
      "Building Recall — a transparent memory layer for ChatGPT on WebMCP.",
    tags: ["project", "webmcp"],
    source: "user",
  },
  {
    content:
      "Allergic to indigo and blue color palettes in UI design. Prefer neutral tones.",
    tags: ["preferences", "design"],
    source: "user",
  },
  {
    content:
      "Coffee order: flat white, oat milk, no sugar. Tea: Earl Grey, loose leaf.",
    tags: ["food", "preferences"],
    source: "agent",
  },
  {
    content:
      "Git commit style: imperative mood, lowercase, max 72 char subject. Uses conventional commits.",
    tags: ["workflow", "git"],
    source: "user",
  },
  {
    content:
      "Runs every Tuesday and Thursday morning, 5km route around the neighborhood.",
    tags: ["health", "routine"],
    source: "user",
  },
];

async function seed() {
  console.log("→ Seeding local SQLite database…");

  // Upsert the demo user.
  await client.execute({
    sql: `INSERT INTO "User" (id, oauthProvider, oauthSubject, email, name, avatarUrl, createdAt, updatedAt)
          VALUES (?, 'github', 'dev-local', 'demo@recall.local', 'Demo User', NULL, datetime('now'), datetime('now'))
          ON CONFLICT(id) DO UPDATE SET name = 'Demo User'`,
    args: [DEV_USER_ID],
  });
  console.log(`  ✓ User upserted (${DEV_USER_ID})`);

  // Check if facts already exist for this user.
  const existing = await client.execute({
    sql: `SELECT COUNT(*) as c FROM Fact WHERE userId = ?`,
    args: [DEV_USER_ID],
  });
  const count = Number((existing.rows[0] as unknown as { c: number | bigint }).c);
  if (count > 0) {
    console.log(`  → User already has ${count} facts. Skipping seed.`);
    return;
  }

  // Insert demo facts + a matching audit entry per fact (staggered timestamps).
  const now = Date.now();
  for (let i = 0; i < DEMO_FACTS.length; i++) {
    const fact = DEMO_FACTS[i];
    const factId = crypto.randomUUID();
    // Stagger creation times over the past 7 days for a realistic timeline.
    const ageMinutes = Math.floor(i * 90 + Math.random() * 60);
    const createdAt = new Date(now - ageMinutes * 60 * 1000);
    const createdIso = createdAt.toISOString().replace("T", " ").replace("Z", "");

    await client.execute({
      sql: `INSERT INTO Fact (id, userId, content, source, sourceOrigin, capabilityTokenId, relevanceScore, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      args: [
        factId,
        DEV_USER_ID,
        fact.content,
        fact.source,
        fact.source === "agent" ? "chatgpt.com" : "recall.app",
        Math.floor(Math.random() * 5),
        createdIso,
        createdIso,
      ],
    });
    for (const tag of fact.tags) {
      await client.execute({
        sql: `INSERT INTO FactTag (id, factId, tag) VALUES (?, ?, ?)`,
        args: [crypto.randomUUID(), factId, tag],
      });
    }

    // Append a matching audit entry (addFact) so the activity feed has history.
    const auditId = crypto.randomUUID();
    const argsJson = JSON.stringify({ content: fact.content, tags: fact.tags });
    const resultHash = createHash("sha256")
      .update(JSON.stringify({ id: factId }))
      .digest("hex");
    await client.execute({
      sql: `INSERT INTO AuditEntry (id, userId, timestamp, callerOrigin, toolName, argsJson, resultCount, resultHash, capabilityTokenId, signature)
            VALUES (?, ?, ?, ?, 'addFact', ?, 1, ?, NULL, 'seed')`,
      args: [auditId, DEV_USER_ID, createdIso, fact.source === "agent" ? "chatgpt.com" : "recall.app", argsJson, resultHash],
    });

    console.log(`  ✓ Fact: "${fact.content.slice(0, 50)}…" [${fact.tags.join(", ")}]`);
  }

  // Also add a couple of "query" audit entries to show tool-call activity.
  const queryEntries = [
    { query: "preferences", ts: now - 30 * 60 * 1000 },
    { query: "schedule", ts: now - 10 * 60 * 1000 },
  ];
  for (const q of queryEntries) {
    const qIso = new Date(q.ts).toISOString().replace("T", " ").replace("Z", "");
    const qArgs = JSON.stringify({ query: q.query });
    const qHash = createHash("sha256").update(qArgs).digest("hex");
    await client.execute({
      sql: `INSERT INTO AuditEntry (id, userId, timestamp, callerOrigin, toolName, argsJson, resultCount, resultHash, capabilityTokenId, signature)
            VALUES (?, ?, ?, 'chatgpt.com', 'query', ?, 2, ?, NULL, 'seed')`,
      args: [crypto.randomUUID(), DEV_USER_ID, qIso, qArgs, qHash],
    });
    console.log(`  ✓ Audit: query "${q.query}"`);
  }

  // Ensure a PermissionState row exists (all tools enabled by default).
  await client.execute({
    sql: `INSERT INTO PermissionState (id, userId, enabledToolsJson, grantedOriginsJson, updatedAt)
          VALUES (?, ?, '["query","addFact","updateFact","forgetFact","summarize","timeline"]', '["https://chatgpt.com"]', datetime('now'))
          ON CONFLICT(userId) DO NOTHING`,
    args: [crypto.randomUUID(), DEV_USER_ID],
  });
  console.log(`  ✓ PermissionState seeded (all 6 tools enabled)`);

  console.log(`\n✅ Done. ${DEMO_FACTS.length} demo facts inserted.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
