import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
  app.use("/uploads", express.static("./uploaded_videos"));

  // ===== AUTH ROUTES =====
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
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
    isAuthenticated,
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

        res.json(video);
      } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ message: "Failed to upload video" });
      }
    }
  );

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
  app.post("/api/videos/:videoId/like", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const like = await storage.likeVideo(userId, req.params.videoId);
      res.json(like);
    } catch (error) {
      console.error("Error liking video:", error);
      res.status(500).json({ message: "Failed to like video" });
    }
  });

  // Unlike a video
  app.delete("/api/videos/:videoId/like", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.unlikeVideo(userId, req.params.videoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unliking video:", error);
      res.status(500).json({ message: "Failed to unlike video" });
    }
  });

  // ===== COMMENT ROUTES =====

  // Create comment
  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const comment = await storage.createComment({
        videoId: req.body.videoId,
        userId,
        content: req.body.content,
      });
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
  app.post("/api/gifts/send", isAuthenticated, async (req: any, res) => {
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

  // Purchase credits
  app.post("/api/credits/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId } = req.body;

      const packages = await storage.getCreditPackages();
      const pkg = packages.find((p) => p.id === packageId);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      // In production, this would integrate with a real payment processor
      // For now, we'll just add the credits

      const totalCredits = pkg.credits + pkg.bonus;
      await storage.updateUserCredits(userId, totalCredits);

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: "purchase",
        amount: pkg.priceUsd,
        credits: totalCredits,
        description: `Purchased ${pkg.name}`,
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
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/dashboard/videos", isAuthenticated, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
