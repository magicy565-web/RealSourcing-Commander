import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── WebSocket 客户端管理 ──────────────────────────────────────────
interface WarroomClient {
  ws: WebSocket;
  userId?: string;
  connectedAt: Date;
  lastPing: Date;
}

const clients = new Map<string, WarroomClient>();

function broadcast(type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  clients.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// Heartbeat check — remove stale connections every 35s
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, id) => {
    if (now - client.lastPing.getTime() > 60_000) {
      client.ws.terminate();
      clients.delete(id);
    }
  });
}, 35_000);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── WebSocket Server ──────────────────────────────────────────
  const wss = new WebSocketServer({ server, path: "/ws/warroom" });

  wss.on("connection", (ws, req) => {
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    const client: WarroomClient = {
      ws,
      userId: token ? "authenticated" : undefined,
      connectedAt: new Date(),
      lastPing: new Date(),
    };
    clients.set(clientId, client);

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connected",
      payload: { clientId, serverTime: new Date().toISOString() },
    }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        client.lastPing = new Date();

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
    });

    ws.on("error", () => {
      clients.delete(clientId);
    });
  });

  // ── Express middleware ────────────────────────────────────────
  app.use(express.json());

  // Internal endpoint for backend to push warroom updates via WS
  app.post("/internal/ws/warroom-update", (req, res) => {
    const { type = "warroom_update", payload } = req.body;
    broadcast(type, payload);
    res.json({ ok: true, clients: clients.size });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket endpoint: ws://localhost:${port}/ws/warroom`);
  });
}

startServer().catch(console.error);
