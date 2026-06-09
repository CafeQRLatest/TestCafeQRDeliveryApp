// lib/otpStore.js
// Shared in-memory OTP store — module-level singleton.
// Same pattern as cafeDeliveryFrontend/app/api/auth/send-otp/store.js
// but placed in lib/ so both send-otp and verify-otp pages/api routes
// import from the SAME Map instance.
//
// NOTE: In-memory store works on Vercel because each deployment
// uses a single serverless function warm instance per region.
// Across cold starts, OTPs are lost — users simply request a new one.

export const otpStore = new Map();
// Map<email, { otp: string, expiresAt: number }>
