// Replit Auth implementation - simplified version without openid-client
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage.js";

export function isReplitAuthEnabled(): boolean {
  return !!(process.env.REPL_ID && process.env.SESSION_SECRET && process.env.DATABASE_URL);
}

// Simple memory store for development
class MemoryStore extends session.MemoryStore {
  constructor() {
    super();
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory store in development, pg store in production if available
  let sessionStore;
  
  try {
    // Try to use PostgreSQL store if available
    const connectPg = require("connect-pg-simple");
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    console.log("✅ Using PostgreSQL session store");
  } catch (error) {
    // Fallback to memory store
    console.log("⚠️  PostgreSQL session store not available, using memory store");
    sessionStore = new MemoryStore();
  }

  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(user: any, tokens: any) {
  user.claims = tokens.claims || { sub: user.id, email: user.email };
  user.access_token = tokens.access_token || "dev-token";
  user.refresh_token = tokens.refresh_token || "dev-refresh-token";
  user.expires_at = user.claims?.exp || (Date.now() / 1000) + 3600;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"] || `dev-user-${Date.now()}`,
    email: claims["email"] || "dev@example.com",
    firstName: claims["first_name"] || "Dev",
    lastName: claims["last_name"] || "User",
    profileImageUrl: claims["profile_image_url"] || null,
  });
}

// Simple memoize function replacement
function memoize(fn: Function, options: any) {
  const cache = new Map();
  const maxAge = options.maxAge || 3600000;
  
  return async function(...args: any[]) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.value;
    }
    
    const value = await fn(...args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  };
}

const getOidcConfig = memoize(
  async () => {
    if (!isReplitAuthEnabled()) {
      throw new Error("Replit Auth is not enabled - missing required environment variables");
    }
    
    // Simplified OIDC config for development
    return {
      issuer: process.env.ISSUER_URL || "https://replit.com/oidc",
      client_id: process.env.REPL_ID,
      authorization_endpoint: `${process.env.ISSUER_URL || "https://replit.com/oidc"}/authorize`,
      token_endpoint: `${process.env.ISSUER_URL || "https://replit.com/oidc"}/token`,
      userinfo_endpoint: `${process.env.ISSUER_URL || "https://replit.com/oidc"}/userinfo`,
    };
  },
  { maxAge: 3600 * 1000 }
);

