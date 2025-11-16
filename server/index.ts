import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupWebSocket } from "./websocket";
import { runMigrations } from "./migrate";
import path from "path";
import { fileURLToPath } from "url";

// Fix ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* RAW BODY */
declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

/* LOGGER */
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;

  let captured: any = undefined;

  res.json = function (body) {
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

/* STARTUP */
(async () => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const PORT = parseInt(process.env.PORT || "8080", 10);

    console.log(`\n[SERVER] Starting...`);
    console.log(`[SERVER] Mode: ${isProd ? "PRODUCTION" : "DEV"}`);
    console.log(`[SERVER] Port: ${PORT}`);

    /* ROUTES */
    await registerRoutes(app);

    /* ERROR HANDLER */
    app.use(
      (err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error("API Error:", err);
        res.status(err.status || 500).json({
          error: err.message || "Internal server error",
        });
      }
    );

    /* STATIC FILES - FIX DIGITALOCEAN */
    if (isProd) {
      const publicPath = path.join(process.cwd(), "dist");

      console.log(`[SERVER] Serving static from: ${publicPath}`);

      // Serve frontend
      app.use(express.static(publicPath));

      // SPA fallback
      app.get("*", (_req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });
    }

    /* START SERVER */
    const server = createServer(app);

    setupWebSocket(server);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Running at http://0.0.0.0:${PORT}`);
    });

  } catch (error) {
    console.error("\n[FATAL] Server failed to start:", error);
    process.exit(1);
  }
})();