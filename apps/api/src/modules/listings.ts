import { Router } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { db, FieldValue, admin } from '../db.js';
import { config } from '../config.js';

/**
 * Lesson: listings — the worked example. The five habits every endpoint follows:
 *  1. Validate input first (before touching the database)
 *  2. Authorize: who is calling, and do they own the workspace?
 *  3. Idempotency for writes (Idempotency-Key header)
 *  4. Related changes in one transaction
 *  5. Precise status codes: 400 client error, 401 unverified, 403 forbidden,
 *     404 missing, 201 created
 */

export const listingsRouter = Router();

/** GET /api/v1/listings — public browse. No auth needed. */
listingsRouter.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(config.pageSizeMax, Math.max(1, Number(req.query.size) || config.pageSizeDefault));
  const kind = typeof req.query.kind === 'string' ? req.query.kind : 'product';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  // NOTE: offset pagination + in-memory text filtering are fine at course scale;
  // real scale wants cursor pagination + a dedicated search index.
  const snap = await db.collection('listings')
    .where('status', '==', 'active')
    .where('kind', '==', kind)
    .orderBy('createdAt', 'desc')
    .offset((page - 1) * size)
    .limit(q ? size * 3 : size)
    .get();

  const docs = q ? snap.docs.filter(doc => String(doc.data().title ?? '').toLowerCase().includes(q)) : snap.docs;
  const items = docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ page, size, items });
}));

/** POST /api/v1/listings — create in YOUR workspace. */
listingsRouter.post('/', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const { workspaceId, title, kind, description, price, currency, unit, stock } = req.body ?? {};

  // HABIT 1 — validation
  if (typeof workspaceId !== 'string' || !workspaceId) throw new ApiError(400, 'invalid_workspace', 'workspaceId is required.');
  if (typeof title !== 'string' || title.trim().length < 3) throw new ApiError(400, 'invalid_title', 'Title must be at least 3 characters.');
  if (!['product', 'used_good', 'produce'].includes(kind)) throw new ApiError(400, 'invalid_kind', 'kind must be product | used_good | produce.');
  if (typeof price !== 'number' || price < 100) throw new ApiError(400, 'invalid_price', 'Price must be at least UGX 100.');
  if (!Number.isInteger(stock) || stock < 0) throw new ApiError(400, 'invalid_stock', 'stock must be a whole number ≥ 0.');

  const listingRef = db.collection('listings').doc();
  const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null;
  const idemRef = idempotencyKey
    ? db.collection('idempotency').doc(`${uid}:${idempotencyKey}`)
    : null;

  let listingId = '';

  await db.runTransaction(async (tx) => {
    // HABIT 2 — authorization INSIDE the transaction (role re-checked atomically)
    const memberSnap = await tx.get(db.collection('workspaces').doc(workspaceId).collection('members').doc(uid));
    const role = memberSnap.data()?.role;
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new ApiError(403, 'not_a_seller', 'Only an OWNER or MANAGER of this workspace can create listings.');
    }

    // HABIT 3 — idempotency: same key returns the same result, no duplicate listing
    if (idemRef) {
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists) {
        listingId = idemSnap.data()!.listingId as string;
        return;
      }
    }

    // HABIT 4 — the listing and its idempotency record in ONE transaction
    tx.create(listingRef, {
      workspaceId,
      title: title.trim(),
      kind, description: typeof description === 'string' ? description : '',
      priceMinor: Math.round(price),   // money is ALWAYS integer minor units (UGX has no cents)
      currency: currency === 'USD' ? 'USD' : 'UGX',
      unit: typeof unit === 'string' && unit ? unit : 'item',
      stock, status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (idemRef) tx.create(idemRef, { listingId: listingRef.id, createdAt: FieldValue.serverTimestamp() });
  });

  if (!listingId) listingId = listingRef.id; // fresh-create path (idem path already set it)
  res.status(201).json({ id: listingId, message: 'Listing created.' });
}));

// ── LESSON 1 (your assignment) ─────────────────────────────────────────────
// GET /api/v1/listings/:id → return one listing by id; 404 with
//   { error: 'not_found' } when it doesn't exist.
// PATCH /api/v1/listings/:id → only a workspace member may edit title/price/
//   stock; everyone else gets 403.
// Follow the patterns above. I review your code line by line.

/** GET /api/v1/listings/:id — one listing (public if active, or a workspace member). */
listingsRouter.get('/:id', asyncHandler(async (req, res) => {
  const snap = await db.collection('listings').doc(String(req.params.id)).get();
  if (!snap.exists) throw new ApiError(404, 'listing_not_found', 'No listing with that id.');
  const data = snap.data()!;
  if (data.status !== 'active') {
    // inactive listings are visible only to the workspace's own people
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) throw new ApiError(404, 'listing_not_found', 'No listing with that id.');
    const member = await db.collection('workspaces').doc(data.workspaceId).collection('members').doc(
      (await admin.auth().verifyIdToken(auth.slice(7))).uid).get();
    if (!member.exists) throw new ApiError(404, 'listing_not_found', 'No listing with that id.');
  }
  res.json({ id: snap.id, ...data });
}));

/** PATCH /api/v1/listings/:id — edit price/stock/title/status (workspace OWNER/MANAGER only). */
listingsRouter.patch('/:id', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const { title, description, price, stock, status } = req.body ?? {};

  // HABIT 1 — validation: only known, well-typed fields pass
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3) throw new ApiError(400, 'invalid_title', 'Title must be at least 3 characters.');
    patch.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string') throw new ApiError(400, 'invalid_description', 'description must be text.');
    patch.description = description;
  }
  if (price !== undefined) {
    if (typeof price !== 'number' || price < 100) throw new ApiError(400, 'invalid_price', 'Price must be at least UGX 100.');
    patch.priceMinor = Math.round(price);
  }
  if (stock !== undefined) {
    if (!Number.isInteger(stock) || stock < 0) throw new ApiError(400, 'invalid_stock', 'stock must be a whole number ≥ 0.');
    patch.stock = stock;
  }
  if (status !== undefined) {
    if (!['active', 'paused', 'archived'].includes(status)) throw new ApiError(400, 'invalid_status', 'status must be active | paused | archived.');
    patch.status = status;
  }

  await db.runTransaction(async (tx) => {
    // HABIT 2 — authorization and existence INSIDE the transaction
    const snap = await tx.get(db.collection('listings').doc(String(req.params.id)));
    if (!snap.exists) throw new ApiError(404, 'listing_not_found', 'No listing with that id.');
    const member = await tx.get(db.collection('workspaces').doc(snap.data()!.workspaceId).collection('members').doc(uid));
    const role = member.data()?.role;
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new ApiError(403, 'not_a_seller', 'Only an OWNER or MANAGER of this workspace can edit listings.');
    }
    tx.update(snap.ref, patch);
  });

  res.json({ id: String(req.params.id), message: 'Listing updated.' });
}));
