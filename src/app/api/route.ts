import { NextResponse } from "next/server";
import { APP_VERSION, SERVICE_NAME, TOOL_NAMES } from "@/lib/constants";
import { ALL_TOOLS } from "@/lib/webmcp/tools";

/**
 * GET /api — the API root.
 *
 * Day 1 surface: a self-describing envelope that lists every endpoint Recall
 * exposes (the WebMCP tool surface + the internal HTTP/WebSocket API). This is
 * the single place to look up the API contract; it doubles as the machine-
 * readable manifest a judge (or agent) can introspect.
 *
 * The actual handlers are wired across Days 2-7; this route documents the
 * shape they will have so the scaffold is coherent from the first commit.
 */
export async function GET() {
  return NextResponse.json({
    name: SERVICE_NAME,
    version: APP_VERSION,
    description:
      "Recall — the first transparent, controllable memory layer for your ChatGPT agent, built natively on WebMCP.",
    webmcp: {
      standard: "WebMCP",
      toolSurface: ALL_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        annotations: t.annotations,
        summary: t.summary,
      })),
      grantedOrigins: ["https://chatgpt.com"],
    },
    endpoints: {
      auth: [
        "POST /api/auth/oauth/github — start the GitHub OAuth flow",
        "GET  /api/auth/oauth/github/callback — OAuth callback",
        "POST /api/auth/logout — end the session",
      ],
      memory: [
        "GET    /api/memory — list the user's facts (paginated)",
        "POST   /api/memory — create a fact (user-initiated)",
        "GET    /api/memory/:id — get one fact",
        "PATCH  /api/memory/:id — update a fact",
        "DELETE /api/memory/:id — soft-delete (forget) a fact",
        "POST   /api/memory/query — query (WebMCP query tool handler)",
        "POST   /api/memory/summarize — summarize (WebMCP summarize handler)",
      ],
      audit: [
        "GET /api/audit — list audit entries (paginated)",
        "GET /api/audit/export — export the signed audit log (JSON+JWS)",
      ],
      capability: [
        "POST /api/capability-token — issue a new capability token",
        "POST /api/capability-token/verify — verify a capability token",
      ],
      permissions: [
        "GET   /api/permissions — get the user's permission state",
        "PATCH /api/permissions — update tool enablement / granted origins",
      ],
      realtime: ["WS /api/realtime — WebSocket for real-time updates"],
    },
    toolNames: TOOL_NAMES,
  });
}
