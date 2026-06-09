import type { CapacitorConfig } from '@capacitor/cli';

// ─── Target: Test Delivery App ───────────────────────────────────────────────
// appId must match the Play Store listing: com.cafeqr.delivery.test
// To build production APK, create a separate capacitor.config.production.ts
// with appId: 'com.cafeqr.delivery' and appName: 'Cafe QR Delivery'
// ─────────────────────────────────────────────────────────────────────────────

const config: CapacitorConfig = {
  appId: 'com.cafeqr.delivery.test',
  appName: 'Cafe QR Delivery Test',
  webDir: 'out',
  android: { path: 'android' },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  server: {
    // ── Update this URL after deploying to Vercel ──────────────────────────
    // For production APK, switch to: 'https://cafe-delivery-app.vercel.app'
    url: 'https://cafe-delivery-app-test.vercel.app',
    androidScheme: 'https',
    allowNavigation: ['cafe-delivery-app-test.vercel.app'],
  },
};

export default config;
