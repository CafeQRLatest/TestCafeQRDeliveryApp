'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiUser, FiPhone, FiMail, FiArrowRight, FiShield } from 'react-icons/fi';

export default function SignupPage() {
  const router = useRouter();
  const { next = '/home' } = router.query;

  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [step,     setStep]     = useState('details'); // 'details' | 'otp'
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [countdown,setCountdown]= useState(0);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Persist profile to localStorage for quick access on the client
      try {
        localStorage.setItem('cafeqr_user', JSON.stringify({ name, phone, email }));
      } catch {}
      router.replace(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Create Account — Cafe QR Delivery</title></Head>
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-brand-orange rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Create Account</h1>
          <p className="text-stone-400 text-sm mt-1">Join Cafe QR Delivery</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6">

          {step === 'details' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Full name</label>
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3.5 py-3">
                  <FiUser size={16} className="text-stone-400" />
                  <input
                    type="text" required autoFocus
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-transparent flex-1 text-sm text-stone-800 outline-none placeholder-stone-400"
                  />
                </div>
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Phone number</label>
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3.5 py-3">
                  <FiPhone size={16} className="text-stone-400" />
                  <input
                    type="tel" required
                    value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                    placeholder="+91 9876543210"
                    className="bg-transparent flex-1 text-sm text-stone-800 outline-none placeholder-stone-400"
                  />
                </div>
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email address</label>
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3.5 py-3">
                  <FiMail size={16} className="text-stone-400" />
                  <input
                    type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-transparent flex-1 text-sm text-stone-800 outline-none placeholder-stone-400"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit" disabled={loading || !name || !phone || !email}
                className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Send Verification Code <FiArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-stone-400">
                Already have an account?{' '}
                <button type="button" onClick={() => router.push(`/login?next=${next}`)} className="text-brand-orange font-semibold">Sign in</button>
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
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required autoFocus
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="— — — — — —"
                className="w-full text-center text-2xl font-bold tracking-widest bg-stone-100 rounded-xl py-4 outline-none text-stone-800 placeholder-stone-300"
              />
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              <button
                type="submit" disabled={loading || otp.length < 6}
                className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Verify & Create Account'}
              </button>
              <div className="text-center">
                {countdown > 0
                  ? <p className="text-xs text-stone-400">Resend in {countdown}s</p>
                  : <button type="button" onClick={handleSendOtp} className="text-xs text-brand-orange font-semibold">Resend OTP</button>}
              </div>
              <button type="button"
                onClick={() => { setStep('details'); setOtp(''); setError(''); }}
                className="w-full text-xs text-stone-400 text-center">
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
