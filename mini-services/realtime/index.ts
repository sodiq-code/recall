import { createServer } from "http";
import { Server } from "socket.io";

/**
 * Recall — realtime WebSocket mini-service.
 *
 * Runs on port 3003 (per the project gateway convention). The frontend
 * connects via `io("/?XTransformPort=3003")` so the Caddy gateway routes
 * the connection to this service.
 *
 * Day-2 scope (blueprint §32): a stub that accepts connections and emits a
 * welcome event so the /app page's RealtimeStatus indicator can show "Live".
 * Day 5 wires the actual fan-out: when a WebMCP tool call appends an audit
 * entry, the Next.js API route emits an event to this service (via an HTTP
 * fan-in endpoint), and this service broadcasts it to all connected Recall
 * tabs for the relevant user.
 *
 * The service is intentionally minimal: socket.io with a health-check log
 * and a per-connection welcome. No persistence, no auth (the session cookie
 * is validated in the Next.js layer; this service is behind the gateway).
 */

const PORT = 3003;

const httpServer = createServer((req, res) => {
  // A trivial HTTP health check so the gateway / monitoring can probe it.
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "recall-realtime", port: PORT }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

const io = new Server(httpServer, {
  path: "/",
  cors: {
    // The gateway handles CORS; allow all origins here since the gateway
    // is the only entry point.
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

let connectionCount = 0;

io.on("connection", (socket) => {
  connectionCount++;
  console.log(
    `[recall-realtime] client connected (id=${socket.id}, total=${connectionCount})`,
  );

  // Welcome event — the RealtimeStatus component listens for this.
  socket.emit("recall:welcome", {
    connected: true,
    timestamp: Date.now(),
    service: "recall-realtime",
  });

  // Day 5 will add: socket.join(`user:${userId}`) so audit events can be
  // fanned out per-user. For now, the stub just tracks the connection.

  socket.on("disconnect", (reason) => {
    connectionCount = Math.max(0, connectionCount - 1);
    console.log(
      `[recall-realtime] client disconnected (id=${socket.id}, reason=${reason}, total=${connectionCount})`,
    );
  });
});

io.engine.on("connection_error", (err) => {
  console.error("[recall-realtime] connection error:", err.message);
});

httpServer.listen(PORT, () => {
  console.log(`[recall-realtime] listening on port ${PORT}`);
  console.log(
    `[recall-realtime] frontend connects via io("/?XTransformPort=${PORT}")`,
  );
});

// Graceful shutdown.
process.on("SIGTERM", () => {
  console.log("[recall-realtime] SIGTERM received, shutting down...");
  io.close(() => httpServer.close(() => process.exit(0)));
});
process.on("SIGINT", () => {
  console.log("[recall-realtime] SIGINT received, shutting down...");
  io.close(() => httpServer.close(() => process.exit(0)));
});
