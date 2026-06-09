// pages/api/auth/logout.js
// Clears the delivery_session cookie.

import { SESSION_COOKIE_NAME } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
  ]);
  return res.status(200).json({ loggedOut: true });
}
