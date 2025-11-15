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
  }
}
