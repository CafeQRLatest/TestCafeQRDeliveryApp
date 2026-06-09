// public/firebase-messaging-sw.js
// ─── Firebase Cloud Messaging Service Worker ───────────────────────────────────
//
// This file MUST be at the root of the public directory so it is served at
// https://<your-domain>/firebase-messaging-sw.js
//
// It handles BACKGROUND push notifications when the app is not in the foreground.
// Foreground notifications are handled in the app via PushNotifications (Capacitor)
// or onMessage() in the Firebase web SDK.
//
// Architecture reference: CafeQR 2.0 Architecture doc, Section 4 (Firebase FCM).
//
// ── How to wire this up ────────────────────────────────────────────────────────
// In your page or _app.js, after user logs in:
//
//   import { initializeApp } from 'firebase/app';
//   import { getMessaging, getToken, onMessage } from 'firebase/messaging';
//
//   const app = initializeApp({ ...firebaseConfig });
//   const messaging = getMessaging(app);
//
//   // Register service worker
//   const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
//
//   // Get FCM token
//   const token = await getToken(messaging, {
//     vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
//     serviceWorkerRegistration: registration,
//   });
//
//   // Send token to backend via POST /api/notifications/register
//   await fetch('/api/notifications/register', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ token }),
//   });
//
//   // Handle foreground messages
//   onMessage(messaging, (payload) => {
//     console.log('Foreground message:', payload);
//     // Show in-app toast/notification here
//   });
// ──────────────────────────────────────────────────────────────────────────────

// Firebase app version — must match the version in your package.json
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Firebase config — pulled from self.__FIREBASE_CONFIG injected at runtime ──
// The config is injected by the app when it registers this service worker.
// See _document.js or _app.js to inject: self.__FIREBASE_CONFIG = { apiKey, ... }
//
// Fallback: if config is not injected, the SW will silently skip initialisation
// (avoids hard crashes during development without Firebase configured).

const firebaseConfig = self.__FIREBASE_CONFIG || null;

if (firebaseConfig && firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw] Background message received:', payload);

    const notificationTitle =
      payload.notification?.title ||
      payload.data?.title ||
      'Cafe QR Delivery';

    const notificationOptions = {
      body:
        payload.notification?.body ||
        payload.data?.body ||
        'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: payload.data?.orderId || 'cafeqr-notification',
      data: payload.data || {},
      // Vibrate pattern for Android
      vibrate: [200, 100, 200],
      requireInteraction:
        payload.data?.requireInteraction === 'true',
    };

    return self.registration.showNotification(
      notificationTitle,
      notificationOptions
    );
  });

  // Handle notification click — open/focus app and navigate to the order
  self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const data = event.notification.data || {};
    const orderId  = data.orderId;
    const clientId = data.clientId;

    // Build target URL
    const targetUrl = orderId && clientId
      ? `/${clientId}/orders/${orderId}`
      : '/';

    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          // If app window already open, focus it and navigate
          for (const client of clientList) {
            if (client.url && 'focus' in client) {
              client.focus();
              if ('navigate' in client) {
                client.navigate(targetUrl);
              }
              return;
            }
          }
          // Otherwise open new window
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        })
    );
  });
} else {
  console.log('[firebase-messaging-sw] No Firebase config — notifications disabled');
}
