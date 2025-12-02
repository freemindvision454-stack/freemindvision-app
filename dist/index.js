// server/index.ts
import express from "express";
import { createServer } from "http";

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
var onlineUsers = /* @__PURE__ */ new Map();
function setupWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws"
  });
  wss.on("connection", (ws, req) => {
    console.log("[WebSocket] New connection");
    let userId = null;
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth" && data.userId) {
          userId = data.userId;
          if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, /* @__PURE__ */ new Set());
          }
          onlineUsers.get(userId).add(ws);
          console.log(`[WebSocket] User ${userId} authenticated. Total online: ${onlineUsers.size}`);
          broadcastUserStatus(userId, "online");
          ws.send(JSON.stringify({
            type: "auth_success",
            userId,
            onlineUsers: Array.from(onlineUsers.keys())
          }));
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    });
    ws.on("close", () => {
      if (userId) {
        const disconnectUserId = userId;
        const userSockets = onlineUsers.get(disconnectUserId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            onlineUsers.delete(disconnectUserId);
            console.log(`[WebSocket] User ${disconnectUserId} disconnected. Total online: ${onlineUsers.size}`);
            broadcastUserStatus(disconnectUserId, "offline");
          }
        }
      }
    });
    ws.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });
  });
  function broadcastUserStatus(userId, status) {
    const message = JSON.stringify({
      type: "user_status",
      userId,
      status
    });
    onlineUsers.forEach((sockets, connectedUserId) => {
      if (connectedUserId !== userId) {
        sockets.forEach((socket) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
          }
        });
      }
    });
  }
  return wss;
}

// server/migrate.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
async function runMigrations(options) {
  let migrationClient = null;
  let lockAcquired = false;
  try {
    const autoRunEnabled = options?.skipEnvCheck || process.env.MIGRATIONS_AUTO_RUN === "true";
    if (!autoRunEnabled) {
      console.log("[MIGRATION] \u23ED\uFE0F  MIGRATIONS_AUTO_RUN non activ\xE9 - migration ignor\xE9e");
      console.log("[MIGRATION] \u{1F4A1} Pour activer : MIGRATIONS_AUTO_RUN=true");
      return;
    }
    console.log("[MIGRATION] \u{1F527} D\xE9marrage de la migration automatique s\xE9curis\xE9e...");
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not configured");
    }
    const rawUrl = process.env.DATABASE_URL;
    const isLocalhost = rawUrl.includes("localhost");
    let migrationConnectionString = rawUrl;
    if (!isLocalhost) {
      migrationConnectionString = migrationConnectionString.replace(/[?&]sslmode=[^&]*/g, "");
      const separator = migrationConnectionString.includes("?") ? "&" : "?";
      migrationConnectionString = `${migrationConnectionString}${separator}sslmode=require`;
      console.log("[MIGRATION] \u{1F512} SSL/TLS enabled for cloud migrations");
    }
    migrationClient = postgres(migrationConnectionString, {
      max: 1,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });
    console.log("[MIGRATION] \u{1F512} Acquisition du verrou de migration...");
    const lockResult = await migrationClient`SELECT pg_try_advisory_lock(123456789) as acquired`;
    lockAcquired = lockResult[0]?.acquired || false;
    if (!lockAcquired) {
      console.log("[MIGRATION] \u23F3 Une autre instance ex\xE9cute d\xE9j\xE0 les migrations - en attente...");
      let attempts = 0;
      while (!lockAcquired && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const retryResult = await migrationClient`SELECT pg_try_advisory_lock(123456789) as acquired`;
        lockAcquired = retryResult[0]?.acquired || false;
        attempts++;
      }
      if (!lockAcquired) {
        throw new Error("Timeout attendant l'acquisition du verrou de migration");
      }
    }
    console.log("[MIGRATION] \u2705 Verrou acquis");
    console.log("[MIGRATION] \u{1F4CA} Ex\xE9cution des migrations...");
    const migrationDb = drizzle(migrationClient);
    await migrate(migrationDb, { migrationsFolder: "./migrations" });
    console.log("[MIGRATION] \u2705 Toutes les migrations ont \xE9t\xE9 appliqu\xE9es avec succ\xE8s !");
    const tableCount = await migrationClient`
      SELECT count(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != '__drizzle_migrations'
    `;
    console.log(`[MIGRATION] \u{1F4C8} ${tableCount[0]?.count || 0} tables applicatives d\xE9tect\xE9es`);
  } catch (error) {
    console.error("[MIGRATION] \u274C ERREUR CRITIQUE lors de la migration !");
    console.error("[MIGRATION] Message:", error.message);
    if (error.stack) {
      console.error("[MIGRATION] Stack:", error.stack);
    }
    throw new Error(
      `Migration failed: ${error.message}. L'application ne peut pas d\xE9marrer sans un sch\xE9ma de base de donn\xE9es valide.`
    );
  } finally {
    if (migrationClient) {
      if (lockAcquired) {
        try {
          await migrationClient`SELECT pg_advisory_unlock(123456789)`;
          console.log("[MIGRATION] \u{1F513} Verrou lib\xE9r\xE9");
        } catch (unlockError) {
          console.error("[MIGRATION] \u26A0\uFE0F Erreur lors de la lib\xE9ration du verrou:", unlockError);
        }
      }
      await migrationClient.end();
      console.log("[MIGRATION] \u{1F50C} Connexion de migration ferm\xE9e");
    }
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("[MIGRATION] \u{1F680} Running migrations in standalone mode (release_command)");
  runMigrations({ skipEnvCheck: true }).then(() => {
    console.log("[MIGRATION] \u2705 Migration process completed successfully");
    process.exit(0);
  }).catch((error) => {
    console.error("[MIGRATION] \u274C Migration process failed:", error);
    process.exit(1);
  });
}

// server/index.ts
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;
  let captured = void 0;
  res.json = function(body) {
    captured = body;
    return originalJson.apply(this, [body]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(
        `${req.method} ${req.path} ${res.statusCode} in ${duration}ms :: ${JSON.stringify(
          captured
        ).slice(0, 200)}`
      );
    }
  });
  next();
});
(async () => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const PORT = parseInt(process.env.PORT || "8080", 10);
    console.log(`
[SERVER] Starting...`);
    console.log(`[SERVER] Mode: ${isProd ? "PRODUCTION" : "DEV"}`);
    console.log(`[SERVER] Port: ${PORT}`);
    await runMigrations();
    await (void 0)(app);
    app.use((err, _req, res, _next) => {
      console.error("API Error:", err);
      res.status(err.status || 500).json({
        error: err.message || "Internal server error"
      });
    });
    if (isProd) {
      const publicPath = path.join(__dirname, "..", "dist");
      console.log(`[SERVER] Serving static files from: ${publicPath}`);
      app.use(express.static(publicPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });
    }
    const server = createServer(app);
    setupWebSocket(server);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("\n[FATAL] Server failed to start:", error);
    process.exit(1);
  }
})();
