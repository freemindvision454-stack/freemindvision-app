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
