import type { NextFunction, Request, Response } from 'express';

/** Typed error with an HTTP status — how endpoints say "your fault" (400) vs "mine" (500). */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Wraps async routes so thrown errors land in one error handler instead of hanging the request. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
