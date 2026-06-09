// pages/[clientId]/orders/[orderId].js
// Order Detail & Live Tracking screen
//
// Shows the full detail of a single order with LIVE STATUS POLLING.
//   • Delivery progress stepper (4 steps)
//   • Auto-polls every 15 seconds until the order reaches a terminal state
//     (COMPLETED / PAID / CANCELLED / VOID)
//   • Items ordered with qty × price per line
//   • Price breakdown
//   • Delivery address card
//   • Payment method + status
//   • Customer name / phone
//
// Data from GET /api/orders/<orderId>?clientId=<uuid>
// which proxies to the Java backend GET /api/v1/orders/{id}.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter }           from 'next/router';
import Head                    from 'next/head';
import {
  FiArrowLeft, FiMapPin, FiUser, FiPhone,
  FiDollarSign, FiSmartphone, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';
import { apiFetch }  from '@/lib/api';
import { useCart }   from '@/components/CartContext';
import {
  orderStatusToStep,
  orderStatusLabel,
  isTerminalStatus,
  extractDeliveryAddress,
} from '@/lib/deliveryHelpers';

// ── Delivery progress stepper config ──────────────────────────────────────────

const STEPS = [
  { key: 'placed',   emoji: '\uD83D\uDCDD', label: 'Order Placed',    sub: 'Kitchen notified'        },
  { key: 'prep',     emoji: '\uD83C\uDF73', label: 'Preparing',       sub: 'Your food is being made'  },
  { key: 'dispatch', emoji: '\uD83D\uDEF5', label: 'Out for Delivery', sub: 'Rider is on the way'     },
  { key: 'done',     emoji: '\u2705',       label: 'Delivered',        sub: 'Enjoy your meal!'        },
];

// Auto-poll interval (ms) — 15 seconds while order is active
const POLL_INTERVAL_MS = 15_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      {title && (
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// 4-step visual stepper with animated fill line
function DeliveryTracker({ step, polling }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Delivery Progress
        </p>
        {polling && (
          <span className="flex items-center gap-1 text-[10px] text-brand-orange font-semibold">
            <FiRefreshCw size={10} className="animate-spin" />
            Live
          </span>
        )}
      </div>

      <div className="relative">
        {/* Background connector */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-stone-100" />
        {/* Filled progress connector */}
        <div
          className="absolute top-5 left-5 h-0.5 bg-brand-orange transition-all duration-700 ease-in-out"
          style={{ width: step <= 0 ? '0%' : `${(step / (STEPS.length - 1)) * 100}%` }}
        />

        <div className="relative flex justify-between">
          {STEPS.map((s, idx) => {
            const done    = step >= idx;
            const current = step === idx;
            return (
              <div key={s.key} className="flex flex-col items-center w-16">
                <div className={[
                  'w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all duration-500',
                  done
                    ? 'bg-brand-orange text-white shadow-md'
                    : 'bg-stone-100 text-stone-300',
                  current ? 'ring-4 ring-orange-100' : '',
                ].join(' ')}>
                  {s.emoji}
                </div>
                <p className={`text-xs font-semibold mt-2 text-center leading-tight ${
                  done ? 'text-stone-800' : 'text-stone-300'
                }`}>
                  {s.label}
                </p>
                {current && (
                  <p className="text-[10px] text-brand-orange text-center mt-0.5 leading-tight">
                    {s.sub}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CancelledBanner() {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
      <FiAlertCircle size={20} className="text-red-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-red-700">Order Cancelled</p>
        <p className="text-xs text-red-500 mt-0.5">
          This order was cancelled and will not be delivered.
        </p>
      </div>
    </div>
  );
}

function PriceRow({ label, value, bold = false, highlight = false }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className={`text-sm ${bold ? 'font-bold text-stone-900' : 'text-stone-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${
        highlight ? 'text-brand-orange text-base font-bold' :
        bold      ? 'text-stone-900' : 'text-stone-700'
      }`}>
        {value}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl p-5 space-y-3">
        <div className="h-3 bg-stone-100 rounded w-1/3" />
        <div className="flex justify-between mt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-stone-100" />
              <div className="h-2.5 bg-stone-100 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 space-y-2">
          <div className="h-3 bg-stone-100 rounded w-1/4" />
          <div className="h-3 bg-stone-100 rounded w-3/4" />
          <div className="h-3 bg-stone-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const router  = useRouter();
  const { clientId, orderId } = router.query;
  const { clientName } = useCart();

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [polling, setPolling] = useState(false);

  const pollTimerRef = useRef(null);

  // ── Fetch order ────────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async (silent = false) => {
    if (!orderId || !clientId) return;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const data = await apiFetch(`/orders/${orderId}`, { params: { clientId } });
      setOrder(data);
      setError(null);
      return data;
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load order');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId, clientId]);

  // ── Initial fetch + start polling ─────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !orderId || !clientId) return;

    // Initial load
    fetchOrder(false).then(data => {
      if (!data) return;
      // Only start polling if order is not yet in a terminal state
      if (!isTerminalStatus(data.orderStatus)) {
        setPolling(true);
      }
    });

    return () => {
      // Cleanup on unmount
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, orderId, clientId]);

  // ── Polling loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!polling) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      const data = await fetchOrder(true); // silent = don't show loading spinner
      if (!data) return;

      // Stop polling once the order reaches a terminal state
      if (isTerminalStatus(data.orderStatus)) {
        setPolling(false);
        clearInterval(pollTimerRef.current);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollTimerRef.current);
  }, [polling, fetchOrder]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const step        = order ? orderStatusToStep(order.orderStatus) : 0;
  const isCancelled = step === -1;
  const address     = order ? extractDeliveryAddress(order.description) : '';
  const paymentIcon  = order?.paymentMethod === 'UPI' ? FiSmartphone : FiDollarSign;
  const paymentLabel = order?.paymentMethod === 'UPI' ? 'UPI on Delivery' : 'Cash on Delivery';
  const statusLabel  = order ? orderStatusLabel(order.orderStatus) : '';

  return (
    <>
      <Head>
        <title>
          {order?.orderNo ? `Order ${order.orderNo}` : 'Order Detail'}
          {clientName ? ` | ${clientName}` : ' | Cafe QR Delivery'}
        </title>
      </Head>

      <div className="min-h-screen bg-stone-50 pb-10">

        {/* Header */}
        <div className="bg-white border-b border-stone-100 px-4 pt-12 pb-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-stone-900 text-base">
                {order?.orderNo ? `Order ${order.orderNo}` : 'Order Detail'}
              </h1>
              <div className="flex items-center gap-2">
                {order?.orderDate && (
                  <p className="text-xs text-stone-400">{formatDate(order.orderDate)}</p>
                )}
                {statusLabel && (
                  <span className="text-[10px] font-semibold bg-orange-50 text-brand-orange px-2 py-0.5 rounded-full">
                    {statusLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Manual refresh button */}
            <button
              type="button"
              onClick={() => fetchOrder(false)}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center disabled:opacity-40"
            >
              <FiRefreshCw size={15} className={loading && !polling ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">

          {loading && !order && <Skeleton />}

          {!loading && error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-4">
              <FiAlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {order && (
            <>
              {/* Cancelled banner OR delivery tracker */}
              {isCancelled
                ? <CancelledBanner />
                : <DeliveryTracker step={step} polling={polling} />
              }

              {/* Items */}
              <SectionCard title="Items Ordered">
                {order.lines.length === 0 && (
                  <p className="text-sm text-stone-400">No items found.</p>
                )}
                {order.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2.5 border-b border-stone-50 last:border-0"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {line.productName}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {formatPrice(line.unitPrice)} × {line.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-stone-900 flex-shrink-0">
                      {formatPrice(line.lineTotal)}
                    </p>
                  </div>
                ))}
              </SectionCard>

              {/* Price breakdown */}
              <SectionCard title="Price Breakdown">
                <PriceRow label="Subtotal" value={formatPrice(order.totalAmount)} />
                {order.totalDiscountAmount > 0 && (
                  <PriceRow
                    label="Discount"
                    value={`− ${formatPrice(order.totalDiscountAmount)}`}
                  />
                )}
                {order.totalTaxAmount > 0 && (
                  <PriceRow label="Tax" value={formatPrice(order.totalTaxAmount)} />
                )}
                <div className="border-t border-stone-100 mt-1 pt-1">
                  <PriceRow
                    label="Total Payable"
                    value={formatPrice(order.grandTotal)}
                    bold highlight
                  />
                </div>
              </SectionCard>

              {/* Delivery address */}
              {address && (
                <SectionCard title="Delivery Address">
                  <div className="flex items-start gap-2">
                    <FiMapPin size={15} className="text-brand-orange mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-stone-700 leading-relaxed">{address}</p>
                  </div>
                </SectionCard>
              )}

              {/* Payment */}
              <SectionCard title="Payment">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                    {order.paymentMethod === 'UPI'
                      ? <FiSmartphone size={16} className="text-brand-orange" />
                      : <FiDollarSign  size={16} className="text-brand-orange" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-900">{paymentLabel}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Status:{' '}
                      <span className={`font-semibold ${
                        order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-500'
                      }`}>
                        {order.paymentStatus === 'PAID' ? 'Paid' : 'Pending'}
                      </span>
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Customer */}
              {order.customer && (
                <SectionCard title="Delivered To">
                  <div className="space-y-2">
                    {order.customer.name && (
                      <div className="flex items-center gap-2">
                        <FiUser size={14} className="text-stone-400 flex-shrink-0" />
                        <p className="text-sm text-stone-700">{order.customer.name}</p>
                      </div>
                    )}
                    {order.customer.phone && (
                      <div className="flex items-center gap-2">
                        <FiPhone size={14} className="text-stone-400 flex-shrink-0" />
                        <p className="text-sm text-stone-700">{order.customer.phone}</p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Live tracking note */}
              {polling && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <FiRefreshCw size={13} className="text-brand-orange animate-spin flex-shrink-0" />
                  <p className="text-xs text-orange-700 font-medium">
                    Tracking your order live — updating every 15 seconds
                  </p>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </>
  );
}
