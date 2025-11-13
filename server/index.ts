import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket";
import { runMigrations } from "./migrate";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    console.log(`[STARTUP] NODE_ENV: ${nodeEnv}`);
    console.log(`[STARTUP] PORT: ${process.env.PORT || '5000'}`);
    log(`Starting server in ${nodeEnv} mode...`);
    
  // Add health check endpoint FIRST (before migrations)
// This allows Fly.io to see the app is starting even if migrations fail
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
log(`✓ Health check endpoint ready`);

// Run database migrations with error handling
try {
  await runMigrations();
  log(`Database migrations completed`);
} catch (error: any) {
  log(`WARNING: Migration failed: ${error.message}`);
  console.error('[MIGRATION ERROR]', error);
  // Continue startup even if migrations fail - app can still serve requests
}
    
    // Register all routes
    await registerRoutes(app);
    log(`Routes registered successfully`);

    // Add error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Determine environment and setup appropriate middleware
    const isDevelopment = process.env.NODE_ENV !== "production";
    console.log(`[STARTUP] isDevelopment: ${isDevelopment}`);
    
    // Create HTTP server AFTER determining environment
    const server = createServer(app);
    
    // Setup WebSocket
    setupWebSocket(server);
    log(`✓ WebSocket server configured`);
    
    if (isDevelopment) {
      log(`Setting up Vite for development...`);
      await setupVite(app, server);
      log(`Vite development server configured`);
    } else {
      log(`✓ Production mode detected`);
      console.log(`[STARTUP] Production mode: NODE_ENV=${process.env.NODE_ENV}`);
      console.log(`[STARTUP] Current working directory: ${process.cwd()}`);
      console.log(`[STARTUP] Static files will be served from: ${process.cwd()}/dist/public`);
      
      try {
        serveStatic(app);
        log(`✓ Static files middleware configured successfully`);
        console.log(`[STARTUP] Static file serving is active`);
      } catch (error: any) {
        log(`ERROR: Failed to setup static files: ${error.message}`);
        console.error(`[STARTUP] Static files error:`, error);
        throw error;
      }
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Handle server errors before listening
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`ERROR: Port ${port} is already in use`);
      } else {
        log(`ERROR: Server error: ${error.message}`);
      }
      console.error(error);
      process.exit(1);
    });

    // Start server and wait for it to be ready
    console.log(`[STARTUP] Attempting to bind to ${port} on 0.0.0.0`);
    await new Promise<void>((resolve, reject) => {
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      }, (err?: Error) => {
        if (err) {
          console.error(`[STARTUP] Failed to bind to port ${port}:`, err);
          log(`ERROR: Failed to start server: ${err.message}`);
          reject(err);
          return;
        }
        console.log(`[STARTUP] Successfully bound to port ${port}`);
        log(`✓ Server successfully started on port ${port}`);
        log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        log(`✓ Ready to accept connections`);
        console.log(`[STARTUP] Server is ready and listening`);
        
        // Signal that server is ready (for deployment platforms)
        if (process.send) {
          console.log(`[STARTUP] Sending 'ready' signal to parent process`);
          process.send('ready');
        }
        
        resolve();
      });
    });
    
    console.log(`[STARTUP] Initialization complete, server running`);

  } catch (error: any) {
    log(`FATAL ERROR during server initialization: ${error.message}`);
    console.error('Full error details:', error);
    process.exit(1);
  }
})();
