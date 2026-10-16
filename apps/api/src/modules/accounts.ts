import { Router } from 'express';
import { userClient } from '../db.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { requireUser, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

// Who am I — the first endpoint every backend needs.
router.get(
  '/me',
  requireUser,
  asyncHandler(async (req: AuthedRequest, res) => {
    const client = userClient(req.headers.authorization!.slice(7));
    const { data, error } = await client
      .from('profiles')
      .select('id, phone, email, full_name, verification')
      .eq('id', req.userId!)
      .maybeSingle();
    if (error || !data) {
      // Signed-up in auth but no profile row yet → create it lazily.
      const { data: created, error: e2 } = await client
        .from('profiles')
        .insert({ id: req.userId!, phone: '', full_name: '' })
        .select('id, phone, email, full_name, verification')
        .single();
      if (e2) throw new ApiError(400, e2.message);
      res.json(created);
      return;
    }
    res.json(data);
  })
);

// Create a workspace ("Start selling", FR-ACC-03 entry point).
router.post(
  '/workspaces',
  requireUser,
  asyncHandler(async (req: AuthedRequest, res) => {
    const name = String(req.body?.name ?? '').trim();
    const kind = req.body?.kind ?? 'personal';
    if (name.length < 2) throw new ApiError(400, 'workspace name is required');
    if (!['personal', 'business', 'supplier', 'farm', 'institution'].includes(kind)) {
      throw new ApiError(400, `unknown workspace kind ${kind}`);
    }
    const client = userClient(req.headers.authorization!.slice(7));
    const { data: ws, error } = await client
      .from('workspaces')
      .insert({ owner_id: req.userId!, name, kind })
      .select('id, name, kind')
      .single();
    if (error) throw new ApiError(400, error.message);
    await client.from('workspace_members').insert({ workspace_id: ws.id, member_id: req.userId!, role: 'owner' });
    res.status(201).json(ws);
  })
);

export const accountsRouter = router;
