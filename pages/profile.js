// pages/profile.js
// Account & Profile page for the Delivery App.
//
// Shows:
//   • Logged-in user's email (from delivery_session cookie via /api/auth/session)
//   • My Orders shortcut
//   • App version info
//   • Logout button
//
// Protected route — middleware.js redirects unauthenticated users to /login.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  FiUser, FiMail, FiShoppingBag, FiLogOut,
  FiChevronRight, FiInfo, FiBell,
} from 'react-icons/fi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function MenuItem({ icon: Icon, label, sublabel, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3.5',
        'active:bg-stone-50 transition-colors text-left',
        danger ? 'border-red-100' : '',
      ].join(' ')}
    >
      <div className={[
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        danger ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-brand-orange',
      ].join(' ')}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-red-600' : 'text-stone-900'}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{sublabel}</p>
        )}
      </div>
      {!danger && <FiChevronRight size={16} className="text-stone-300 flex-shrink-0" />}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load session info ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.replace('/login');
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'You';
  const initials = displayName.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <Head><title>Profile | Cafe QR Delivery</title></Head>

      <div className="min-h-screen bg-stone-50 pb-28">

        {/* Header */}
        <div className="bg-white border-b border-stone-100 px-5 pt-14 pb-5">
          <h1 className="text-lg font-bold text-stone-900 mb-4">My Account</h1>

          {/* Avatar + name card */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-orange flex items-center justify-center flex-shrink-0 shadow">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {initials || <FiUser size={22} />}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-900 text-base truncate">
                {loading ? '...' : displayName}
              </p>
              {user?.email && (
                <p className="text-sm text-stone-400 truncate mt-0.5 flex items-center gap-1">
                  <FiMail size={12} />
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="px-4 pt-5 space-y-2.5">

          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider px-1 mb-2">
            Orders
          </p>

          <MenuItem
            icon={FiShoppingBag}
            label="My Orders"
            sublabel="View your delivery history"
            onClick={() => router.push('/orders')}
          />

          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider px-1 mt-4 mb-2">
            Account
          </p>

          <MenuItem
            icon={FiBell}
            label="Notifications"
            sublabel="Order status updates"
            onClick={() => {
              if (typeof window !== 'undefined' && 'Notification' in window) {
                Notification.requestPermission();
              }
            }}
          />

          <MenuItem
            icon={FiInfo}
            label="About"
            sublabel="Cafe QR Delivery · Test v1.0"
            onClick={() => {}}
          />

          <div className="pt-2">
            <MenuItem
              icon={FiLogOut}
              label="Sign Out"
              onClick={handleLogout}
              danger
            />
          </div>

        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-stone-300">
          <p>Cafe QR Delivery · Test Build</p>
          <p className="mt-0.5">© 2026 CafeQR</p>
        </div>

      </div>
    </>
  );
}
