import type { Express, Request, Response } from "express";
import express from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import Stripe from "stripe";

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

  // ===== FOLLOW ROUTES =====

  // Follow a user
  app.post("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
    try {
      const followerId = req.user.claims.sub;
      const followingId = req.params.userId;

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      await storage.followUser(followerId, followingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  // Unfollow a user
  app.delete("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/users/:userId/is-following", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/videos/following", isAuthenticated, async (req: any, res) => {
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

  // Create Stripe payment intent for credit purchase
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/mobile-money/initiate", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/credits/purchase", isAuthenticated, async (req: any, res) => {
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

  return app;
}
