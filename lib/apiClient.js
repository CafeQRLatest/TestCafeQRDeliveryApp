// lib/apiClient.js
// ─── Named Axios API Client ────────────────────────────────────────────────────
//
// This is the canonical Axios client for the Delivery App as described in the
// CafeQR 2.0 Architecture doc (Section 4.3).
//
// IMPORTANT ARCHITECTURAL NOTE:
//   All backend calls go through Next.js API routes (pages/api/**) — NOT
//   directly to the Spring Boot backend. The Android Capacitor APK runs at
//   origin `capacitor://localhost` which the backend does not whitelist.
//   Server-side API routes handle CORS and inject INTERNAL_API_SECRET.
//
// This file is a thin, named re-export of lib/api.js so that any code that
// imports from '@/lib/apiClient' (as referenced in architecture docs) works
// identically to importing from '@/lib/api'.
//
// USAGE:
//   import apiClient, { apiFetch, backendFetch } from '@/lib/apiClient';
//   const menu = await apiFetch('/menu/[clientId]');
//   const order = await apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });

export { apiFetch, backendFetch, getBackendUrl } from '@/lib/api';

// Default export: apiFetch — the primary client-side helper used in pages
export { apiFetch as default } from '@/lib/api';
