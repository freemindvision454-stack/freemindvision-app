
import adminRoutes from "./admin.js";
import type { Express, Request, Response } from "express";
import express from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requiresAuth, isReplitAuthEnabled } from "./auth";
import { setupLocalStrategy } from "./auth/localStrategy";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import Stripe from "stripe";
import { db } from "./db";
import { users, referrals, userSubscriptions } from "./shared/schema";
import { eq } from "drizzle-orm";
import { getOnlineUsers, isUserOnline } from "./websocket";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { registerSchema, loginSchema, type SessionUser } from "./shared/authSchema";
import { initializeCloudinary, cloudinaryUploadStream } from "./cloudinary";
// ======================================================
// TON FICHIER CONTINUE NORMAL… (je laisse tout comme il est)
// ======================================================
import { sendSupportEmail } from "./lib/email";
// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  },
});

// … (TOUT LE RESTE DE TON FICHIER RESTE IDENTIQUE)

// ======================================================
// À LA FIN DES ROUTES, AJOUTE CECI :
// ======================================================

// 🔥 ADMIN PANEL ROUTES — AJOUTÉ
app.use("/admin", adminRoutes);

export default app;import type { Express, Request, Response } from "express";
import express from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requiresAuth, isReplitAuthEnabled } from "./replitAuth";
import { setupLocalStrategy } from "./auth/localStrategy";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import Stripe from "stripe";
import { db } from "./db";
import { users, referrals, userSubscriptions } from "../shared/schema";
import { eq } from "drizzle-orm";
import { getOnlineUsers, isUserOnline } from "./websocket";
import passport from "passport";
import { rateLimit } from "express-rate-limit";
import { registerSchema, loginSchema, type SessionUser } from "@shared/authSchemas";
import { initializeCloudinary, cloudinaryUploadStream } from "./cloudinary";

// Configure multer for file uploads (use memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Accept videos and images only
    const allowedMimes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Configure multer for message media uploads
const messageMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploaded_messages");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadMessageMedia = multer({
  storage: messageMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for messages
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/webm",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid media type for messages"));
    }
  },
});

// Initialize Stripe (only if keys are provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20" as any, // TypeScript types may not include all API versions
  });
}

