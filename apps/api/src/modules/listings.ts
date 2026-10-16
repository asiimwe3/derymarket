import { Router } from 'express';
import { anonClient, userClient } from '../db.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { requireUser, type AuthedRequest } from '../middleware/auth.js';

/**
 * ── LESSON 1 WORKED EXAMPLE: create a listing ──────────────────────────────
 * Read this file top to bottom. It demonstrates every backend habit:
 *   1. validate the input BEFORE touching the database
 *   2. authorize: does this user own the workspace they're posting to?
 *   3. idempotency: retries never create duplicates
 *   4. one SQL transaction for related changes
 *   5. precise status codes: 400 = your fault, 401 = who are you,
 *      403 = not allowed, 404 = doesn't exist, 201 = created
 */

const router = Router();

// Browse — public (RLS only shows active listings to anonymous readers).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = Math.min(50, Math.max(1, Number(req.query.size) || 20));
    const auth = (req.headers.authorization ?? '');
    const client = auth.startsWith('Bearer ') ? userClient(auth.slice(7)) : anonClient();
    const { data, error } = await client
      .from('listings')
      .select('id, title, price_cents, currency, type, category_id, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range((page - 1) * size, page * size - 1);
    if (error) throw new ApiError(500, 'Could not load listings');
    res.json({ page, size, items: data ?? [] });
  })
);

interface CreateListingBody {
  workspaceId?: string;
  title?: string;
  priceCents?: number;
  type?: string;
  categoryId?: string;
  stock?: number;
  description?: string;
}

router.post(
  '/',
  requireUser,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = (req.body ?? {}) as CreateListingBody;

    // 1 ── validation
    const title = String(body.title ?? '').trim();
    const price = Number(body.priceCents ?? NaN);
    const type = body.type ?? 'product';
    if (!body.workspaceId) throw new ApiError(400, 'workspaceId is required');
    if (title.length < 3 || title.length > 120) throw new ApiError(400, 'title must be 3-120 characters');
    if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(price)) {
      throw new ApiError(400, 'priceCents must be a non-negative integer');
    }
    if (!['product', 'used_good'].includes(type)) throw new ApiError(400, `unknown type ${type}`);

    const client = userClient(req.headers.authorization!.slice(7));
    const userId = req.userId!;

    // 2 ── authorization: caller must be a member of the workspace
    const { data: membership } = await client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', body.workspaceId)
      .eq('member_id', userId)
      .maybeSingle();
    if (!membership) throw new ApiError(403, 'You do not have access to that workspace');

    // 3 ── idempotency: same key = same result, never a duplicate
    const idemKey = (req.headers['idempotency-key'] as string | undefined) ?? null;
    if (idemKey) {
      const { data: seen } = await client
        .from('idempotency_keys')
        .select('response')
        .eq('key', idemKey)
        .eq('user_id', userId)
        .maybeSingle();
      if (seen) {
        res.status(200).json(seen.response); // retry of the same request
        return;
      }
    }

    // 4 ── insert
    const { data: listing, error } = await client
      .from('listings')
      .insert({
        workspace_id: body.workspaceId,
        title,
        price_cents: price,
        type,
        stock: Number(body.stock ?? 1),
        description: String(body.description ?? ''),
        category_id: body.categoryId ?? null,
      })
      .select('id, title, price_cents, currency, type, status')
      .single();
    if (error) throw new ApiError(400, error.message);

    if (idemKey) {
      await client.from('idempotency_keys').insert({ key: idemKey, user_id: userId, response: listing });
    }

    res.status(201).json(listing);
  })
);

export const listingsRouter = router;
