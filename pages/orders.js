// pages/orders.js
// My Orders — lists all past/active orders for the logged-in customer.
//
// Data from GET /api/orders/list?clientId=<optional> which proxies to the
// Spring Boot backend. Protected by middleware (delivery_session cookie).
//
// Each order card links to /<clientId>/orders/<orderId> for full detail.

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/router';
import Head                    from 'next/head';
import {
  FiShoppingBag, FiAlertCircle, FiChevronRight, FiRefreshCw,
} from 'react-icons/fi';
import { apiFetch } from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(iso));
  } catch { return iso; }
}

const STATUS_STYLES = {
  COMPLETED:  { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Delivered'      },
  PAID:       { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Delivered'      },
  SETTLED:    { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Delivered'      },
  CANCELLED:  { bg: 'bg-red-50',     text: 'text-red-600',    label: 'Cancelled'      },
  VOID:       { bg: 'bg-red-50',     text: 'text-red-600',    label: 'Cancelled'      },
  DISPATCHED: { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Out for Delivery' },
  BILLED:     { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Out for Delivery' },
  PROCESSING: { bg: 'bg-orange-50',  text: 'text-orange-700', label: 'Preparing'      },
  IN_PROGRESS:{ bg: 'bg-orange-50',  text: 'text-orange-700', label: 'Preparing'      },
  CONFIRMED:  { bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'Confirmed'      },
  PENDING:    { bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'Pending'        },
};

function statusStyle(status) {
  return STATUS_STYLES[(status || '').toUpperCase()] || {
    bg: 'bg-stone-100', text: 'text-stone-500', label: status || 'Unknown',
  };
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3.5 bg-stone-100 rounded w-1/3" />
        <div className="h-5 bg-stone-100 rounded-full w-20" />
      </div>
      <div className="h-3 bg-stone-100 rounded w-1/2" />
      <div className="h-3 bg-stone-100 rounded w-1/4" />
    </div>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }) {
  const style = statusStyle(order.orderStatus);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-stone-900 truncate">
              {order.orderNo ? `Order #${order.orderNo}` : `Order ${order.orderId?.slice(0, 8)}…`}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
          {order.orderDate && (
            <p className="text-xs text-stone-400">{formatDate(order.orderDate)}</p>
          )}
          {order.lines?.length > 0 && (
            <p className="text-xs text-stone-500 mt-1 truncate">
              {order.lines.slice(0, 3).map(l => l.productName).join(', ')}
              {order.lines.length > 3 ? ` +${order.lines.length - 3} more` : ''}
            </p>
          )}
          <p className="text-sm font-bold text-brand-orange mt-1.5">
            {formatPrice(order.grandTotal ?? order.totalAmount ?? 0)}
          </p>
        </div>
        <FiChevronRight size={16} className="text-stone-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/orders/list');
      setOrders(Array.isArray(data) ? data : (data?.orders ?? []));
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  function handleOrderClick(order) {
    if (order.clientId && order.orderId) {
      router.push(`/${order.clientId}/orders/${order.orderId}`);
    }
  }

  return (
    <>
      <Head><title>My Orders | Cafe QR Delivery</title></Head>

      <div className="min-h-screen bg-stone-50 pb-28">

        {/* Header */}
        <div className="bg-white border-b border-stone-100 px-5 pt-14 pb-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-stone-900">My Orders</h1>
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200 disabled:opacity-40"
            >
              <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-3">

          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <FiAlertCircle size={22} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-stone-700 text-sm">Could not load orders</p>
                <p className="text-stone-400 text-xs mt-1">{error}</p>
              </div>
              <button
                onClick={fetchOrders}
                className="bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
                <FiShoppingBag size={26} className="text-brand-orange" />
              </div>
              <div>
                <p className="font-semibold text-stone-700 text-sm">No orders yet</p>
                <p className="text-stone-400 text-xs mt-1">Your order history will appear here</p>
              </div>
              <button
                onClick={() => router.push('/home')}
                className="bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-1"
              >
                Browse Restaurants
              </button>
            </div>
          )}

          {!loading && !error && orders.map(order => (
            <OrderCard
              key={order.orderId || order.id}
              order={order}
              onClick={() => handleOrderClick(order)}
            />
          ))}

        </div>
      </div>
    </>
  );
}
