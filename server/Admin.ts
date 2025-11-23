import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { requiresAuth } from "./auth";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

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

// Liste des utilisateurs avec pagination et filtres
router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    console.log(`📊 Chargement des utilisateurs - Page: ${page}, Limit: ${limit}, Recherche: ${search}`);

    let usersList;
    let totalCount;

    if (search) {
      // Recherche d'utilisateurs
      const allUsers = await storage.getAllUsers();
      usersList = allUsers.filter(user => 
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(search.toLowerCase())
      ).slice(offset, offset + limit);
      
      totalCount = allUsers.length;
    } else {
      // Récupération paginée
      usersList = await storage.getAllUsers();
      totalCount = usersList.length;
      usersList = usersList.slice(offset, offset + limit);
    }

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

    // Récupérer les statistiques de l'utilisateur
    const userVideos = await storage.getUserVideos(userId);
    const userFollowers = await storage.getUserFollowers(userId);
    const userFollowing = await storage.getUserFollowing(userId);

    const userStats = {
      videosCount: userVideos.length,
      followersCount: userFollowers.length,
      followingCount: userFollowing.length,
      totalLikes: userVideos.reduce((sum, video) => sum + (video.likesCount || 0), 0),
      totalViews: userVideos.reduce((sum, video) => sum + (video.viewsCount || 0), 0),
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

// Statistiques de la plateforme
router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log("📈 Chargement des statistiques de la plateforme");

    const allUsers = await storage.getAllUsers();
    const allVideos = await storage.getVideos(1000); // Augmenter la limite pour les stats

    const stats = {
      totalUsers: allUsers.length,
      totalCreators: allUsers.filter(u => u.isCreator).length,
      totalVideos: allVideos.length,
      totalViews: allVideos.reduce((sum, video) => sum + (video.viewsCount || 0), 0),
      totalLikes: allVideos.reduce((sum, video) => sum + (video.likesCount || 0), 0),
      verifiedUsers: allUsers.filter(u => u.isVerified).length,
      adminUsers: allUsers.filter(u => u.isAdmin).length,
      recentSignups: allUsers.filter(u => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(u.createdAt) > weekAgo;
      }).length,
    };

    res.json(stats);
  } catch (err) {
    console.error("❌ Erreur chargement statistiques:", err);
    res.status(500).json({ error: "Erreur lors du chargement des statistiques" });
  }
});

export default router;
