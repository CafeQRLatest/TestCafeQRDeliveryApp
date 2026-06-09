// pages/api/auth/verify-otp.js
// Verifies the 6-digit OTP. On success:
//   1. Clears OTP from store (one-time use)
//   2. Sets a signed HttpOnly delivery_session cookie (30 days)
//
// For SIGNUP: expects { email, otp, name, phone } — embeds name+phone in token
// For LOGIN:  expects { email, otp } — name+phone looked up from client localStorage
//             (we embed them in the token if provided, otherwise empty strings)

import { otpStore }                                          from '@/lib/otpStore';
import { buildSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, otp, name = '', phone = '' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const record = otpStore.get(email);

    if (!record) {
      return res.status(404).json({ error: 'No OTP found. Please request a new one.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(410).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== String(otp)) {
      return res.status(401).json({ error: 'Incorrect OTP.' });
    }

    // ── Success ───────────────────────────────────────────────────────────────────
    otpStore.delete(email); // one-time use

    const token = buildSessionToken({ email, name, phone });

    // Set HttpOnly cookie — Pages Router uses res.setHeader
    const cookieValue = [
      `${SESSION_COOKIE_NAME}=${token}`,
      `Max-Age=${SESSION_MAX_AGE_SEC}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      process.env.APP_ENV !== 'development' ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieValue);
    return res.status(200).json({ verified: true, name, phone, email });
  } catch (err) {
    console.error('[verify-otp]', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
