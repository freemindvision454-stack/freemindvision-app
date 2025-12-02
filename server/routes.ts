niimport adminRoutes from "./admin.js";
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
import { sendSupportEmail } from "./lib/email";
// Configure multer pour les uploads de vidéos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "video/mp4", "video/webm", "video/quicktime",
      "image/jpeg", "image/png", "image/webp",
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Type de fichier invalide"));
  },
});

// Configure multer pour les médias de messages
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm", 
      "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Type de média invalide pour les messages"));
    }
  },
});
// Initialisation Stripe
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20" as any,
  });
}

export async function registerRoutes(app: Express): Promise<Express> {
  // Initialisation Cloudinary
  const cloudinaryEnabled = initializeCloudinary();

  // Health check endpoint
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

  // API health check
  app.get("/api/health", (_req: Request, res: Response) => {
    console.log(`[HEALTH] API health check requested`);
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  });
  // Configuration auth endpoint
app.get("/api/auth/config", (_req: Request, res: Response) => {
  res.json({
    replitAuthEnabled: isReplitAuthEnabled(),
  });
});

// Configuration auth middleware
await setupAuth(app);

// Setup local strategy
setupLocalStrategy();

// Rate limiting pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requêtes par fenêtre
  message: { message: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
  // ===== ROUTES AUTH LOCALE =====

// Inscription nouvel utilisateur
app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validation input
    const result = registerSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        message: "Données invalides",
        errors: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    const { email, password, firstName, lastName, phoneNumber, dateOfBirth, country, city, gender } = result.data;
    
    // Vérifier si email existe déjà
    const existingUser = await storage.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }
    
    // Créer utilisateur avec mot de passe hashé
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
    
    // Auto-login après inscription
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
// Connexion avec email/mot de passe
app.post("/api/auth/login", authLimiter, (req: Request, res: Response, next) => {
  // Validation input
  const result = loginSchema.safeParse(req.body);
    
  if (!result.success) {
    return res.status(400).json({
      message: "Données invalides",
      errors: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }
    
  // Authentification avec Passport local strategy
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
  
// Déconnexion
app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
      
    res.json({ message: "Déconnexion réussie" });
  });
});
  
// Get current session
app.get("/api/auth/session", (req: Request, res: Response) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});
  // Servir les fichiers uploadés
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
app.use("/uploads", express.static("./uploaded_videos"));
  
