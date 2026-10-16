"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const errors_js_1 = require("../middleware/errors.js");
const db_js_1 = require("../db.js");
const config_js_1 = require("../config.js");
/**
 * Lesson: listings — the worked example. The five habits every endpoint follows:
 *  1. Validate input first (before touching the database)
 *  2. Authorize: who is calling, and do they own the workspace?
 *  3. Idempotency for writes (Idempotency-Key header)
 *  4. Related changes in one transaction
 *  5. Precise status codes: 400 client error, 401 unverified, 403 forbidden,
 *     404 missing, 201 created
 */
exports.listingsRouter = (0, express_1.Router)();
/** GET /api/v1/listings — public browse. No auth needed. */
exports.listingsRouter.get('/', (0, errors_js_1.asyncHandler)(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = Math.min(config_js_1.config.pageSizeMax, Math.max(1, Number(req.query.size) || config_js_1.config.pageSizeDefault));
    const snap = await db_js_1.db.collection('listings')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .offset((page - 1) * size)
        .limit(size)
        .get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ page, size, items });
}));
/** POST /api/v1/listings — create in YOUR workspace. */
exports.listingsRouter.post('/', auth_js_1.requireUser, (0, errors_js_1.asyncHandler)(async (req, res) => {
    const uid = req.user.uid;
    const { workspaceId, title, kind, description, price, currency, unit, stock } = req.body ?? {};
    // HABIT 1 — validation
    if (typeof workspaceId !== 'string' || !workspaceId)
        throw new errors_js_1.ApiError(400, 'invalid_workspace', 'workspaceId is required.');
    if (typeof title !== 'string' || title.trim().length < 3)
        throw new errors_js_1.ApiError(400, 'invalid_title', 'Title must be at least 3 characters.');
    if (!['product', 'used_good', 'produce'].includes(kind))
        throw new errors_js_1.ApiError(400, 'invalid_kind', 'kind must be product | used_good | produce.');
    if (typeof price !== 'number' || price < 100)
        throw new errors_js_1.ApiError(400, 'invalid_price', 'Price must be at least UGX 100.');
    if (!Number.isInteger(stock) || stock < 0)
        throw new errors_js_1.ApiError(400, 'invalid_stock', 'stock must be a whole number ≥ 0.');
    const listingRef = db_js_1.db.collection('listings').doc();
    const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null;
    const idemRef = idempotencyKey
        ? db_js_1.db.collection('idempotency').doc(`${uid}:${idempotencyKey}`)
        : null;
    let listingId = '';
    await db_js_1.db.runTransaction(async (tx) => {
        // HABIT 2 — authorization INSIDE the transaction (role re-checked atomically)
        const memberSnap = await tx.get(db_js_1.db.collection('workspaces').doc(workspaceId).collection('members').doc(uid));
        const role = memberSnap.data()?.role;
        if (role !== 'OWNER' && role !== 'MANAGER') {
            throw new errors_js_1.ApiError(403, 'not_a_seller', 'Only an OWNER or MANAGER of this workspace can create listings.');
        }
        // HABIT 3 — idempotency: same key returns the same result, no duplicate listing
        if (idemRef) {
            const idemSnap = await tx.get(idemRef);
            if (idemSnap.exists) {
                listingId = idemSnap.data().listingId;
                return;
            }
        }
        // HABIT 4 — the listing and its idempotency record in ONE transaction
        tx.create(listingRef, {
            workspaceId,
            title: title.trim(),
            kind, description: typeof description === 'string' ? description : '',
            priceMinor: Math.round(price), // money is ALWAYS integer minor units (UGX has no cents)
            currency: currency === 'USD' ? 'USD' : 'UGX',
            unit: typeof unit === 'string' && unit ? unit : 'item',
            stock, status: 'active',
            createdAt: db_js_1.FieldValue.serverTimestamp(),
            updatedAt: db_js_1.FieldValue.serverTimestamp(),
        });
        if (idemRef)
            tx.create(idemRef, { listingId: listingRef.id, createdAt: db_js_1.FieldValue.serverTimestamp() });
    });
    res.status(201).json({ id: listingId, message: 'Listing created.' });
}));
// ── LESSON 1 (your assignment) ─────────────────────────────────────────────
// GET /api/v1/listings/:id → return one listing by id; 404 with
//   { error: 'not_found' } when it doesn't exist.
// PATCH /api/v1/listings/:id → only a workspace member may edit title/price/
//   stock; everyone else gets 403.
// Follow the patterns above. I review your code line by line.
