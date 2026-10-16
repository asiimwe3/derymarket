import type { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { ApiError } from './errors.js';

/** Request with the verified Firebase user attached. */
export interface AuthedRequest extends Request {
  user: { uid: string; phone?: string };
}

/**
 * HABIT 1 (authorize). Clients send their Firebase ID token:
 *   Authorization: Bearer <idToken>
 * The API verifies the signature cryptographically — never trusts the token's
 * contents without verifying it. 401 = bad/missing token, 403 = valid token,
 * wrong permission (checked later per-route).
 */
export async function requireUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) throw new ApiError(401, 'no_token', 'Sign in first (missing Bearer token).');
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    (req as AuthedRequest).user = { uid: decoded.uid, phone: decoded.phone_number };
    next();
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    next(new ApiError(401, 'invalid_token', 'Sign-in token is invalid or expired — sign in again.'));
  }
}