export async function registerRoutes(app: Express): Promise<Express> {
  // Initialize Cloudinary
  const cloudinaryEnabled = initializeCloudinary();

  // Health check endpoint (must be first, no auth required)
  app.get("/health", (_req: Request, res: Response) => {
    console.log(`[HEALTH] Health check requested`);
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      port: process.env.PORT || '5000'
    });
  });

  // Root health check
  app.get("/api/health", (_req: Request, res: Response) => {
    console.log(`[HEALTH] API health check requested`);
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  });

  // Auth configuration endpoint (before auth middleware setup)
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    res.json({
      replitAuthEnabled: isReplitAuthEnabled(),
    });
  });

  // Auth middleware
  await setupAuth(app);
  
  // Setup local strategy for email/password authentication
  setupLocalStrategy();

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: { message: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ===== LOCAL AUTH ROUTES =====
  
  // Register new user with email/password
  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
    try {
      // Validate input
      const result = registerSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          message: "Données invalides",
          errors: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      const { email, password, firstName, lastName, phoneNumber, dateOfBirth, country, city, gender } = result.data;
      
      // Check if email already exists
      const existingUser = await storage.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Cet email est déjà utilisé" });
      }
      
      // Create user with hashed password
      const user = await storage.createUserWithPassword({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
        country,
        city,
        gender,
      });
      
      // Auto-login after registration
      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        bio: user.bio,
        isCreator: user.isCreator,
        creditBalance: user.creditBalance.toString(),
        totalEarnings: user.totalEarnings.toString(),
        currency: user.currency,
        referralCode: user.referralCode,
        authProvider: "local",
      };
      
      // Login user via Passport
      req.login(sessionUser, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ message: "Inscription réussie mais échec de connexion automatique" });
        }
        
        res.status(201).json({ user: sessionUser });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });
  
  // Login with email/password
  app.post("/api/auth/login", authLimiter, (req: Request, res: Response, next) => {
    // Validate input
    const result = loginSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        message: "Données invalides",
        errors: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    // Authenticate with Passport local strategy
    passport.authenticate("local", (err: any, user: SessionUser | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Erreur lors de la connexion" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Email ou mot de passe incorrect" });
      }
      
      // Login user
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session error:", loginErr);
          return res.status(500).json({ message: "Erreur de session" });
        }
        
        res.json({ user });
      });
    })(req, res, next);
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      
      res.json({ message: "Déconnexion réussie" });
    });
  });
  
  // Get current session (works for both Replit Auth and local auth)
  app.get("/api/auth/session", (req: Request, res: Response) => {
    if (req.user) {
      res.json({ user: req.user });
    } else {
      res.json({ user: null });
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
  app.use("/uploads", express.static("./uploaded_videos"));
  
  // Serve uploaded message media
  app.use("/message-media", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
  app.use("/message-media", express.static("./uploaded_messages"));

  // ===== AUTH ROUTES =====
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // In guest mode (no auth), req.user will be undefined
      if (!req.user || !req.user.claims) {
        return res.json(null);
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ===== VIDEO ROUTES =====

  // Get all videos with creator info
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getVideos(50);

      // Enrich with creator data
      const enrichedVideos = await Promise.all(
        videos.map(async (video) => {
          const creator = await storage.getUser(video.creatorId);
          return {
            ...video,
            creator,
          };
        })
      );

      res.json(enrichedVideos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Upload video
  app.post(
    "/api/videos",
    requiresAuth,
    upload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files.video || files.video.length === 0) {
          return res.status(400).json({ message: "Video file is required" });
        }

        const videoFile = files.video[0];
        const thumbnailFile = files.thumbnail?.[0];

        let videoUrl: string;
        let thumbnailUrl: string | null = null;

        if (cloudinaryEnabled) {
          // Upload to Cloudinary
          console.log('[VIDEO-UPLOAD] Uploading video to Cloudinary...');
          const videoUpload: any = await cloudinaryUploadStream(videoFile.buffer, {
            resource_type: 'video',
            folder: 'freemind-videos',
          });
          videoUrl = videoUpload.secure_url;
          console.log(`[VIDEO-UPLOAD] ✅ Video uploaded to Cloudinary: ${videoUrl}`);

          // Upload thumbnail if provided
          if (thumbnailFile) {
            console.log('[VIDEO-UPLOAD] Uploading thumbnail to Cloudinary...');
            const thumbnailUpload: any = await cloudinaryUploadStream(thumbnailFile.buffer, {
              resource_type: 'image',
              folder: 'freemind-thumbnails',
            });
            thumbnailUrl = thumbnailUpload.secure_url;
            console.log(`[VIDEO-UPLOAD] ✅ Thumbnail uploaded to Cloudinary: ${thumbnailUrl}`);
          }
        } else {
          // Fallback to local storage (not recommended for production)
          console.warn('[VIDEO-UPLOAD] ⚠️  Cloudinary not configured, using local storage (temporary)');
          const videoPath = path.join('./uploaded_videos', `${randomUUID()}.mp4`);
          fs.writeFileSync(videoPath, videoFile.buffer);
          videoUrl = `/uploads/${path.basename(videoPath)}`;
          
          if (thumbnailFile) {
            const thumbPath = path.join('./uploaded_videos', `${randomUUID()}.jpg`);
            fs.writeFileSync(thumbPath, thumbnailFile.buffer);
            thumbnailUrl = `/uploads/${path.basename(thumbPath)}`;
          }
        }

        const video = await storage.createVideo({
          creatorId: userId,
          title: req.body.title,
          description: req.body.description || null,
          videoUrl,
          thumbnailUrl,
          duration: null, // Could be extracted from video metadata
        });

        // Mark user as creator if not already
        const user = await storage.getUser(userId);
        if (user && !user.isCreator) {
          await storage.upsertUser({
            ...user,
            isCreator: true,
          });
        }

        // Check and award badges (async, don't wait)
        storage.checkAndAwardBadges(userId).catch(err => 
          console.error("Error checking badges after video upload:", err)
        );

        res.json(video);
      } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ message: "Failed to upload video" });
      }
    }
  );

  // Search videos
  app.get("/api/videos/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const searchTerm = query.trim().toLowerCase();
      const allVideos = await storage.getVideos(500); // Get more videos for searching

      // Search in title, description, and creator name
      const matchingVideos = await Promise.all(
        allVideos.map(async (video) => {
          const creator = await storage.getUser(video.creatorId);
          const creatorName = creator?.firstName && creator?.lastName
            ? `${creator.firstName} ${creator.lastName}`.toLowerCase()
            : creator?.email?.split("@")[0]?.toLowerCase() || "";
          
          const titleMatch = video.title.toLowerCase().includes(searchTerm);
          const descMatch = video.description?.toLowerCase().includes(searchTerm) || false;
          const creatorMatch = creatorName.includes(searchTerm);

          if (titleMatch || descMatch || creatorMatch) {
            return {
              ...video,
              creator,
            };
          }
          return null;
        })
      );

      // Filter out null results and limit to 50
      const results = matchingVideos.filter(v => v !== null).slice(0, 50);
      res.json(results);
    } catch (error) {
      console.error("Error searching videos:", error);
      res.status(500).json({ message: "Failed to search videos" });
    }
  });

  // Increment video views
  app.post("/api/videos/:videoId/view", async (req, res) => {
    try {
      await storage.incrementVideoViews(req.params.videoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing views:", error);
      res.status(500).json({ message: "Failed to increment views" });
    }
  });

  // ===== LIKE ROUTES =====

  // Like a video
  app.post("/api/videos/:videoId/like", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const like = await storage.likeVideo(userId, req.params.videoId);
      
      // Create notification for video creator
      const video = await storage.getVideo(req.params.videoId);
      if (video && video.creatorId !== userId) {
        const actor = await storage.getUser(userId);
        const actorName = actor?.firstName && actor?.lastName 
          ? `${actor.firstName} ${actor.lastName}`
          : actor?.email?.split("@")[0] || "Someone";
        
        await storage.createNotification({
          userId: video.creatorId,
          type: "like",
          actorId: userId,
          videoId: video.id,
          message: `${actorName} a aimé votre vidéo "${video.title}"`,
        });
      }
      
      res.json(like);
    } catch (error) {
      console.error("Error liking video:", error);
      res.status(500).json({ message: "Failed to like video" });
    }
  });

  // Unlike a video
  app.delete("/api/videos/:videoId/like", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.unlikeVideo(userId, req.params.videoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unliking video:", error);
      res.status(500).json({ message: "Failed to unlike video" });
    }
  });

  // ===== FAVORITE ROUTES (TikTok-style bookmarks) =====

  // Favorite a video (bookmark/save)
  app.post("/api/videos/:videoId/favorite", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const video = await storage.getVideo(req.params.videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Check if already favorited to avoid duplicate notifications
      const alreadyFavorited = await storage.isVideoFavorited(userId, req.params.videoId);
      
      const favorite = await storage.favoriteVideo(userId, req.params.videoId);
      
      // Create notification only for NEW favorites (skip if self-favorite or already favorited)
      if (!alreadyFavorited && video.creatorId !== userId) {
        const actor = await storage.getUser(userId);
        const actorName = actor?.firstName && actor?.lastName 
          ? `${actor.firstName} ${actor.lastName}`
          : actor?.email?.split("@")[0] || "Someone";
        
        await storage.createNotification({
          userId: video.creatorId,
          type: "favorite",
          actorId: userId,
          videoId: video.id,
          message: `${actorName} a ajouté votre vidéo "${video.title}" aux favoris`,
        });
      }
      
      res.json({ favorited: true, favorite });
    } catch (error) {
      console.error("Error favoriting video:", error);
      res.status(500).json({ message: "Failed to favorite video" });
    }
  });

  // Unfavorite a video
  app.delete("/api/videos/:videoId/favorite", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.unfavoriteVideo(userId, req.params.videoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfavoriting video:", error);
      res.status(500).json({ message: "Failed to unfavorite video" });
    }
  });

  // Check if video is favorited by current user
  app.get("/api/videos/:videoId/favorite/status", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorited = await storage.isVideoFavorited(userId, req.params.videoId);
      res.json({ favorited });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // ===== VIDEO SHARE ROUTES (tracking) =====

  // Track video share event
  app.post("/api/videos/:videoId/share", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const video = await storage.getVideo(req.params.videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const shareMethod = req.body.method || "direct"; // 'copy_link', 'native_share', 'twitter', etc.
      const share = await storage.shareVideo(userId, req.params.videoId, shareMethod);
      const shareCount = await storage.getShareCount(req.params.videoId);
      
      // No notification for shares (too frequent)
      
      res.json({ success: true, shareCount, share });
    } catch (error) {
      console.error("Error tracking video share:", error);
      res.status(500).json({ message: "Failed to track video share" });
    }
  });

  // ===== NOTIFICATION ROUTES =====

  // Get notifications for current user
  app.get("/api/notifications", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId, 50);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/unread/count", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error counting unread notifications:", error);
      res.status(500).json({ message: "Failed to count unread notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:notificationId/read", requiresAuth, async (req: any, res) => {
    try {
      await storage.markNotificationAsRead(req.params.notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // ===== FOLLOW ROUTES =====

  // Follow a user
  app.post("/api/users/:userId/follow", requiresAuth, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const followingId = req.params.userId;

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      await storage.followUser(followerId, followingId);
      
      // Create notification for followed user
      const actor = await storage.getUser(followerId);
      const actorName = actor?.firstName && actor?.lastName 
        ? `${actor.firstName} ${actor.lastName}`
        : actor?.email?.split("@")[0] || "Someone";
      
      await storage.createNotification({
        userId: followingId,
        type: "follow",
        actorId: followerId,
        message: `${actorName} a commencé à vous suivre`,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  // Unfollow a user
  app.delete("/api/users/:userId/follow", requiresAuth, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const followingId = req.params.userId;

      await storage.unfollowUser(followerId, followingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Check if following
  app.get("/api/users/:userId/is-following", requiresAuth, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const followingId = req.params.userId;

      const isFollowing = await storage.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  // Get follower/following counts
  app.get("/api/users/:userId/follow-stats", async (req, res) => {
    try {
      const userId = req.params.userId;

      const [followerCount, followingCount] = await Promise.all([
        storage.getFollowerCount(userId),
        storage.getFollowingCount(userId),
      ]);

      res.json({ followerCount, followingCount });
    } catch (error) {
      console.error("Error getting follow stats:", error);
      res.status(500).json({ message: "Failed to get follow stats" });
    }
  });

  // Get following feed (videos from followed creators)
  app.get("/api/videos/following", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videos = await storage.getFollowingVideos(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error getting following videos:", error);
      res.status(500).json({ message: "Failed to get following videos" });
    }
  });

  // ===== COMMENT ROUTES =====

  // Create comment
  app.post("/api/comments", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const comment = await storage.createComment({
        videoId: req.body.videoId,
        userId,
        content: req.body.content,
      });
      
      // Create notification for video creator
      const video = await storage.getVideo(req.body.videoId);
      if (video && video.creatorId !== userId) {
        const actor = await storage.getUser(userId);
        const actorName = actor?.firstName && actor?.lastName 
          ? `${actor.firstName} ${actor.lastName}`
          : actor?.email?.split("@")[0] || "Someone";
        
        await storage.createNotification({
          userId: video.creatorId,
          type: "comment",
          actorId: userId,
          videoId: video.id,
          commentId: comment.id,
          message: `${actorName} a commenté votre vidéo "${video.title}"`,
        });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Get comments for a video
  app.get("/api/comments/:videoId", async (req, res) => {
    try {
      const comments = await storage.getCommentsByVideo(req.params.videoId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // ===== MESSAGE ROUTES =====

  // Send a message
  app.post("/api/messages", requiresAuth, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const message = await storage.sendMessage({
        senderId,
        recipientId: req.body.recipientId,
        content: req.body.content,
      });
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Upload media and send message
  app.post("/api/messages/media", requiresAuth, uploadMessageMedia.single("media"), async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const { recipientId, content, messageType } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No media file uploaded" });
      }

      const mediaUrl = `/message-media/${req.file.filename}`;
      
      // Determine message type from mime type if not provided
      let finalMessageType = messageType;
      if (!finalMessageType) {
        if (req.file.mimetype.startsWith('image/')) {
          finalMessageType = 'image';
        } else if (req.file.mimetype.startsWith('video/')) {
          finalMessageType = 'video';
        } else if (req.file.mimetype.startsWith('audio/')) {
          finalMessageType = 'audio';
        }
      }

      const message = await storage.sendMessage({
        senderId,
        recipientId,
        content: content || null,
        messageType: finalMessageType,
        mediaUrl,
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending media message:", error);
      res.status(500).json({ message: "Failed to send media message" });
    }
  });

  // Get conversations
  app.get("/api/messages/conversations", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages with a specific user
  app.get("/api/messages/:otherUserId", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const otherUserId = req.params.otherUserId;
      const messages = await storage.getMessages(userId, otherUserId, 50);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Mark messages as read
  app.patch("/api/messages/:senderId/read", requiresAuth, async (req: any, res) => {
    try {
      const recipientId = req.user.claims.sub;
      const senderId = req.params.senderId;
      await storage.markMessagesAsRead(recipientId, senderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Get unread messages count
  app.get("/api/messages/unread/count", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error counting unread messages:", error);
      res.status(500).json({ message: "Failed to count unread messages" });
    }
  });

  // Get online users
  app.get("/api/users/online", requiresAuth, async (req: any, res) => {
    try {
      const onlineUserIds = getOnlineUsers();
      res.json({ onlineUsers: onlineUserIds });
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });

  // Check if specific user is online
  app.get("/api/users/:userId/online", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const online = isUserOnline(userId);
      res.json({ userId, online });
    } catch (error) {
      console.error("Error checking user status:", error);
      res.status(500).json({ message: "Failed to check user status" });
    }
  });

  // ===== GIFT ROUTES =====

  // Get gift types
  app.get("/api/gift-types", async (req, res) => {
    try {
      const giftTypes = await storage.getGiftTypes();
      res.json(giftTypes);
    } catch (error) {
      console.error("Error fetching gift types:", error);
      res.status(500).json({ message: "Failed to fetch gift types" });
    }
  });

  // Send a gift
  app.post("/api/gifts/send", requiresAuth, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const { giftTypeId, recipientId, videoId, quantity } = req.body;

      // Get gift type to calculate cost
      const giftTypes = await storage.getGiftTypes();
      const giftType = giftTypes.find((gt) => gt.id === giftTypeId);

      if (!giftType) {
        return res.status(404).json({ message: "Gift type not found" });
}

const totalCost = giftType.creditCost * quantity;

// Check sender balance
const sender = await storage.getUser(senderId);
if (!sender || sender.creditBalance < totalCost) {
  return res.status(400).json({ message: "Insufficient credits" });
}
// Deduct credits from sender
await storage.updateUserCredits(senderId, -totalCost);

// Send the gift (this also updates recipient earnings)
const gift = await storage.sendGift({
  giftTypeId,
  senderId,
  recipientId,
  videoId: videoId || null,
  quantity,
});

res.json(gift);

} catch (error) {
  console.error("Error sending gift:", error);
  res.status(500).json({ message: "Failed to send gift" });
}
}); // ← ROUTE SEND-GIFT FERMÉE CORRECTEMENT
// --- SEND GIFT ROUTE (fin de la route send-gift) ---
// (Ce bloc assume que la route avait été ouverte plus haut et que nous sommes
//  dans la partie finale qui déduit le crédit et envoie le cadeau.)

// Deduct credits from sender
await storage.updateUserCredits(senderId, -totalCost);

// Send the gift (this also updates recipient earnings)
const gift = await storage.sendGift({
  giftTypeId,
  senderId,
  recipientId,
  videoId: videoId || null,
  quantity,
});

res.json(gift);

} catch (error) {
  console.error("Error sending gift:", error);
  res.status(500).json({ message: "Failed to send gift" });
}
}); // ← FERME LA ROUTE SEND-GIFT CORRECTEMENT


// ===== CREDIT ROUTES =====

// Get credit packages
app.get("/api/credit-packages", async (req, res) => {
  try {
    const packages = await storage.getCreditPackages();
    res.json(packages);
  } catch (error) {
    console.error("Error fetching credit packages:", error);
    res.status(500).json({ message: "Failed to fetch credit packages" });
  }
});


// ----- BUY PACKAGE ROUTE -----
// (Je remets ici la logique que tu avais : récupérer package, user, créer customer si besoin,
//  et créer un paymentIntent ; si tu as déjà un endpoint similaire, adapte le chemin / nom.)

app.post("/api/buy-package", async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    const packages = await storage.getCreditPackages();
    const pkg = packages.find((p) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(pkg.priceUsd) * 100), // cents
      currency: "usd",
      customer: customerId,
      metadata: {
        userId,
        packageId: pkg.id,
        credits: pkg.credits + (pkg.bonus || 0),
        packageName: pkg.name,
      },
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({ message: "Failed to create payment intent" });
  }
});


// ===========================
// ==== STRIPE WEBHOOK =======
// ===========================

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Verify signature if webhook secret set (production)
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig as string,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Development: parse without verification (NOT for production)
        const payload = req.body.toString();
        event = JSON.parse(payload);
        console.warn("⚠️  Webhook signature verification skipped (development mode)");
      }

      // Handle events
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as any;
        // Mark transaction completed in your storage
        try {
          await storage.updateTransactionStatus(paymentIntent.id, "completed");
          console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
        } catch (err) {
          console.error("Error updating transaction status:", err);
        }
      } else if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object as any;
        try {
          await storage.updateTransactionStatus(paymentIntent.id, "failed");
          console.log(`❌ Payment failed: ${paymentIntent.id}`);
        } catch (err) {
          console.error("Error updating transaction status:", err);
        }
      } else if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const { userId, planId } = session.metadata || {};

        if (userId && planId && session.mode === "subscription") {
          // Subscription checkout completed - subscription will be created separately
          console.log(`✅ Checkout completed for user ${userId}, plan ${planId}`);
        }
      } else if (event.type === "customer.subscription.created") {
        if (!stripe) {
          console.error("❌ Stripe not configured - cannot process subscription webhook");
          return res.status(503).json({ message: "Stripe not configured" });
        }

        const subscription = event.data.object as any;
        
        try {
          // Retrieve checkout session related to subscription if possible
          const checkoutSession = await stripe.checkout.sessions.list({
            subscription: subscription.id,
            limit: 1,
          });

          if (checkoutSession.data.length > 0) {
            const { userId, planId } = checkoutSession.data[0].metadata || {};
            
            if (userId && planId) {
              await storage.createUserSubscription({
                userId,
                planId,
                stripeSubscriptionId: subscription.id,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              });

              console.log(`✅ Subscription created for user ${userId}`);
            }
          }
        } catch (sessionErr: any) {
          console.error("Error retrieving checkout session:", sessionErr);
          // Do not fail webhook: subscription might still be valid
        }
      } else if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object as any;
        
        try {
          await storage.updateSubscriptionStatus(
            subscription.id,
            subscription.status,
            new Date(subscription.current_period_end * 1000)
          );
          console.log(`🔄 Subscription updated: ${subscription.id}`);
        } catch (err: any) {
          console.error("Error updating subscription status:", err);
        }
      }

      // Respond success to Stripe
      return res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook error:", err.message || err);
      return res.status(400).json({ message: "Webhook signature verification failed" });
    }
  }
);

// =========================
// ===== CREDIT ROUTES =====
// =========================


// Get credit packages
app.get("/api/credit-packages", async (req, res) => {
  try {
    const packages = await storage.getCreditPackages();
    res.json(packages);
  } catch (error) {
    console.error("Error fetching credit packages:", error);
    res.status(500).json({ message: "Failed to fetch credit packages" });
  }
});


// START BUY PACKAGE ROUTE (MISSING IN YOUR CODE)
app.post("/api/buy-package", async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    const packages = await storage.getCreditPackages();
    const pkg = packages.find((p) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
        metadata: { userId },
      });

      customerId = customer.id;
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(pkg.priceUsd) * 100),
      currency: "usd",
      customer: customerId,
      metadata: {
        userId,
        packageId: pkg.id,
        credits: pkg.credits + pkg.bonus,
        packageName: pkg.name,
      },
    });

    return res.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
}); // END BUY PACKAGE ROUTE


// ===========================
// ==== STRIPE WEBHOOK =======
// ===========================

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req: any, res) => {

    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // Production: verify signature
        event = stripe.webhooks.constructEvent(
          req.body,
          sig as string,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Development: bypass signature verification
        const payload = req.body.toString();
        event = JSON.parse(payload);
        console.warn("⚠️ Webhook signature verification skipped (dev mode)");
      }

      // TODO: handle Stripe events here
      // Example:
      // if (event.type === "payment_intent.succeeded") { /* ... */ }

      return res.json({ received: true });

    } catch (err: any) {
      console.error("Stripe webhook error:", err.message);
      return res.status(400).json({ message: "Webhook signature verification failed" });
    }
  }
);
 return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const { userId, credits, type } = paymentIntent.metadata;

        // Handle verified badge payment
        if (type === "verified_badge") {
          // Payment successful - now ready for manual admin approval
          await storage.updateTransactionStatus(paymentIntent.id, "completed");
          console.log(`✅ Verified badge payment succeeded for user ${userId} - Awaiting admin approval`);
        } else if (credits) {
          // Handle credit purchase
          await storage.updateUserCredits(userId, parseInt(credits));
          await storage.updateTransactionStatus(paymentIntent.id, "completed");
          console.log(`✅ Payment succeeded for user ${userId}: ${credits} YimiCoins`);
        } else {
          // Handle any other payment types (gifts, etc.)

        );

        console.log(`✅ Subscription ${subscription.id} updated to status: ${subscription.status}`);
      } else if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        
        await storage.updateSubscriptionStatus(
          subscription.id,
          "canceled"
        );

        console.log(`✅ Subscription ${subscription.id} canceled`);
      } else if (event.type === "invoice.payment_succeeded") {
        if (!stripe) {
          console.error("❌ Stripe not configured - cannot process invoice webhook");
          return res.status(503).json({ message: "Stripe not configured" });
        }

        const invoice = event.data.object;
        
        if (invoice.subscription) {
          try {
            // Retrieve subscription details
            const subscriptionData = await stripe.subscriptions.retrieve(invoice.subscription as string);
            // Handle both Stripe SDK v15 and v16+ response formats
            const subscription = 'data' in subscriptionData ? (subscriptionData as any).data : subscriptionData;
            
            // Update subscription period and record payment
            await storage.updateSubscriptionStatus(
              subscription.id,
              subscription.status,
              new Date(subscription.current_period_end * 1000)
            );

            // Record subscription payment transaction
            const userSub = await db
              .select()
              .from(userSubscriptions)
              .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id))
              .limit(1);

            if (userSub.length > 0) {
              await storage.recordSubscriptionPayment(
                userSub[0].userId,
                subscription.id,
                (invoice.amount_paid / 100).toString()
              );
            }

            console.log(`✅ Subscription invoice paid: ${invoice.id}`);
          } catch (subErr: any) {
            console.error("Error retrieving subscription:", subErr);
            // Don't fail webhook - invoice is still paid
          }
        }
      }
    } catch (err: any) {
      console.error("Error handling webhook event:", err);
      return res.status(500).json({ message: "Webhook handler failed" });
    }

    res.json({ received: true });
  });

  // Initiate Mobile Money payment
  app.post("/api/mobile-money/initiate", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId, provider, phoneNumber } = req.body;

      const packages = await storage.getCreditPackages();
      const pkg = packages.find((p) => p.id === packageId);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      // In production, integrate with actual Mobile Money APIs (Orange, MTN, Wave)
      // For now, simulate pending payment
      const transaction = await storage.createTransaction({
        userId,
        type: "purchase",
        amount: pkg.priceUsd,
        credits: pkg.credits + pkg.bonus,
        paymentMethod: provider,
        paymentProvider: `${provider}_${Date.now()}`,
        description: `Mobile Money payment - ${pkg.name}`,
        status: "pending",
      });

      // TODO: Call actual Mobile Money API here
      // For testing, auto-complete the payment after 3 seconds
      setTimeout(async () => {
        const totalCredits = pkg.credits + pkg.bonus;
        await storage.updateUserCredits(userId, totalCredits);
        await storage.updateTransactionStatus(transaction.paymentProvider!, "completed");
        console.log(`✅ Mobile Money payment completed for user ${userId}`);
      }, 3000);

      res.json({ 
        success: true, 
        transactionId: transaction.id,
        message: "Payment initiated. Please check your phone to confirm.",
      });
    } catch (error) {
      console.error("Error initiating mobile money payment:", error);
      res.status(500).json({ message: "Failed to initiate payment" });
    }
  });

  // Purchase credits (fallback for testing/development)
  app.post("/api/credits/purchase", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId, paymentMethod = "test" } = req.body;

      const packages = await storage.getCreditPackages();
      const pkg = packages.find((p) => p.id === packageId);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      // For testing: instantly add credits without payment
      // In production, use Stripe or Mobile Money endpoints
      const totalCredits = pkg.credits + pkg.bonus;
      await storage.updateUserCredits(userId, totalCredits);

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: "purchase",
        amount: pkg.priceUsd,
        credits: totalCredits,
        paymentMethod: paymentMethod,
        description: `Test purchase - ${pkg.name}`,
        status: "completed",
      });

      res.json({ success: true, creditsAdded: totalCredits });
    } catch (error) {
      console.error("Error purchasing credits:", error);
      res.status(500).json({ message: "Failed to purchase credits" });
    }
  });

  // ===== DASHBOARD ROUTES =====

  // Get dashboard stats
  app.get("/api/dashboard/stats", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get creator videos with stats
  app.get("/api/dashboard/videos", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videos = await storage.getCreatorVideosWithStats(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching creator videos:", error);
      res.status(500).json({ message: "Failed to fetch creator videos" });
    }
  });

  // ===== PROFILE ROUTES =====

  // Get user profile
  app.get("/api/profile/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const videos = await storage.getVideosByCreator(req.params.userId);
      const stats = await storage.getDashboardStats(req.params.userId);

      res.json({
        user,
        videos,
        stats,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // ===== SHARE/STOCK ROUTES =====

  // Get current share price
  app.get("/api/shares/current-price", async (req, res) => {
    try {
      const currentPrice = await storage.getCurrentSharePrice();
      res.json(currentPrice || { priceUsd: 108, platformValue: 1080000, totalShares: 10000 });
    } catch (error) {
      console.error("Error fetching current price:", error);
      res.status(500).json({ message: "Failed to fetch current price" });
    }
  });

  // Get share stats
  app.get("/api/shares/stats", async (req, res) => {
    try {
      const stats = await storage.getShareStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching share stats:", error);
      res.status(500).json({ message: "Failed to fetch share stats" });
    }
  });

  // Get user's shares
  app.get("/api/shares/my-shares", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userShares = await storage.getUserShares(userId);
      const totalShares = await storage.getTotalUserShares(userId);
      const currentPrice = await storage.getCurrentSharePrice();
      
      // Convert string values to numbers for calculations (DB numeric fields are strings)
      const totalInvested = userShares.reduce((sum, share) => sum + parseFloat(share.totalCost), 0);
      const currentValue = totalShares * parseFloat(currentPrice?.priceUsd || "108");
      const profitLoss = currentValue - totalInvested;
      const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

      res.json({
        shares: userShares,
        summary: {
          totalShares,
          totalInvested,
          currentValue,
          profitLoss,
          profitLossPercentage,
          currentPrice: currentPrice?.priceUsd || 108,
        },
      });
    } catch (error) {
      console.error("Error fetching user shares:", error);
      res.status(500).json({ message: "Failed to fetch user shares" });
    }
  });

  // Get user's share transactions
  app.get("/api/shares/my-transactions", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserShareTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get share price history
  app.get("/api/shares/price-history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const history = await storage.getSharePriceHistory(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });

  // Purchase shares
  app.post("/api/shares/purchase", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      // Get current price
      const currentPrice = await storage.getCurrentSharePrice();
      const pricePerShare = parseFloat(currentPrice?.priceUsd || "108");
      const totalAmount = pricePerShare * quantity;

      // Create share transaction
      const transaction = await storage.createShareTransaction({
        userId,
        type: "purchase",
        quantity,
        pricePerShare: pricePerShare.toString(),
        totalAmount: totalAmount.toString(),
        status: "pending",
        paymentMethod: "stripe",
      });

      // If Stripe is configured, create payment intent
      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: "usd",
          metadata: {
            userId,
            transactionId: transaction.id,
            type: "share_purchase",
            quantity: quantity.toString(),
          },
        });

        await storage.updateShareTransactionStatus(
          transaction.id,
          "pending",
          paymentIntent.id
        );

        res.json({
          clientSecret: paymentIntent.client_secret,
          transactionId: transaction.id,
          amount: totalAmount,
        });
      } else {
        res.status(503).json({ message: "Payment system not configured" });
      }
    } catch (error) {
      console.error("Error purchasing shares:", error);
      res.status(500).json({ message: "Failed to purchase shares" });
    }
  });

  // Stripe webhook for share purchases
  app.post("/api/shares/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { transactionId, quantity, userId } = paymentIntent.metadata;

      if (transactionId && quantity && userId) {
        // Update transaction status
        await storage.updateShareTransactionStatus(transactionId, "completed");

        // Get transaction details
        const transactions = await storage.getUserShareTransactions(userId);
        const transaction = transactions.find(t => t.id === transactionId);

        if (transaction) {
          // Create share record
          await storage.createShare({
            userId,
            quantity: parseInt(quantity),
            purchasePrice: transaction.pricePerShare,
            totalCost: transaction.totalAmount,
          });
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { transactionId } = paymentIntent.metadata;

      if (transactionId) {
        await storage.updateShareTransactionStatus(transactionId, "failed");
      }
    }

    res.json({ received: true });
  });

  // ===== REFERRAL ROUTES =====

  // Get current user's referral code
  app.get("/api/referral/code", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const code = await storage.getUserReferralCode(userId);
      res.json({ code });
    } catch (error) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({ message: "Failed to fetch referral code" });
    }
  });

  // Get referral stats for current user
  app.get("/api/referral/stats", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Get all referrals for current user
  app.get("/api/referral/list", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await storage.getReferralsByReferrer(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // Apply a referral code (use someone's code)
  app.post("/api/referral/apply", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referralCode } = req.body;

      if (!referralCode) {
        return res.status(400).json({ message: "Referral code is required" });
      }

      // Find the user who owns this referral code
      const referrer = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, referralCode))
        .limit(1);

      if (referrer.length === 0) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      const referrerId = referrer[0].id;

      // Check if this user is trying to use their own code
      if (referrerId === userId) {
        return res.status(400).json({ message: "Cannot use your own referral code" });
      }

      // Check if user has already used a referral code
      const existingReferral = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referredId, userId))
        .limit(1);

      if (existingReferral.length > 0) {
        return res.status(400).json({ message: "You have already used a referral code" });
      }

      // Create the referral
      const bonusAmount = 100; // 100 YimiCoins bonus
      const referral = await storage.createReferral({
        referrerId,
        referredId: userId,
        referralCode,
        bonusAwarded: bonusAmount,
        status: "completed",
      });

      // Award bonus to referrer
      await storage.updateUserCredits(referrerId, bonusAmount);

      // Create notification for referrer
      await storage.createNotification({
        userId: referrerId,
        type: "referral",
        message: `Félicitations ! Vous avez gagné ${bonusAmount} YimiCoins grâce à votre parrainage !`,
      });

      res.json({ success: true, referral });
    } catch (error) {
      console.error("Error applying referral code:", error);
      res.status(500).json({ message: "Failed to apply referral code" });
    }
  });

  // ===== BADGE ROUTES =====

  // Get all badge types
  app.get("/api/badges/types", async (req, res) => {
    try {
      const badgeTypes = await storage.getAllBadgeTypes();
      res.json(badgeTypes);
    } catch (error) {
      console.error("Error fetching badge types:", error);
      res.status(500).json({ message: "Failed to fetch badge types" });
    }
  });

  // Get user badges
  app.get("/api/users/:userId/badges", async (req, res) => {
    try {
      const badges = await storage.getUserBadges(req.params.userId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch user badges" });
    }
  });

  // Check and award badges for current user
  app.post("/api/badges/check", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newBadges = await storage.checkAndAwardBadges(userId);
      res.json({ newBadges, count: newBadges.length });
    } catch (error) {
      console.error("Error checking badges:", error);
      res.status(500).json({ message: "Failed to check badges" });
    }
  });

  // ===== SUBSCRIPTION ROUTES =====

  // Get all subscription plans
  app.get("/api/subscriptions/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans({ isActive: true });
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get user's active subscription
  app.get("/api/subscriptions/current", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getUserSubscription(userId);
      res.json(subscription || null);
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Create Stripe checkout session for subscription
  app.post("/api/subscriptions/checkout", requiresAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const userId = req.user.claims.sub;
      const { planId } = req.body;

      const plans = await storage.getSubscriptionPlans({ planId });
      if (plans.length === 0) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const plan = plans[0];
      if (!plan.stripePriceId) {
        return res.status(500).json({ message: "Plan not configured for Stripe" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        customer_email: user.email || undefined,
        metadata: {
          userId,
          planId,
        },
        success_url: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/dashboard?subscription=success`,
        cancel_url: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/subscriptions?subscription=cancelled`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating subscription checkout:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Cancel subscription
  app.post("/api/subscriptions/cancel", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.cancelSubscription(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ===== VERIFIED BADGE ROUTES =====

  // Get badge purchase status
  app.get("/api/verified-badge/status", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchase = await storage.getBadgePurchase(userId);
      res.json(purchase || null);
    } catch (error) {
      console.error("Error fetching badge status:", error);
      res.status(500).json({ message: "Failed to fetch badge status" });
    }
  });

  // Create verified badge purchase
  app.post("/api/verified-badge/purchase", requiresAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const userId = req.user.claims.sub;
      const { submittedDocuments } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already verified or has pending purchase
      if (user.isVerified) {
        return res.status(400).json({ message: "Already verified" });
      }

      const existingPurchase = await storage.getBadgePurchase(userId);
      if (existingPurchase && existingPurchase.status === "pending") {
        return res.status(400).json({ message: "Purchase already pending" });
      }

      // Get authoritative pricing from server settings
      const settings = await storage.getMonetizationSettings();
      const priceUsd = settings.verifiedBadgePriceUsd;
      const priceFcfa = settings.verifiedBadgePriceFcfa;

      // Create Stripe payment intent with server-controlled amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(priceUsd) * 100),
        currency: "usd",
        metadata: { userId, type: "verified_badge" },
        description: "Verified badge purchase",
      });

      // Create purchase record
      const purchase = await storage.createBadgePurchase({
        userId,
        priceUsd,
        priceFcfa,
        submittedDocuments,
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ 
        purchase,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating badge purchase:", error);
      res.status(500).json({ message: "Failed to create badge purchase" });
    }
  });

  // ===== VIEW EARNINGS ROUTES =====

  // Get user's view earnings
  app.get("/api/earnings/views", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const totalEarnings = await storage.getTotalViewEarnings(userId);
      res.json({ totalEarnings });
    } catch (error) {
      console.error("Error fetching view earnings:", error);
      res.status(500).json({ message: "Failed to fetch view earnings" });
    }
  });

  // Get video view earnings
  app.get("/api/earnings/videos/:videoId", requiresAuth, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const earnings = await storage.getVideoViewEarnings(videoId);
      res.json(earnings || null);
    } catch (error) {
      console.error("Error fetching video earnings:", error);
      res.status(500).json({ message: "Failed to fetch video earnings" });
    }
  });

  // ===== MONETIZATION SETTINGS ROUTES =====

  // Get monetization settings (public)
  app.get("/api/monetization/settings", async (req, res) => {
    try {
      const settings = await storage.getMonetizationSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching monetization settings:", error);
      res.status(500).json({ message: "Failed to fetch monetization settings" });
    }
  // ===== ADMIN ROUTES =====

// Admin middleware: Check isAdmin flag + shared-secret header
const requiresAdmin = async (req: any, res: Response, next: any) => {
  try {
    // Check authentication first
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    // Check isAdmin flag
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    // Optional: Check shared-secret header for extra security
    const adminSecret = req.headers["x-admin-secret"];
    const expectedSecret = process.env.ADMIN_SECRET;

    if (expectedSecret && adminSecret !== expectedSecret) {
      console.warn(`Failed admin secret check for user ${userId}`);
      return res.status(403).json({ message: "Invalid admin credentials" });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ message: "Admin authorization failed" });
  }
};

// --- PROCESS VIDEOS RESPONSE FIXED ---
const sendProcessVideosResponse = (
  res: Response,
  processedCount: number,
  totalEarningsFcfa: number,
  totalEarningsUsd: number,
  failures: any[],
  hasMore: boolean,
  nextCursor: any,
  batchSize: number,
  duration: number
) => {
  try {
    return res.json({
      success: true,
      processedVideos: processedCount,
      totalEarningsFcfa: totalEarningsFcfa.toFixed(2),
      totalEarningsUsd: totalEarningsUsd.toFixed(2),
      failures: failures.length,
      failureDetails: failures,
      hasMore,
      nextCursor,
      batchSize,
      durationMS: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "email_failed" });
  }
};
// --- ADMIN DELETE USER ---
app.delete(
  "/api/admin/delete-user",
  requiresAdmin,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const adminSecret = req.headers["x-admin-delete-secret"];
      const expectedSecret = process.env.ADMIN_DELETE_SECRET;

      if (!expectedSecret) {
        console.error("[SECURITY] ADMIN_DELETE_SECRET not configured - endpoint disabled");
        return res.status(503).json({ message: "Admin delete endpoint not configured" });
      }
      if (!adminSecret || adminSecret !== expectedSecret) {
        console.warn("[SECURITY] Invalid admin delete secret attempted");
        return res.status(403).json({ message: "Invalid admin credentials" });
      }

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const user = await storage.findUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found with this email" });
      }

      console.log(`[ADMIN] Deleting user account: ${email} (ID: ${user.id})`);

      await db.delete(users).where(eq(users.email, email.toLowerCase()));

      console.log(`[ADMIN] Successfully deleted user: ${email}`);
ju
      return res.json({
        message: "User deleted successfully",
        deletedEmail: email,
        deletedUserId: user.id,
      });

    } catch (error) {
      console.error("[ADMIN] Error deleting user:", error);
      return res.status(500).json({ message: "Failed to delete user" });
    });
