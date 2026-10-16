/**
 * Orders — the first slice of the Trade Engine (SRS §3.4):
 * created -> reserved -> paid -> fulfilled -> released
 * Escrow is order-scoped; COD orders skip 'paid' until delivery.
 * Every state change is written by ONE endpoint inside ONE transaction.
 */
import { Router } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { db, FieldValue, admin } from '../db.js';

export const ordersRouter = Router();

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  created: ['reserved', 'cancelled'],
  reserved: ['paid', 'cancelled'],
  paid: ['fulfilled', 'refunded'],
  fulfilled: ['released'],
  released: [],
  cancelled: [],
  refunded: [],
};

/** POST /api/v1/orders — buy an active listing. Stock is reserved atomically. */
ordersRouter.post('/', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const { listingId, quantity, paymentMethod } = req.body ?? {};
  const qty = Number(quantity);

  // HABIT 1 — validation
  if (typeof listingId !== 'string' || !listingId) throw new ApiError(400, 'invalid_listing', 'listingId is required.');
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new ApiError(400, 'invalid_quantity', 'quantity must be 1-100.');
  if (!['mtn_momo', 'airtel_money', 'card', 'cod'].includes(paymentMethod)) {
    throw new ApiError(400, 'invalid_payment_method', 'paymentMethod must be mtn_momo | airtel_money | card | cod.');
  }
  const idKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null;
  const idemRef = idKey ? db.collection('idempotency').doc(`${uid}:order:${idKey}`) : null;

  const orderRef = db.collection('orders').doc();
  let orderId = '';
  let totalPriceMinor = 0;

  await db.runTransaction(async (tx) => {
    // HABIT 3 — idempotency
    if (idemRef) {
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists) { orderId = idemSnap.data()!.orderId as string; return; }
    }

    // HABIT 2+4 — read, authorize, reserve stock and create the order in ONE transaction
    const listingSnap = await tx.get(db.collection('listings').doc(listingId));
    if (!listingSnap.exists) throw new ApiError(404, 'listing_not_found', 'No listing with that id.');
    const listing = listingSnap.data()!;
    if (listing.status !== 'active') throw new ApiError(409, 'listing_inactive', 'This listing is not active.');
    const member = await tx.get(db.collection('workspaces').doc(listing.workspaceId).collection('members').doc(uid));
    if (member.exists) throw new ApiError(403, 'own_listing', 'You cannot order your own listing.');
    if ((listing.stock ?? 0) < qty) throw new ApiError(409, 'out_of_stock', `Only ${listing.stock ?? 0} left.`);

    totalPriceMinor = (listing.priceMinor ?? 0) * qty;
    tx.update(listingSnap.ref, {
      stock: (listing.stock ?? 0) - qty,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(orderRef, {
      buyerUid: uid,
      sellerWorkspaceId: listing.workspaceId,
      listingId,
      title: listing.title,
      quantity: qty,
      unitPriceMinor: listing.priceMinor,
      totalPriceMinor,
      currency: listing.currency ?? 'UGX',
      paymentMethod,
      paymentState: paymentMethod === 'cod' ? 'cod_pending' : 'unpaid',
      state: 'created',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (idemRef) tx.create(idemRef, { orderId: orderRef.id, createdAt: FieldValue.serverTimestamp() });
    orderId = orderRef.id;
  });

  res.status(201).json({ id: orderId, totalPriceMinor, state: 'created', message: 'Order placed. Stock reserved.' });
}));

/** GET /api/v1/orders — your orders (buyer side). */
ordersRouter.get('/', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const snap = await db.collection('orders').where('buyerUid', '==', uid)
    .orderBy('createdAt', 'desc').limit(50).get();
  res.json({ items: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
}));

/** POST /api/v1/orders/:id/transition — state machine (seller/ops only in later lessons). */
ordersRouter.post('/:id/transition', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const { to } = req.body ?? {};
  if (typeof to !== 'string' || !ALLOWED_TRANSITIONS[to]) throw new ApiError(400, 'invalid_state', 'Unknown target state.');

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(db.collection('orders').doc(String(req.params.id)));
    if (!orderSnap.exists) throw new ApiError(404, 'order_not_found', 'No order with that id.');
    const order = orderSnap.data()!;
    // Lesson: authorization differs per direction — buyers may cancel early, sellers advance the rest.
    const sellerMember = await tx.get(db.collection('workspaces').doc(order.sellerWorkspaceId).collection('members').doc(uid));
    const isSeller = sellerMember.exists;
    const isBuyer = order.buyerUid === uid;
    if (to === 'cancelled' && !isBuyer && !isSeller) throw new ApiError(403, 'not_your_order', 'Not your order.');
    if (to !== 'cancelled' && !isSeller) throw new ApiError(403, 'seller_only', 'Only the seller can advance this order.');
    if (!ALLOWED_TRANSITIONS[order.state]?.includes(to)) {
      throw new ApiError(409, 'bad_transition', `Cannot move from ${order.state} to ${to}.`);
    }
    tx.update(orderSnap.ref, {
      state: to,
      updatedAt: FieldValue.serverTimestamp(),
      ...(to === 'cancelled' ? { paymentState: 'refunding' } : {}),
    });
  });

  res.json({ id: String(req.params.id), state: to, message: 'Order updated.' });
}));