export async function setupAuth(app: Express) {
  const hasDatabase = !!(process.env.SESSION_SECRET && process.env.DATABASE_URL);
  const hasReplitAuth = isReplitAuthEnabled();

  if (!hasDatabase) {
    console.log("[AUTH] No session config - missing SESSION_SECRET or DATABASE_URL");
    console.log("[AUTH] Running in guest mode without authentication");
    
    // Provide stub endpoints that return appropriate responses
    app.get("/api/login", (_req, res) => {
      res.status(503).json({ 
        message: "Authentication is not available on this deployment",
        guestMode: true 
      });
    });
    
    app.get("/api/callback", (_req, res) => {
      res.status(503).json({ 
        message: "Authentication is not available on this deployment",
        guestMode: true 
      });
    });
    
    app.get("/api/logout", (_req, res) => {
      res.redirect("/");
    });
    
    return;
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // CRITICAL: Always configure serialize/deserialize for local auth to work
  // This is required for req.login() to function properly
  passport.serializeUser((user: Express.User, cb) => {
    console.log("💾 Serializing user:", (user as any)?.email);
    cb(null, user);
  });
  
  passport.deserializeUser(async (user: Express.User, cb) => {
    try {
      console.log("🔄 Deserializing user:", (user as any)?.email);
      
      // Refresh user data from database
      if (user && (user as any).id) {
        const freshUser = await storage.getUser((user as any).id);
        if (freshUser) {
          // Merge fresh data with session data
          const mergedUser = { ...user, ...freshUser };
          cb(null, mergedUser);
          return;
        }
      }
      
      cb(null, user);
    } catch (error) {
      console.error("❌ Error deserializing user:", error);
      cb(error, null);
    }
  });

  if (!hasReplitAuth) {
    console.log("[AUTH] Replit Auth disabled - REPL_ID not found");
    console.log("[AUTH] Using local authentication only (email/password)");
    console.log("[AUTH] Passport serialize/deserialize configured for local auth");
    return;
  }

  try {
    const config = await getOidcConfig();

    const verify = async (tokens: any, verified: any) => {
      try {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      } catch (error) {
        console.error("❌ Error in OIDC verify:", error);
        verified(error, null);
      }
    };

    // Keep track of registered strategies
    const registeredStrategies = new Set<string>();

    // Helper function to ensure strategy exists for a domain
    const ensureStrategy = (domain: string) => {
      const strategyName = `replitauth:${domain}`;
      if (!registeredStrategies.has(strategyName)) {
        try {
          // Dynamic import of openid-client only when needed
          const { Strategy } = require("openid-client/passport");
          const strategy = new Strategy(
            {
              name: strategyName,
              config,
              scope: "openid email profile offline_access",
              callbackURL: `https://${domain}/api/callback`,
            },
            verify,
          );
          passport.use(strategy);
          registeredStrategies.add(strategyName);
          console.log(`✅ Registered OIDC strategy for domain: ${domain}`);
        } catch (error) {
          console.error("❌ Failed to register OIDC strategy:", error);
          throw error;
        }
      }
    };

    app.get("/api/login", (req, res, next) => {
      try {
        ensureStrategy(req.hostname);
        passport.authenticate(`replitauth:${req.hostname}`, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      } catch (error) {
        console.error("❌ Login route error:", error);
        res.status(500).json({ message: "Authentication service unavailable" });
      }
    });

    app.get("/api/callback", (req, res, next) => {
      try {
        ensureStrategy(req.hostname);
        passport.authenticate(`replitauth:${req.hostname}`, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/api/login",
        })(req, res, next);
      } catch (error) {
        console.error("❌ Callback route error:", error);
        res.status(500).json({ message: "Authentication callback failed" });
      }
    });

    app.get("/api/logout", (req, res) => {
      req.logout((err) => {
        if (err) {
          console.error("❌ Logout error:", err);
        }
        res.redirect("/");
      });
    });

    console.log("✅ Replit OIDC authentication configured");
  } catch (error) {
    console.error("❌ Failed to setup Replit OIDC auth:", error);
    console.log("🔑 Falling back to local authentication only");
  }
}

// Middleware for routes that only need to check IF user is authenticated
// but can work without (like /api/auth/user)
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In development mode, allow access without auth for testing
  if (process.env.NODE_ENV === 'development') {
    // Create a mock user for development
    if (!req.user) {
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        firstName: 'Development',
        lastName: 'User',
        isAdmin: false,
        isCreator: false,
        claims: { sub: 'dev-user-id' }
      };
    }
    return next();
  }

  if (!isReplitAuthEnabled()) {
    // In guest mode without Replit auth, allow access
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check token expiration for Replit auth
  if (user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: "Session expired" });
      }

      try {
        const config = await getOidcConfig();
        // Simplified token refresh - in real implementation, use openid-client
        console.log("🔄 Refreshing token...");
        // For now, just update the expiration
        user.expires_at = now + 3600;
        return next();
      } catch (error) {
        console.error("❌ Token refresh failed:", error);
        return res.status(401).json({ message: "Session refresh failed" });
      }
    }
  }

  return next();
};

// Middleware for routes that REQUIRE authentication - blocks guest access
export const requiresAuth: RequestHandler = async (req, res, next) => {
  // In development, allow with mock user
  if (process.env.NODE_ENV === 'development') {
    if (!req.user) {
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        firstName: 'Development',
        lastName: 'User',
        isAdmin: false,
        isCreator: false,
        claims: { sub: 'dev-user-id' }
      };
    }
    return next();
  }

  if (!isReplitAuthEnabled()) {
    return res.status(401).json({ 
      message: "Authentication is required for this action. Please deploy on Replit for full functionality.",
      authRequired: true,
      guestMode: true
    });
  }

  // Use the same logic as isAuthenticated for actual auth check
  const user = req.user as any;
  
  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  return next();
};
