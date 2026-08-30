import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Server, type Socket } from "socket.io";

/**
 * Recall — realtime WebSocket mini-service.
 *
 * Runs on port 3003 (per the project gateway convention). The frontend
 * connects via `io("/?XTransformPort=3003")` so the Caddy gateway routes
 * the connection to this service.
 *
 * Architecture (blueprint §21.1, §32 Day 5):
 *   1. The frontend connects and joins a per-user room (`user:<userId>`)
 *      so events can be fanned out only to that user's open tabs.
 *   2. When a WebMCP tool call (or a user mutation) appends an audit entry,
 *      the Next.js API route POSTs to this service's /emit endpoint with
 *      the userId + the audit entry.
 *   3. This service broadcasts the entry to every socket in `user:<userId>`,
 *      so all open Recall tabs update their activity feed in real time.
 *
 * The service is intentionally minimal: no persistence (the audit log lives
 * in Turso), no auth (the session cookie is validated in the Next.js layer;
 * this service is behind the gateway). The /emit endpoint accepts a shared
 * secret (REALTIME_SECRET) so only the Next.js backend can emit.
 */

const PORT = 3003;
const EMIT_SECRET = process.env.REALTIME_SECRET ?? "recall-realtime-dev";

interface AuditEvent {
  userId: string;
  entry: {
    id: string;
    timestamp: number;
    callerOrigin: string;
    toolName: string;
    args: Record<string, unknown>;
    resultCount: number;
    resultHash: string;
    capabilityTokenId: string | null;
    signature: string;
  };
}

const httpServer = createServer((req, res) => {
  // CORS: allow the Next.js backend (same origin under the gateway) to POST.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "recall-realtime",
        port: PORT,
        connections: io.engine.clientsCount,
      }),
    );
    return;
  }

  // Fan-in endpoint: POST /emit
  // The Next.js backend calls this when an audit entry is appended.
  if (req.url === "/emit" && req.method === "POST") {
    handleEmit(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

function handleEmit(req: IncomingMessage, res: ServerResponse): void {
  // Authenticate the request with the shared secret.
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${EMIT_SECRET}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    // Prevent large payloads.
    if (body.length > 1_000_000) {
      req.destroy();
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "payload_too_large" }));
    }
  });
  req.on("end", () => {
    try {
      const event = JSON.parse(body) as AuditEvent;
      if (!event.userId || !event.entry) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_payload" }));
        return;
      }
      // Broadcast to all of this user's open tabs.
      io.to(`user:${event.userId}`).emit("recall:audit", event.entry);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, emitted: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_json" }));
    }
  });
}

const io = new Server(httpServer, {
  // Use a dedicated path for the socket.io handshake so it doesn't
  // intercept the /emit and /health HTTP routes. The frontend connects
  // via io("/?XTransformPort=3003", { path: "/socket" }).
  path: "/socket",
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket: Socket) => {
  console.log(
    `[recall-realtime] client connected (id=${socket.id})`,
  );

  // Welcome event — the RealtimeStatus component listens for this.
  socket.emit("recall:welcome", {
    connected: true,
    timestamp: Date.now(),
    service: "recall-realtime",
  });

  // The client sends its userId so we can join a per-user room.
  // The userId is derived from the session in the Next.js layer; the
  // realtime service trusts it (it's behind the gateway).
  socket.on("recall:join", (userId: string) => {
    if (typeof userId === "string" && userId.length > 0) {
      socket.join(`user:${userId}`);
      console.log(
        `[recall-realtime] socket ${socket.id} joined user:${userId}`,
      );
    }
  });

  socket.on("disconnect", (reason: string) => {
    console.log(
      `[recall-realtime] client disconnected (id=${socket.id}, reason=${reason})`,
    );
  });
});

io.engine.on("connection_error", (err: { message: string }) => {
  console.error("[recall-realtime] connection error:", err.message);
});

httpServer.listen(PORT, () => {
  console.log(`[recall-realtime] listening on port ${PORT}`);
  console.log(
    `[recall-realtime] frontend connects via io("/?XTransformPort=${PORT}")`,
  );
  console.log(
    `[recall-realtime] backend emits via POST http://localhost:${PORT}/emit`,
  );
});

// Graceful shutdown.
function shutdown() {
  console.log("[recall-realtime] shutting down...");
  io.close(() => httpServer.close(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
