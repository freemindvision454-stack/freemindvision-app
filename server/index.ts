import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupWebSocket } from "./websocket";
import { runMigrations } from "./migrate";
import path from "path";

const app = express();

/* ----------------------------
   RAW BODY HANDLING
----------------------------- */
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

/* ----------------------------
   SIMPLE LOGGER
----------------------------- */
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

/* ----------------------------
   MAIN ASYNC STARTUP
----------------------------- */
(async () => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const PORT = parseInt(process.env.PORT || "5000", 10);

    console.log(`\n[SERVER] Starting...`);
    console.log(`[SERVER] Mode: ${isProd ? "PRODUCTION" : "DEV"}`);
    console.log(`[SERVER] Port: ${PORT}`);

    /*  HEALTH CHECK  */
    app.get("/health", (_req, res) => {
      res.status(200).json({
        ok: true,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    });

    /*  ROUTES  */
    await registerRoutes(app);

    /*  ERROR HANDLER  */
    app.use(
      (err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error("API Error:", err);
        res.status(err.status || 500).json({
          error: err.message || "Internal server error",
        });
      }
    );

    /* ----------------------------
       PRODUCTION: SERVE STATIC FILES
    ----------------------------- */
    if (isProd) {
      const publicPath = path.join(process.cwd(), "server", "public");
      console.log(`[SERVER] Serving static files from: ${publicPath}`);

      app.use(express.static(publicPath));

      app.get("*", (_req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });
    }

    /* ----------------------------
       START HTTP SERVER
    ----------------------------- */
    const server = createServer(app);

    /* WEBSOCKETS */
    setupWebSocket(server);

    /* ----------------------------
       START LISTENING
    ----------------------------- */
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n[SERVER] Running at http://0.0.0.0:${PORT}`);
    });

  } catch (error) {
    console.error("\n[FATAL] Server failed to start:", error);
    process.exit(1);
  }
})();
