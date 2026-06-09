// lib/deliveryHelpers.js
// ─── Delivery Order Payload Builder ───────────────────────────────────────────
//
// Builds the exact order payload shape required by the Spring Boot backend.
// Architecture reference: CafeQR 2.0 Architecture doc, Section 4.5.
//
// Backend endpoint: POST /api/v1/orders
// Proxied through: POST /api/orders (Next.js API route)
//
// USAGE:
//   import { buildOrderPayload, ORDER_SOURCE, FULFILLMENT_TYPE } from '@/lib/deliveryHelpers';
//   const payload = buildOrderPayload({ clientId, orgId, cartItems, customerName, ... });
//   await apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });

// ─── Constants ─────────────────────────────────────────────────────────────────

export const ORDER_SOURCE = {
  ONLINE: 'ONLINE',
  POS:    'POS',
};

export const FULFILLMENT_TYPE = {
  DELIVERY: 'DELIVERY',
  TAKEAWAY: 'TAKEAWAY',
  DINE_IN:  'DINE_IN',
};

export const ORDER_STATUS = {
  PENDING:    'PENDING',
  CONFIRMED:  'CONFIRMED',
  PROCESSING: 'PROCESSING',
  BILLED:     'BILLED',
  DISPATCHED: 'DISPATCHED',
  COMPLETED:  'COMPLETED',
  CANCELLED:  'CANCELLED',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID:    'PAID',
  FAILED:  'FAILED',
};

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  UPI:  'UPI',
};

// ─── Order Payload Builder ─────────────────────────────────────────────────────

/**
 * Build the full order payload for the backend.
 *
 * @param {object} params
 * @param {string}  params.clientId         — Restaurant UUID (from URL /[clientId])
 * @param {string}  [params.orgId]          — Org UUID (same as clientId for single-tenant, optional)
 * @param {string}  params.fulfillmentType  — 'DELIVERY' | 'TAKEAWAY' (from ?t= param)
 * @param {string}  params.customerName     — Customer's full name
 * @param {string}  params.customerPhone    — Customer's phone number
 * @param {string}  [params.deliveryAddress]— Required for DELIVERY type
 * @param {string}  [params.orderNotes]     — Optional notes
 * @param {string}  params.paymentMethod    — 'CASH' | 'UPI'
 * @param {Array}   params.cartItems        — CartContext items: [{ id, name, price, quantity, variantId? }]
 * @returns {object} Payload ready to POST to /api/orders
 */
export function buildOrderPayload({
  clientId,
  orgId,
  fulfillmentType = FULFILLMENT_TYPE.DELIVERY,
  customerName,
  customerPhone,
  deliveryAddress = '',
  orderNotes = '',
  paymentMethod = PAYMENT_METHOD.CASH,
  cartItems = [],
}) {
  // Compute totals from cart items
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
    0
  );

  // Build description field — convention used by the backend to store delivery address
  const descriptionParts = [];
  if (fulfillmentType === FULFILLMENT_TYPE.DELIVERY && deliveryAddress) {
    descriptionParts.push(`DELIVERY TO: ${deliveryAddress.trim()}`);
  } else if (fulfillmentType === FULFILLMENT_TYPE.TAKEAWAY) {
    descriptionParts.push('TAKEAWAY ORDER');
  }
  if (orderNotes) {
    descriptionParts.push(`NOTE: ${orderNotes.trim()}`);
  }

  // Map CartContext items → backend OrderLine shape
  const orderLines = cartItems.map(item => ({
    itemId:    item.id,
    name:      item.name,
    unitPrice: Number(item.price),
    quantity:  Number(item.quantity),
    ...(item.variantId ? { variantId: item.variantId } : {}),
  }));

  return {
    clientId,
    ...(orgId ? { orgId } : {}),
    orderType:       fulfillmentType,          // backend also accepts orderType
    fulfillmentType,
    orderStatus:     ORDER_STATUS.PENDING,
    paymentStatus:   PAYMENT_STATUS.PENDING,
    orderSource:     ORDER_SOURCE.ONLINE,
    paymentMethod,
    customerName:    (customerName || '').trim(),
    customerPhone:   (customerPhone || '').trim(),
    deliveryAddress: deliveryAddress.trim(),
    description:     descriptionParts.join(' | '),
    subtotal,
    totalAmount:     subtotal,
    totalTaxAmount:  0,
    deliveryFee:     0,
    grandTotal:      subtotal,
    orderLines,
    // Alias: some backend versions use `items` instead of `orderLines`
    items: orderLines,
  };
}

