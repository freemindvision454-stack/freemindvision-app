
const express = require('express');
const router = express.Router();
const { sendSupportEmail } = require('../lib/email');

router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    await sendSupportEmail({
      to: process.env.SUPPORT_EMAIL,
      subject: `Support request from ${name || email}`,
      html: `<p>${message}</p><p>From: ${email}</p>`
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'email_failed' });
  }
});

module.exports = router;
