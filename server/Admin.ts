import { Router, Request, Response } from "express";
import { storage } from "./storage.js"; // Ajout de l'extension
import { requiresAuth } from "./auth.js"; // Ajout de l'extension
import { db } from "./db.js"; // Ajout de l'extension
import { users, videos, follows } from "../shared/schema.js"; // Ajout de l'extension
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// Middleware admin sécurisé
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    // Vérifier l'authentification
    if (!(req as any).isAuthenticated || !(req as any).isAuthenticated()) {
      return res.status(401).json({ error: "Authentification requise" });
    }

    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non identifié" });
    }

    // Vérifier les privilèges admin
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      console.warn(`🚨 Tentative d'accès admin non autorisée par l'utilisateur: ${userId}`);
      return res.status(403).json({ error: "Privilèges administrateur requis" });
    }

    // Vérification supplémentaire avec secret admin
    const adminSecret = req.headers["x-admin-secret"];
    const expectedSecret = process.env.ADMIN_SECRET;

    if (expectedSecret && adminSecret !== expectedSecret) {
      console.warn(`🚨 Secret admin invalide pour l'utilisateur: ${userId}`);
      return res.status(403).json({ error: "Clé d'administration invalide" });
    }

    console.log(`✅ Accès admin autorisé pour: ${user.email}`);
    next();
  } catch (error) {
    console.error("❌ Erreur middleware admin:", error);
    res.status(500).json({ error: "Erreur de vérification administrateur" });
  }
};

// Liste des utilisateurs avec pagination
router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    console.log(`📊 Chargement des utilisateurs - Page: ${page}, Limit: ${limit}`);

    // Récupération directe depuis la base de données
    const usersList = await db.select().from(users).limit(limit).offset(offset);
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalCount = totalResult[0]?.count || 0;

    res.json({
      users: usersList,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error("❌ Erreur chargement utilisateurs:", err);
    res.status(500).json({ error: "Erreur lors du chargement des utilisateurs" });
  }
});

// Obtenir les détails d'un utilisateur spécifique
router.get("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    console.log(`👤 Chargement détails utilisateur: ${userId}`);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Récupérer les vidéos de l'utilisateur
    const userVideos = await db.select().from(videos).where(eq(videos.creatorId, userId));

    // Récupérer les followers (personnes qui suivent cet utilisateur)
    const userFollowers = await db.select()
      .from(follows)
      .where(eq(follows.followingId, userId));

    // Récupérer les following (personnes que cet utilisateur suit)
    const userFollowing = await db.select()
      .from(follows)
      .where(eq(follows.followerId, userId));

    // Calculer les statistiques
    const totalLikes = userVideos.reduce((sum: number, video: any) => sum + (video.likesCount || 0), 0);
    const totalViews = userVideos.reduce((sum: number, video: any) => sum + (video.viewsCount || 0), 0);

    const userStats = {
      videosCount: userVideos.length,
      followersCount: userFollowers.length,
      followingCount: userFollowing.length,
      totalLikes,
      totalViews,
    };

    res.json({
      user,
      stats: userStats,
      videos: userVideos.slice(0, 10) // 10 dernières vidéos
    });
  } catch (err) {
    console.error("❌ Erreur chargement détails utilisateur:", err);
    res.status(500).json({ error: "Erreur lors du chargement des détails utilisateur" });
  }
});

// Supprimer un utilisateur
router.delete("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const adminUserId = (req as any).user?.id || (req as any).user?.claims?.sub;

    console.log(`🗑️  Suppression utilisateur ${userId} par admin ${adminUserId}`);

    // Empêcher l'auto-suppression
    if (userId === adminUserId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte administrateur" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Log de sécurité
    console.log(`🔒 Suppression de l'utilisateur: ${user.email} (${userId}) par admin: ${adminUserId}`);

    // Supprimer l'utilisateur de la base de données
    await db.delete(users).where(eq(users.id, userId));

    console.log(`✅ Utilisateur supprimé avec succès: ${user.email}`);
    
    res.json({ 
      message: "Utilisateur supprimé avec succès",
      deletedUser: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (err) {
    console.error("❌ Erreur suppression utilisateur:", err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur" });
  }
});

// Mettre à jour le statut d'un utilisateur
router.patch("/users/:id/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { isActive, isVerified, isCreator, isAdmin } = req.body;

    console.log(`⚡ Mise à jour statut utilisateur ${userId}:`, req.body);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const updatedUser = await storage.upsertUser({
      ...user,
      isActive: isActive !== undefined ? isActive : user.isActive,
      isVerified: isVerified !== undefined ? isVerified : user.isVerified,
      isCreator: isCreator !== undefined ? isCreator : user.isCreator,
      isAdmin: isAdmin !== undefined ? isAdmin : user.isAdmin,
    });

    console.log(`✅ Statut utilisateur mis à jour: ${user.email}`);
    
    res.json({ 
      message: "Statut utilisateur mis à jour avec succès",
      user: updatedUser
    });
  } catch (err) {
    console.error("❌ Erreur mise à jour statut utilisateur:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut utilisateur" });
  }
});

// Recherche d'utilisateurs
router.get("/users-search", requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log(`🔍 Recherche d'utilisateurs: "${search}"`);

    if (!search || search.trim().length < 2) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${search.toLowerCase()}%`;

    // Recherche dans la base de données
    const usersList = await db.select()
      .from(users)
      .where(
        sql`LOWER(${users.email}) LIKE ${searchTerm} OR 
            LOWER(${users.firstName}) LIKE ${searchTerm} OR 
            LOWER(${users.lastName}) LIKE ${searchTerm}`
      )
      .limit(limit);

    res.json({ users: usersList });
  } catch (err) {
    console.error("❌ Erreur recherche utilisateurs:", err);
    res.status(500).json({ error: "Erreur lors de la recherche d'utilisateurs" });
  }
});

// Statistiques de la plateforme
router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log("📈 Chargement des statistiques de la plateforme");

    // Récupération directe depuis la base
    const allUsers = await db.select().from(users);
    const allVideos = await db.select().from(videos);

    const totalViews = allVideos.reduce((sum: number, video: any) => sum + (video.viewsCount || 0), 0);
    const totalLikes = allVideos.reduce((sum: number, video: any) => sum + (video.likesCount || 0), 0);

    const stats = {
      totalUsers: allUsers.length,
      totalCreators: allUsers.filter((user: any) => user.isCreator).length,
      totalVideos: allVideos.length,
      totalViews,
      totalLikes,
      verifiedUsers: allUsers.filter((user: any) => user.isVerified).length,
      adminUsers: allUsers.filter((user: any) => user.isAdmin).length,
      recentSignups: allUsers.filter((user: any) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(user.createdAt) > weekAgo;
      }).length,
    };

    res.json(stats);
  } catch (err) {
    console.error("❌ Erreur chargement statistiques:", err);
    res.status(500).json({ error: "Erreur lors du chargement des statistiques" });
  }
});

export default router;
