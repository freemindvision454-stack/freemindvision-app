import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupWebSocket } from "./websocket.js";
import { runMigrations } from "./migrate.js";
import path from "path";
import { fileURLToPath } from "url";

/* ES MODULE FIX */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* RAW BODY FOR STRIPE / WEBHOOKS */
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

  let captured: any;

  res.json = function (body: any) {
    captured = body;
    return originalJson.call(this, body);
  };

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} ${res.statusCode} - ${duration}ms :: ${JSON.stringify(
          captured
        ).slice(0, 200)}`
      );
    }
  });

  next();
});

/* BOOTSTRAP */
(async () => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const PORT = Number(process.env.PORT || 8080);

    console.log("==========================================");
    console.log("== FreeMind Vision Server Starting...    ==");
    console.log(`== MODE: ${isProd ? "PRODUCTION" : "DEVELOPMENT"}         ==`);
    console.log(`== PORT: ${PORT}                             ==`);
    console.log("==========================================\n");

    /* RUN MIGRATIONS */
    await runMigrations();

    /* REGISTER API ROUTES */
    await registerRoutes(app);

    /* GLOBAL ERROR HANDLER */
    app.use(
      (
        err: any,
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        console.error("🔥 API ERROR:", err);
        res.status(err.status || 500).json({
          error: err.message || "Internal server error",
        });
      }
    );

    /* STATIC FILES PRODUCTION */
    if (isProd) {
      const publicPath = path.join(__dirname, "..", "dist");

      console.log(`[SERVER] Static assets: ${publicPath}`);

      app.use(express.static(publicPath));

      app.get("*", (_req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });
    }

    /* CREATE SERVER + WEBSOCKET */
    const server = createServer(app);
    setupWebSocket(server);

    /* START SERVER */
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Running at http://0.0.0.0:${PORT}`);
    });

  } catch (error) {
    console.error("❌ FATAL SERVER ERROR:", error);
    process.exit(1);
  }
})();
