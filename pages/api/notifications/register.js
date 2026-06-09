// pages/api/notifications/register.js
// POST /api/notifications/register
//
// Registers a device FCM token with the backend so the restaurant can
// send push notifications to the customer's device.
//
// Architecture reference: CafeQR 2.0 Architecture doc, Section 4.3
// Backend endpoint: POST /api/delivery/fcm-tokens
//
// Request body:
//   { token: string }          — FCM device token from Firebase SDK
//   { clientId?: string }      — optional, stored for per-restaurant targeting
//
// Auth: requires delivery_session cookie (the customer must be logged in).

import { getSessionFromReq } from '@/lib/auth';
import { backendFetch }      from '@/lib/api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const { token, clientId } = req.body || {};

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    // Forward the FCM token to the Spring Boot backend
    await backendFetch(
      '/delivery/fcm-tokens',
      {
        method: 'POST',
        data: {
          token:    token.trim(),
          email:    session.email,
          phone:    session.phone || null,
          clientId: clientId || null,
          platform: 'WEB',  // 'WEB' | 'ANDROID' | 'IOS'
        },
      },
      req,
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Don't hard-fail the client — FCM token registration is best-effort.
    // Log the error server-side but return 200 to avoid blocking the user flow.
    console.error('[api/notifications/register] FCM token registration failed:', err.message);

    // Return 200 with ok: false so the caller knows it failed but can continue
    return res.status(200).json({ ok: false, error: err.message });
  }
}
