// pages/_document.js
// Custom Document — injects Firebase config into the window and service-worker
// scope so firebase-messaging-sw.js can initialise without a build step.
//
// Firebase client-side config keys are NEXT_PUBLIC_* (safe to expose —
// they are published in the browser bundle anyway by the Firebase SDK itself).
// The service worker reads self.__FIREBASE_CONFIG before calling initializeApp.

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Build the Firebase config object from NEXT_PUBLIC_* env vars.
  // These are resolved at build time (Next.js replaces process.env.NEXT_PUBLIC_*).
  // The object is serialised as a <script> tag so it is available to the SW.
  const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || '',
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || '',
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || '',
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '',
  };

  // Only inject the config block if a valid apiKey is present
  // (avoids a broken initializeApp call in development without Firebase set up)
  const hasFirebase = Boolean(firebaseConfig.apiKey);

  return (
    <Html lang="en">
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F97316" />
        <meta name="application-name" content="Cafe QR Delivery" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cafe QR Delivery" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Inter font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/*
          Inject Firebase config into the window AND into the service worker scope.

          How it works:
            1. This script sets window.__FIREBASE_CONFIG and self.__FIREBASE_CONFIG.
            2. When firebase-messaging-sw.js is registered, it reads self.__FIREBASE_CONFIG
               BEFORE calling firebase.initializeApp().
            3. The VAPID key is passed separately at getToken() call time from the
               page (NEXT_PUBLIC_FIREBASE_VAPID_KEY), not needed in the SW config.

          Security:
            All NEXT_PUBLIC_* values are already exposed in the JS bundle —
            embedding them here is no different from using initializeApp() directly.
        */}
        {hasFirebase && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
(function() {
  var cfg = ${JSON.stringify(firebaseConfig)};
  // Available to page scripts
  window.__FIREBASE_CONFIG = cfg;
  // Available to service workers on this origin
  if (typeof self !== 'undefined') { self.__FIREBASE_CONFIG = cfg; }
  // Post config to any active service workers
  if (navigator && navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(function(reg) {
      if (reg && reg.active) {
        reg.active.postMessage({ type: 'FIREBASE_CONFIG', config: cfg });
      }
    }).catch(function() {});
  }
})();
              `.trim(),
            }}
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
