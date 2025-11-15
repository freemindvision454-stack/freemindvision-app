
// server/lib/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendSupportEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.SUPPORT_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendSupportEmail };
