# Cafe QR Delivery App

Multi-restaurant customer ordering app — PWA + Android (Capacitor).

## Repos in this ecosystem

| Repo | Purpose |
|---|---|
| `cafeTestQRFrontend` | Restaurant owner / POS app (test) |
| `cafeTestQRBackend` | Java backend (test) |
| `cafeDeliveryFrontend` | Single-restaurant ordering website |
| **`cafeDeliveryApp`** | **This repo — multi-restaurant customer app** |

## App IDs

| Build | `appId` | `appName` |
|---|---|---|
| This repo (test) | `com.cafeqr.delivery.test` | Cafe QR Delivery Test |
| Production (future) | `com.cafeqr.delivery` | Cafe QR Delivery |

## Quick Start

```bash
npm install
npm run dev
```

## Android APK Build

```bash
# 1. Static export
npm run build:native

# 2. Sync to Android
npm run cap:sync:android

# 3. Open in Android Studio
npm run cap:open:android
```

## Environment Variables

Copy `.env.example` → `.env.local` and fill in values.

## Build Steps

- [x] Step 1 — Scaffold (Next.js 14 + Tailwind + Capacitor)
- [ ] Step 2 — Auth (signup, login, OTP, persistent JWT session)
- [ ] Step 3 — Home feed (restaurant listing filtered by Online Delivery flag)
- [ ] Step 4 — Restaurant menu page
- [ ] Step 5 — Cart + Checkout
- [ ] Step 6 — Order tracking
- [ ] Step 7 — Order history + Profile
- [ ] Step 8 — Capacitor Android build + PWA manifest icons
