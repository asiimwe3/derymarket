import { NextFunction, Request, Response } from 'express';
import { userClient } from '../db.js';
import { ApiError } from './errors.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Authentication = WHO are you. Authorization (WHAT may you do) lives in
 * each module's policy function — keep the two separate on purpose.
 */
export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new ApiError(401, 'Sign in first'));
    return;
  }
  const token = header.slice('Bearer '.length);
  userClient(token)
    .auth.getUser()
    .then(({ data, error }) => {
      if (error || !data.user) {
        next(new ApiError(401, 'Session expired — sign in again'));
        return;
      }
      req.userId = data.user.id;
      next();
    })
    .catch(() => next(new ApiError(500, 'Auth check failed')));
}
