// lib/auth.js
// Server-side session helpers — Cafe QR Delivery App (Pages Router).
//
// REUSED FROM: cafeDeliveryFrontend/lib/auth.js (verifySessionToken is identical)
// ADAPTED:     getSessionFromReq() — Pages Router uses req.headers.cookie (string)
//              instead of req.headers.get('cookie') (App Router fetch API)
//
// EXPORTS:
//   verifySessionToken(token)      → { email, name, phone, iat } | null
//   getSessionFromReq(req)         → { email, name, phone } | null  (pages/api use)
//   getSessionFromCookies(cookies) → { email, name, phone } | null  (middleware use)

import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE   = 'delivery_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (account-based — longer than website)

/**
 * Verify a delivery_session token string.
 * Returns decoded payload { email, name, phone, iat } if valid, else null.
 */
export function verifySessionToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;

    const lastDot = token.lastIndexOf('.');
    if (lastDot === -1) return null;

    const payload     = token.slice(0, lastDot);
    const receivedSig = token.slice(lastDot + 1);

    const secret      = process.env.INTERNAL_API_SECRET || 'dev-secret-change-me';
    const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

    const received = Buffer.from(receivedSig, 'utf8');
    const expected = Buffer.from(expectedSig, 'utf8');
    if (received.length !== expected.length) return null;
    if (!timingSafeEqual(received, expected)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

    if (!decoded.iat || Date.now() - decoded.iat > SESSION_MAX_AGE_MS) return null;
    if (!decoded.email || typeof decoded.email !== 'string') return null;

    return {
      email: decoded.email,
      name:  decoded.name  || '',
      phone: decoded.phone || '',
      iat:   decoded.iat,
    };
  } catch {
    return null;
  }
}

/**
 * Extract and verify session from a Pages Router API route req object.
 * req.headers.cookie is a plain string in Pages Router.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ email: string, name: string, phone: string } | null}
 */
export function getSessionFromReq(req) {
  try {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${SESSION_COOKIE}=`));
    if (!match) return null;
    const token = match.slice(SESSION_COOKIE.length + 1);
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Extract and verify session from Next.js middleware RequestCookies.
 * (Used in middleware.js)
 *
 * @param {import('next/server').NextRequest['cookies']} cookies
 * @returns {{ email: string, name: string, phone: string } | null}
 */
export function getSessionFromCookies(cookies) {
  try {
    const token = cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Build a signed session token embedding email + name + phone.
 * base64(payload).HMAC-SHA256(payload, INTERNAL_API_SECRET)
 *
 * @param {{ email: string, name: string, phone: string }} user
 * @returns {string}
 */
export function buildSessionToken({ email, name, phone }) {
  const payload = Buffer.from(
    JSON.stringify({ email, name, phone, iat: Date.now() })
  ).toString('base64').replace(/=/g, '');

  const secret = process.env.INTERNAL_API_SECRET || 'dev-secret-change-me';
  const sig    = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/** Cookie name — exported so API routes stay DRY */
export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days in seconds
