module.exports = function requireAdmin(req, res, next) {
    try {
        // Vérifier si l'utilisateur est connecté
        if (!req.user) {
            return res.status(401).json({ error: 'not_authenticated' });
        }

        // Vérifier si l'utilisateur est admin
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'admin_only' });
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server_error' });
    }
};
if (!user.isAdmin) return res.status(403).json({ error: "Forbidden" });
// server/middleware/requireAdmin.js
export default function requireAdmin(req, res, next) {
  try {
    // utilisateur injecté par ton middleware d'auth
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    // Selon ta base Supabase : is_admin ou role === "admin"
    if (!user.is_admin && user.role !== "admin") {
      return res.status(403).json({ error: "Accès interdit : admin uniquement" });
    }

    next();
  } catch (err) {
    console.error("Erreur middleware admin:", err);
    res.status(500).json({ error: "Erreur interne admin" });
  }}
// server/routes/admin.js
import express from "express";
import requireAdmin from "../middleware/requireAdmin.js";
import supabase from "../supabaseClient.js";

const router = express.Router();

// Protéger toutes les routes admin
router.use(requireAdmin);

// -------------------------------
// LISTE UTILISATEURS
// -------------------------------
router.get("/users", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("id", { ascending: true });

  if (error) return res.status(400).json(error);
  res.json(data);
});

// -------------------------------
// BANNIR USER
// -------------------------------
router.post("/ban/:id", async (req, res) => {
  const id = req.params.id;

  const { error } = await supabase
    .from("users")
    .update({ banned: true })
    .eq("id", id);

  if (error) return res.status(400).json(error);
  res.json({ success: true });
});

// -------------------------------
// SUPPRIMER USER
// -------------------------------
router.delete("/delete/:id", async (req, res) => {
  const id = req.params.id;

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json(error);
  res.json({ success: true });
});

// -------------------------------
// LISTE VIDÉOS
// -------------------------------
router.get("/videos", async (req, res) => {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json(error);
  res.json(data);
});

// -------------------------------
// BOOSTER VIDÉO
// -------------------------------
router.post("/boost/:id", async (req, res) => {
  const id = req.params.id;

  const { error } = await supabase
    .from("videos")
    .update({ boosted: true })
    .eq("id", id);

  if (error) return res.status(400).json(error);
  res.json({ success: true });
});

// -------------------------------
// SIGNALEMENTS
// -------------------------------
router.get("/reports", async (req, res) => {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json(error);
  res.json(data);
});

export default router;
