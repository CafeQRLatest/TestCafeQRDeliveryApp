'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiMail, FiArrowRight, FiShield } from 'react-icons/fi';

// ── FCM token registration (best-effort, non-blocking) ──────────────────────
// Called once after a successful login. Registers the browser/device FCM token
// with the backend so the restaurant can send push notifications.
// Requires NEXT_PUBLIC_FIREBASE_* env vars and the service worker to be active.
async function registerFCMTokenAfterLogin() {
  try {
    // Guard: only run in browser with Notification API and service worker support
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) return;

    // Only register if permission is already granted — don't prompt on login
    // The user can grant permission from Profile → Notifications
    if (Notification.permission !== 'granted') return;

    // Dynamically import Firebase to avoid adding it to the initial page bundle
    const [{ initializeApp, getApps }, { getMessaging, getToken }] =
      await Promise.all([
        import('firebase/app'),
        import('firebase/messaging'),
      ]);

    const firebaseConfig = {
      apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Prevent duplicate app initialisation (hot-reload safe)
    const app = getApps().length > 0
      ? getApps()[0]
      : initializeApp(firebaseConfig);

    const messaging = getMessaging(app);

    // Register the service worker explicitly
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js'
    );

    const token = await getToken(messaging, {
      vapidKey:                    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration:   registration,
    });

    if (!token) return;

    // POST the token to our Next.js API route which proxies to Spring Boot
    await fetch('/api/notifications/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
  } catch (err) {
    // Non-fatal — FCM is best-effort. Log in dev, silent in prod.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[login] FCM registration skipped:', err.message);
    }
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { next = '/home' } = router.query;

  const [email,      setEmail]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [step,       setStep]       = useState('email'); // 'email' | 'otp'
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [countdown,  setCountdown]  = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      setStep('otp');
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // ── Register FCM token after successful login (best-effort) ────────────
      // Fire-and-forget: we don't await this so it never blocks navigation
      registerFCMTokenAfterLogin();

      router.replace(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Login — Cafe QR Delivery</title></Head>
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-brand-orange rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Cafe QR Delivery</h1>
          <p className="text-stone-400 text-sm mt-1">Sign in to order from your favourite restaurants</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6">

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email address</label>
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3.5 py-3">
                  <FiMail size={16} className="text-stone-400" />
                  <input
                    type="email" required autoFocus
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-transparent flex-1 text-sm text-stone-800 outline-none placeholder-stone-400"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit" disabled={loading || !email}
                className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <> Send OTP <FiArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-stone-400">
                New user?{' '}
                <button
                  type="button"
                  onClick={() => router.push(`/signup?next=${next}`)}
                  className="text-brand-orange font-semibold"
                >
                  Create account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FiShield size={22} className="text-brand-orange" />
                </div>
                <p className="text-sm text-stone-500">Enter the 6-digit code sent to</p>
                <p className="font-semibold text-stone-800 text-sm mt-0.5">{email}</p>
              </div>
              <div>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  required autoFocus
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="— — — — — —"
                  className="w-full text-center text-2xl font-bold tracking-widest bg-stone-100 rounded-xl py-4 outline-none text-stone-800 placeholder-stone-300"
                />
              </div>
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              <button
                type="submit" disabled={loading || otp.length < 6}
                className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Verify & Sign In'}
              </button>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-stone-400">Resend in {countdown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-brand-orange font-semibold"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                className="w-full text-xs text-stone-400 text-center mt-1"
              >
                ← Change email
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
