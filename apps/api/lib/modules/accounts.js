"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountsRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const errors_js_1 = require("../middleware/errors.js");
const db_js_1 = require("../db.js");
/**
 * Lesson: accounts. One identity per human (Firebase Auth user), one or more
 * workspaces. Firestore layout:
 *   profiles/{uid}                       — display info, verification, default workspace
 *   workspaces/{wsId}                    — storefront, balances live with the ledger
 *   workspaces/{wsId}/members/{uid}      — role in this workspace
 */
exports.accountsRouter = (0, express_1.Router)();
/** GET /api/v1/accounts/me — your profile (auto-created on first read). */
exports.accountsRouter.get('/me', auth_js_1.requireUser, (0, errors_js_1.asyncHandler)(async (req, res) => {
    const uid = req.user.uid;
    const ref = db_js_1.db.collection('profiles').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
        const profile = {
            phone: req.user.phone ?? '',
            displayName: '',
            verification: 'phone', // progressive: phone → id → business
            defaultWorkspaceId: null,
            createdAt: db_js_1.FieldValue.serverTimestamp(),
        };
        await ref.create(profile); // create() fails if it exists — race-safe
        res.status(201).json({ profile });
        return;
    }
    res.json({ profile: snap.data() });
}));
/** POST /api/v1/accounts/workspaces — create a workspace and become its OWNER. */
exports.accountsRouter.post('/workspaces', auth_js_1.requireUser, (0, errors_js_1.asyncHandler)(async (req, res) => {
    const uid = req.user.uid;
    const { name, type } = req.body ?? {};
    // HABIT 1 — validate input before touching the database
    if (typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ error: 'invalid_name', message: 'Workspace name must be at least 2 characters.' });
        return;
    }
    const kind = ['personal', 'business', 'institution'].includes(type) ? type : 'personal';
    // HABIT 2 — one transaction, two related writes (workspace + membership)
    const wsRef = db_js_1.db.collection('workspaces').doc();
    const memberRef = wsRef.collection('members').doc(uid);
    const profileRef = db_js_1.db.collection('profiles').doc(uid);
    await db_js_1.db.runTransaction(async (tx) => {
        tx.create(wsRef, { name: name.trim(), kind, ownerId: uid, verification: 'unverified', createdAt: db_js_1.FieldValue.serverTimestamp() });
        tx.create(memberRef, { role: 'OWNER', createdAt: db_js_1.FieldValue.serverTimestamp() });
        tx.update(profileRef, { defaultWorkspaceId: wsRef.id });
    });
    res.status(201).json({ id: wsRef.id, name: name.trim(), kind, role: 'OWNER' });
}));
