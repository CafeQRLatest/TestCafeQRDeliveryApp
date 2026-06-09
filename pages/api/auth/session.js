// pages/api/auth/session.js
// Returns current session info (email, name, phone) if the cookie is valid.
// Called on app boot to decide whether to show home or login.

import { getSessionFromReq } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionFromReq(req);
  if (!session) return res.status(401).json({ authenticated: false });

  return res.status(200).json({
    authenticated: true,
    email: session.email,
    name:  session.name,
    phone: session.phone,
  });
}
