// server/routes/admin.js
const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Liste vidéos (admin)
router.get('/videos', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(process.env.TABLE_NAME || 'freemimd_upload')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return res.status(500).json(error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Supprimer vidéo (et Cloudinary en option)
router.post('/videos/delete', requireAdmin, async (req, res) => {
  try {
    const { id, public_id } = req.body;
    if (!id && !public_id) return res.status(400).json({ error: 'id or public_id required' });

    if (id) {
      await supabase.from(process.env.TABLE_NAME || 'freemimd_upload').delete().eq('id', id);
    }

    if (public_id && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      await cloudinary.uploader.destroy(public_id, { resource_type: 'video' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// Bannir un utilisateur
router.post('/users/ban', requireAdmin, async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const { data, error } = await supabase
      .from('profiles')
      .update({ banned: true, banned_reason: reason || null })
      .eq('id', user_id);

    if (error) return res.status(500).json(error);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ban_failed' });
  }
});

// Liste utilisateurs
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email,role,banned')
      .limit(500);

    if (error) return res.status(500).json(error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Rapports (si table reports existe)
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return res.status(500).json(error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
