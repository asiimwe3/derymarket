import { Router } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { db, FieldValue } from '../db.js';
import { config } from '../config.js';

/**
 * Lesson: accounts. One identity per human (Firebase Auth user), one or more
 * workspaces. Firestore layout:
 *   profiles/{uid}                       — display info, verification, default workspace
 *   workspaces/{wsId}                    — storefront, balances live with the ledger
 *   workspaces/{wsId}/members/{uid}      — role in this workspace
 */

export const accountsRouter = Router();

/** GET /api/v1/accounts/me — your profile (auto-created on first read). */
accountsRouter.get('/me', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const ref = db.collection('profiles').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const profile = {
      phone: (req as AuthedRequest).user.phone ?? '',
      displayName: '',
      verification: 'phone',           // progressive: phone → id → business
      defaultWorkspaceId: null as string | null,
      createdAt: FieldValue.serverTimestamp(),
    };
    await ref.create(profile);         // create() fails if it exists — race-safe
    res.status(201).json({ profile });
    return;
  }
  res.json({ profile: snap.data() });
}));

/** POST /api/v1/accounts/workspaces — create a workspace and become its OWNER. */
accountsRouter.post('/workspaces', requireUser, asyncHandler(async (req, res) => {
  const uid = (req as AuthedRequest).user.uid;
  const { name, type } = req.body ?? {};

  // HABIT 1 — validate input before touching the database
  if (typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'invalid_name', message: 'Workspace name must be at least 2 characters.' });
    return;
  }
  const kind = ['personal', 'business', 'institution'].includes(type) ? type : 'personal';

  // HABIT 2 — one transaction, two related writes (workspace + membership)
  const wsRef = db.collection('workspaces').doc();
  const memberRef = wsRef.collection('members').doc(uid);
  const profileRef = db.collection('profiles').doc(uid);

  await db.runTransaction(async (tx) => {
    tx.create(wsRef, { name: name.trim(), kind, ownerId: uid, verification: 'unverified', createdAt: FieldValue.serverTimestamp() });
    tx.create(memberRef, { role: 'OWNER', createdAt: FieldValue.serverTimestamp() });
    tx.update(profileRef, { defaultWorkspaceId: wsRef.id });
  });

  res.status(201).json({ id: wsRef.id, name: name.trim(), kind, role: 'OWNER' });
}));