// Servir les médias de messages
app.use("/message-media", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
app.use("/message-media", express.static("./uploaded_messages"));

// Route auth user
app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
  try {
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
  // ===== ROUTES VIDÉOS =====

// Obtenir toutes les vidéos avec infos créateur
app.get("/api/videos", async (req, res) => {
  try {
    const videos = await storage.getVideos(50);

    // Enrichir avec données créateur
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

// Upload vidéo
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
        return res.status(400).json({ message: "Fichier vidéo requis" });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files.thumbnail?.[0];

      let videoUrl: string;
      let thumbnailUrl: string | null = null;

      if (cloudinaryEnabled) {
        // Upload vers Cloudinary
        console.log('[VIDEO-UPLOAD] Uploading video to Cloudinary...');
        const videoUpload: any = await cloudinaryUploadStream(videoFile.buffer, {
          resource_type: 'video',
          folder: 'freemind-videos',
        });
        videoUrl = videoUpload.secure_url;
        console.log(`[VIDEO-UPLOAD] ✅ Video uploaded to Cloudinary: ${videoUrl}`);

        // Upload thumbnail si fourni
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
        // Fallback stockage local
        console.warn('[VIDEO-UPLOAD] ⚠️  Cloudinary not configured, using local storage');
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
        duration: null,
      });

      // Marquer utilisateur comme créateur si pas déjà
      const user = await storage.getUser(userId);
      if (user && !user.isCreator) {
        await storage.upsertUser({
          ...user,
          isCreator: true,
        });
      }

      // Vérifier et attribuer badges
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
 // ===== ROUTES VIDÉOS =====

// Obtenir toutes les vidéos avec infos créateur
app.get("/api/videos", async (req, res) => {
  try {
    const videos = await storage.getVideos(50);

    // Enrichir avec données créateur
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

// Upload vidéo
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
        return res.status(400).json({ message: "Fichier vidéo requis" });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files.thumbnail?.[0];

      let videoUrl: string;
      let thumbnailUrl: string | null = null;

      if (cloudinaryEnabled) {
        // Upload vers Cloudinary
        console.log('[VIDEO-UPLOAD] Uploading video to Cloudinary...');
        const videoUpload: any = await cloudinaryUploadStream(videoFile.buffer, {
          resource_type: 'video',
          folder: 'freemind-videos',
        });
        videoUrl = videoUpload.secure_url;
        console.log(`[VIDEO-UPLOAD] ✅ Video uploaded to Cloudinary: ${videoUrl}`);

        // Upload thumbnail si fourni
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
        // Fallback stockage local
        console.warn('[VIDEO-UPLOAD] ⚠️  Cloudinary not configured, using local storage');
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
        duration: null,
      });

      // Marquer utilisateur comme créateur si pas déjà
      const user = await storage.getUser(userId);
      if (user && !user.isCreator) {
        await storage.upsertUser({
          ...user,
          isCreator: true,
        });
      }

      // Vérifier et attribuer badges
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
  // Recherche vidéos
app.get("/api/videos/search", async (req, res) => {
  try {
    const query = req.query.q as string;
      
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = query.trim().toLowerCase();
    const allVideos = await storage.getVideos(500);

    // Recherche dans titre, description et nom créateur
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

    // Filtrer résultats null et limiter à 50
    const results = matchingVideos.filter(v => v !== null).slice(0, 50);
    res.json(results);
  } catch (error) {
    console.error("Error searching videos:", error);
    res.status(500).json({ message: "Failed to search videos" });
  }
});

// Incrémenter vues vidéo
app.post("/api/videos/:videoId/view", async (req, res) => {
  try {
    await storage.incrementVideoViews(req.params.videoId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error incrementing views:", error);
    res.status(500).json({ message: "Failed to increment views" });
  }
});
  // ===== ROUTES LIKES =====

// Like une vidéo
app.post("/api/videos/:videoId/like", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const like = await storage.likeVideo(userId, req.params.videoId);
      
    // Créer notification pour créateur vidéo
    const video = await storage.getVideo(req.params.videoId);
    if (video && video.creatorId !== userId) {
      const actor = await storage.getUser(userId);
      const actorName = actor?.firstName && actor?.lastName 
        ? `${actor.firstName} ${actor.lastName}`
        : actor?.email?.split("@")[0] || "Quelqu'un";
        
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

// Unlike une vidéo
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

// ===== ROUTES FAVORIS =====

// Ajouter vidéo aux favoris
app.post("/api/videos/:videoId/favorite", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const video = await storage.getVideo(req.params.videoId);
      
    if (!video) {
      return res.status(404).json({ message: "Vidéo non trouvée" });
    }

    // Vérifier si déjà favori pour éviter doublons
    const alreadyFavorited = await storage.isVideoFavorited(userId, req.params.videoId);
      
    const favorite = await storage.favoriteVideo(userId, req.params.videoId);
      
    // Créer notification seulement pour NOUVEAUX favoris
    if (!alreadyFavorited && video.creatorId !== userId) {
      const actor = await storage.getUser(userId);
      const actorName = actor?.firstName && actor?.lastName 
        ? `${actor.firstName} ${actor.lastName}`
        : actor?.email?.split("@")[0] || "Quelqu'un";
        
      await storage.createNotification({
        userId: video.creatorId,
        type: "favorite",
        actorId: userId,
        videoId: video.id,
        message: `${actorName} a ajouté votre vidéo "${video.title}" à ses favoris`,
      });
    }
      
    res.json(favorite);
  } catch (error) {
    console.error("Error favoriting video:", error);
    res.status(500).json({ message: "Failed to favorite video" });
  }
});

// Retirer des favoris
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
 // ===== ROUTES COMMENTAIRES =====

// Obtenir commentaires d'une vidéo
app.get("/api/videos/:videoId/comments", async (req, res) => {
  try {
    const comments = await storage.getVideoComments(req.params.videoId);
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// Ajouter commentaire
app.post("/api/videos/:videoId/comments", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { content, parentCommentId } = req.body;

    const comment = await storage.createComment({
      userId,
      videoId: req.params.videoId,
      content,
      parentCommentId: parentCommentId || null,
    });

    // Notification pour créateur vidéo
    const video = await storage.getVideo(req.params.videoId);
    if (video && video.creatorId !== userId) {
      const actor = await storage.getUser(userId);
      const actorName = actor?.firstName && actor?.lastName 
        ? `${actor.firstName} ${actor.lastName}`
        : actor?.email?.split("@")[0] || "Quelqu'un";
        
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

// Supprimer commentaire
app.delete("/api/comments/:commentId", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    await storage.deleteComment(req.params.commentId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});
  // ===== ROUTES MESSAGES =====

// Obtenir conversations
app.get("/api/messages/conversations", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const conversations = await storage.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Obtenir messages d'une conversation
app.get("/api/messages/conversations/:otherUserId", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const otherUserId = req.params.otherUserId;
    const messages = await storage.getMessages(userId, otherUserId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Envoyer message avec média
app.post("/api/messages/send", requiresAuth, uploadMessageMedia.single("media"), async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { toUserId, content } = req.body;
    const mediaFile = req.file;

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    if (mediaFile) {
      mediaUrl = `/message-media/${mediaFile.filename}`;
      mediaType = mediaFile.mimetype.split("/")[0]; // 'image', 'video', 'audio'
    }

    const message = await storage.createMessage({
      fromUserId: userId,
      toUserId,
      content: content || null,
      mediaUrl,
      mediaType,
    });

    // Vérifier si utilisateur en ligne pour notification en temps réel
    if (isUserOnline(toUserId)) {
      // WebSocket notification serait envoyée ici
      console.log(`User ${toUserId} is online, would send real-time notification`);
    }

    res.json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});
  // ===== ROUTES UTILISATEURS =====

// Obtenir profil utilisateur
app.get("/api/users/:userId", async (req, res) => {
  try {
    const user = await storage.getUser(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Mettre à jour profil
app.put("/api/users/profile", requiresAuth, upload.single("profileImage"), async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { firstName, lastName, bio, phoneNumber, country, city } = req.body;
    const profileImageFile = req.file;

    let profileImageUrl: string | undefined;

    if (profileImageFile && cloudinaryEnabled) {
      const uploadResult: any = await cloudinaryUploadStream(profileImageFile.buffer, {
        resource_type: 'image',
        folder: 'freemind-profiles',
      });
      profileImageUrl = uploadResult.secure_url;
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const updatedUser = await storage.upsertUser({
      ...user,
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      bio: bio !== undefined ? bio : user.bio,
      phoneNumber: phoneNumber || user.phoneNumber,
      country: country || user.country,
      city: city || user.city,
      profileImageUrl: profileImageUrl || user.profileImageUrl,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Suivre un utilisateur
app.post("/api/users/:userId/follow", requiresAuth, async (req: any, res) => {
  try {
    const followerId = req.user.claims.sub;
    const followingId = req.params.userId;

    if (followerId === followingId) {
      return res.status(400).json({ message: "Vous ne pouvez pas vous suivre vous-même" });
    }

    const follow = await storage.followUser(followerId, followingId);

    // Notification pour l'utilisateur suivi
    const follower = await storage.getUser(followerId);
    const followerName = follower?.firstName && follower?.lastName 
      ? `${follower.firstName} ${follower.lastName}`
      : follower?.email?.split("@")[0] || "Quelqu'un";

    await storage.createNotification({
      userId: followingId,
      type: "follow",
      actorId: followerId,
      message: `${followerName} vous suit maintenant`,
    });

    res.json(follow);
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ message: "Failed to follow user" });
  }
});

// Arrêter de suivre
app.delete("/api/users/:userId/follow", requiresAuth, async (req: any, res) => {
  try {
    const followerId = req.user.claims.sub;
    await storage.unfollowUser(followerId, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ message: "Failed to unfollow user" });
  }
});
  // ===== ROUTES NOTIFICATIONS =====

// Obtenir notifications utilisateur
app.get("/api/notifications", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const notifications = await storage.getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Marquer notification comme lue
app.patch("/api/notifications/:notificationId/read", requiresAuth, async (req: any, res) => {
  try {
    await storage.markNotificationAsRead(req.params.notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Marquer toutes les notifications comme lues
app.post("/api/notifications/mark-all-read", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

// Supprimer notification
app.delete("/api/notifications/:notificationId", requiresAuth, async (req: any, res) => {
  try {
    await storage.deleteNotification(req.params.notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});
  // ===== ROUTES PARRAINAGE =====

// Obtenir code de parrainage
app.get("/api/referrals/code", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ referralCode: user.referralCode });
  } catch (error) {
    console.error("Error fetching referral code:", error);
    res.status(500).json({ message: "Failed to fetch referral code" });
  }
});

// Appliquer code de parrainage
app.post("/api/referrals/apply", requiresAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ message: "Code de parrainage requis" });
    }

    // Vérifier que l'utilisateur n'applique pas son propre code
    const user = await storage.getUser(userId);
    if (user?.referralCode === referralCode) {
      return res.status(400).json({ message: "Vous ne pouvez pas utiliser votre propre code" });
    }

    const referral = await storage.applyReferralCode(userId, referralCode);

    if (!referral) {
      return res.status(400).json({ message: "Code de parrainage invalide ou déjà utilisé" });
    }

    // Bonus pour le parrain
    const referrerId = referral.referrerId;
    const bonusAmount = 100; // YimiCoins

    await storage.addCredits(referrerId, bonusAmount);

    // Notification pour le parrain
    await storage.createNotification({
      userId: referrerId,
      type: "referral",
      message: `Félicitations ! Vous avez gagné ${bonusAmount} YimiCoins grâce à votre parrainage`,
    });

    res.json({ success: true, referral });
  } catch (error) {
    console.error("Error applying referral code:", error);
    res.status(500).json({ message: "Failed to apply referral code" });
  }
});
  // ===== ROUTES BADGES =====

// Obtenir tous les types de badges
app.get("/api/badges/types", async (req, res) => {
  try {
    const badgeTypes = await storage.getAllBadgeTypes();
    res.json(badgeTypes);
  } catch (error) {
    console.error("Error fetching badge types:", error);
    res.status(500).json({ message: "Failed to fetch badge types" });
  }
});

// Obtenir badges utilisateur
app.get("/api/users/:userId/badges", async (req, res) => {
  try {
    const badges = await storage.getUserBadges(req.params.userId);
    res.json(badges);
  } catch (error) {
    console.error("Error fetching user badges:", error);
    res.status(500).json({ message: "Failed to fetch user badges" });
  }
});

// Vérifier et attribuer badges pour utilisateur courant
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
  // ===== ROUTES ABONNEMENTS =====

// Obtenir tous les plans d'abonnement
app.get("/api/subscriptions/plans", async (req, res) => {
  try {
    const plans = await storage.getSubscriptionPlans({ isActive: true });
    res.json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ message: "Failed to fetch subscription plans" });
  }
});

// Obtenir abonnement actif de l'utilisateur
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

// Créer session Stripe checkout pour abonnement
app.post("/api/subscriptions/checkout", requiresAuth, async (req: any, res) => {
  if (!stripe) {
    return res.status(500).json({ message: "Stripe non configuré" });
  }

  try {
    const userId = req.user.claims.sub;
    const { planId } = req.body;

    const plans = await storage.getSubscriptionPlans({ planId });
    if (plans.length === 0) {
      return res.status(404).json({ message: "Plan non trouvé" });
    }

    const plan = plans[0];
    if (!plan.stripePriceId) {
      return res.status(500).json({ message: "Plan non configuré pour Stripe" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
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

// Annuler abonnement
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
  // ===== ROUTES BADGE VÉRIFIÉ =====

// Obtenir statut d'achat du badge
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

// Créer achat badge vérifié
app.post("/api/verified-badge/purchase", requiresAuth, async (req: any, res) => {
  if (!stripe) {
    return res.status(500).json({ message: "Stripe non configuré" });
  }

  try {
    const userId = req.user.claims.sub;
    const { submittedDocuments } = req.body;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier si déjà vérifié ou achat en attente
    if (user.isVerified) {
      return res.status(400).json({ message: "Déjà vérifié" });
    }

    const existingPurchase = await storage.getBadgePurchase(userId);
    if (existingPurchase && existingPurchase.status === "pending") {
      return res.status(400).json({ message: "Achat déjà en attente" });
    }

    // Créer l'achat (logique à compléter selon votre implémentation)
    const purchase = await storage.createBadgePurchase(userId, submittedDocuments);
    res.json(purchase);
  } catch (error) {
    console.error("Error creating badge purchase:", error);
    res.status(500).json({ message: "Failed to create badge purchase" });
  }
});

// ===== ROUTES MONÉTISATION =====

// Obtenir paramètres de monétisation (public)
app.get("/api/monetization/settings", async (req, res) => {
  try {
    const settings = await storage.getMonetizationSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching monetization settings:", error);
    res.status(500).json({ message: "Failed to fetch monetization settings" });
  }
});
  // ===== MIDDLEWARE ADMIN =====

// Middleware admin: Vérifier isAdmin + header secret
const requiresAdmin = async (req: any, res: Response, next: any) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Authentification requise" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Privilèges admin requis" });
    }

    const adminSecret = req.headers["x-admin-secret"];
    const expectedSecret = process.env.ADMIN_SECRET;

    if (expectedSecret && adminSecret !== expectedSecret) {
      console.warn(`Failed admin secret check for user ${userId}`);
      return res.status(403).json({ message: "Identifiants admin invalides" });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ message: "Échec autorisation admin" });
  }
};

// Fonction helper pour réponse process videos
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

// Supprimer utilisateur (admin)
app.delete("/api/admin/delete-user", requiresAdmin, async (req: Request, res: Response) => {
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
    return res.json({
      message: "User deleted successfully",
      deletedEmail: email,
      deletedUserId: user.id,
    });
  } catch (error) {
    console.error("[ADMIN] Error deleting user:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
});
    // Route support email
  app.post("/api/support/contact", requiresAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject, message, category } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      await sendSupportEmail({
        from: user.email,
        subject,
        message,
        category,
        userName: `${user.firstName} ${user.lastName}`,
      });

      res.json({ success: true, message: "Message de support envoyé avec succès" });
    } catch (error) {
      console.error("Error sending support email:", error);
      res.status(500).json({ message: "Échec envoi message support" });
    }
  });

  // Utilisateurs en ligne
  app.get("/api/online-users", requiresAuth, async (req: any, res) => {
    try {
      const onlineUsers = getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });

  // ===== ROUTES PANEL ADMIN =====
  app.use("/admin", adminRoutes);

  return app;
}return app;
});
