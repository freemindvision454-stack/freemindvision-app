
import { Router } from "express";
import requireAdmin from "./requireAdmin.js";

const router = Router();

// Liste des utilisateurs
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await req.db.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du chargement des utilisateurs." });
  }
});

// Supprimer un utilisateur
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    await req.db.user.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "Utilisateur supprimé." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
