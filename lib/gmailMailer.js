/**
 * gmailMailer.js — Transactional email via Gmail API (OAuth2)
 * SERVER-SIDE ONLY. Import only in pages/api/ routes.
 *
 * Identical to cafeDeliveryFrontend/lib/gmailMailer.js.
 * Reused without changes — same Gmail OAuth2 credentials can be shared.
 *
 * Required env vars (set in Vercel + .env.local):
 *   GMAIL_CLIENT_ID
 *   GMAIL_CLIENT_SECRET
 *   GMAIL_REDIRECT_URI
 *   GMAIL_REFRESH_TOKEN
 *   GMAIL_SENDER_ADDRESS
 */
import { google } from 'googleapis';

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return oauth2Client;
}

function buildRawEmail({ to, subject, htmlBody, textBody }) {
  const from     = process.env.GMAIL_SENDER_ADDRESS;
  const boundary = `----=_Part_${Date.now()}`;
  const lines = [
    `From: CafeQR <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textBody || subject,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ];
  const raw = lines.join('\r\n');
  return Buffer.from(raw).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendEmail({ to, subject, htmlBody, textBody }) {
  const auth  = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });
  const raw   = buildRawEmail({ to, subject, htmlBody, textBody });
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
  return { messageId: response.data.id };
}
