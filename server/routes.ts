import type { Express, Request, Response } from "express";
import express from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requiresAuth } from "./replitAuth";
import { setupLocalStrategy } from "./auth/localStrategy";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import Stripe from "stripe";
import { db } from "./db";
import { users, referrals } from "../shared/schema";
import { eq } from "drizzle-orm";
import { getOnlineUsers, isUserOnline } from "./websocket";
import passport from "passport";
import { rateLimit } from "express-rate-limit";
import { registerSchema, loginSchema, type SessionUser } from "@shared/authSchemas";

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in uploaded_videos directory
    cb(null, "./uploaded_videos");
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: uploadStorage,
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
      
      const { email, password, firstName, lastName } = result.data;
      
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
        creditBalance: user.creditBalance,
        totalEarnings: user.totalEarnings,
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

        const videoUrl = `/uploads/${videoFile.filename}`;
        const thumbnailUrl = thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null;

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
  });

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

  // Create Stripe payment intent for credit purchase
  app.post("/api/create-payment-intent", requiresAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing not configured. Please add Stripe API keys." });
      }

      const userId = req.user.claims.sub;
      const { packageId } = req.body;

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
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(pkg.priceUsd * 100), // Convert to cents
        currency: "usd",
        customer: customerId,
        metadata: {
          userId,
          packageId: pkg.id,
          credits: pkg.credits + pkg.bonus,
          packageName: pkg.name,
        },
        description: `Purchase ${pkg.name} - ${pkg.credits + pkg.bonus} YimiCoins`,
      });

      // Create pending transaction
      await storage.createTransaction({
        userId,
        type: "purchase",
        amount: pkg.priceUsd,
        credits: pkg.credits + pkg.bonus,
        paymentMethod: "stripe",
        paymentProvider: paymentIntent.id,
        description: `Purchasing ${pkg.name}`,
        status: "pending",
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent: " + error.message });
    }
  });

  // Stripe webhook handler
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // Production: Verify webhook signature
        event = stripe.webhooks.constructEvent(
          req.body,
          sig as string,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Development: Parse without verification (NOT for production)
        const payload = req.body.toString();
        event = JSON.parse(payload);
        console.warn("⚠️  Webhook signature verification skipped (development mode)");
      }
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const { userId, credits } = paymentIntent.metadata;

        // Add credits to user account
        await storage.updateUserCredits(userId, parseInt(credits));

        // Update transaction status
        await storage.updateTransactionStatus(paymentIntent.id, "completed");

        console.log(`✅ Payment succeeded for user ${userId}: ${credits} YimiCoins`);
      } else if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        
        // Update transaction status
        await storage.updateTransactionStatus(paymentIntent.id, "failed");

        console.log(`❌ Payment failed: ${paymentIntent.id}`);
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
      
      const totalInvested = userShares.reduce((sum, share) => sum + share.totalCost, 0);
      const currentValue = totalShares * (currentPrice?.priceUsd || 108);
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
      const pricePerShare = currentPrice?.priceUsd || 108;
      const totalAmount = pricePerShare * quantity;

      // Create share transaction
      const transaction = await storage.createShareTransaction({
        userId,
        type: "purchase",
        quantity,
        pricePerShare,
        totalAmount,
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

  return app;
}