// ─── Order Status Helpers ──────────────────────────────────────────────────────

/**
 * Maps a backend orderStatus string to a 0-based step index for the
 * delivery progress stepper UI (0–3). Returns -1 for cancelled orders.
 *
 * Steps:
 *   0 → Order Placed (CONFIRMED / PENDING)
 *   1 → Preparing    (PROCESSING / IN_PROGRESS / DRAFT)
 *   2 → Out for Delivery (BILLED / DISPATCHED)
 *   3 → Delivered    (COMPLETED / PAID / SETTLED)
 *  -1 → Cancelled    (CANCELLED / VOID)
 */
export function orderStatusToStep(orderStatus) {
  const s = (orderStatus || '').toUpperCase();
  if (['CANCELLED', 'VOID'].includes(s))                        return -1;
  if (['COMPLETED', 'PAID', 'SETTLED'].includes(s))            return 3;
  if (['BILLED', 'DISPATCHED', 'ASSIGNED', 'PICKEDUP'].includes(s)) return 2;
  if (['PROCESSING', 'IN_PROGRESS', 'DRAFT', 'PREPARING'].includes(s)) return 1;
  return 0; // PENDING, CONFIRMED, or anything unknown
}

/**
 * Human-readable label for a given orderStatus.
 */
export function orderStatusLabel(orderStatus) {
  const labels = {
    PENDING:     'Pending',
    CONFIRMED:   'Confirmed',
    PROCESSING:  'Preparing',
    IN_PROGRESS: 'Preparing',
    BILLED:      'Out for Delivery',
    DISPATCHED:  'Out for Delivery',
    ASSIGNED:    'Rider Assigned',
    PICKEDUP:    'Picked Up',
    COMPLETED:   'Delivered',
    PAID:        'Delivered',
    SETTLED:     'Delivered',
    CANCELLED:   'Cancelled',
    VOID:        'Cancelled',
  };
  return labels[(orderStatus || '').toUpperCase()] || orderStatus || 'Unknown';
}

/**
 * Returns true if the order is in a terminal state (no more polling needed).
 */
export function isTerminalStatus(orderStatus) {
  const s = (orderStatus || '').toUpperCase();
  return ['COMPLETED', 'PAID', 'SETTLED', 'CANCELLED', 'VOID'].includes(s);
}

// ─── Fulfilment Type from URL param ───────────────────────────────────────────

/**
 * Resolves the fulfillment type from the ?t= URL query parameter.
 * ?t=DELIVERY → 'DELIVERY'
 * ?t=TAKEAWAY → 'TAKEAWAY'
 * Default: 'DELIVERY'
 */
export function resolveFulfillmentType(tParam) {
  const t = (tParam || '').toUpperCase();
  if (t === 'TAKEAWAY') return FULFILLMENT_TYPE.TAKEAWAY;
  return FULFILLMENT_TYPE.DELIVERY;
}

// ─── Address Extractor ─────────────────────────────────────────────────────────

/**
 * Extracts the delivery address from the backend's `description` field.
 * Convention: "DELIVERY TO: <address> | NOTE: <notes>"
 */
export function extractDeliveryAddress(description) {
  if (!description) return '';
  const match = description.match(/^DELIVERY TO:\s*/i);
  if (!match) return description.trim();
  // Strip any trailing NOTE: section
  const withoutPrefix = description.slice(match[0].length);
  const pipeIdx = withoutPrefix.indexOf(' | ');
  return (pipeIdx === -1 ? withoutPrefix : withoutPrefix.slice(0, pipeIdx)).trim();
}

/**
 * Extracts the order note from the backend's `description` field.
 */
export function extractOrderNote(description) {
  if (!description) return '';
  const match = description.match(/NOTE:\s*(.+)$/i);
  return match ? match[1].trim() : '';
}
