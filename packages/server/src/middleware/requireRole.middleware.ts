import type { NextFunction, Request, Response } from "express";
import type { Role } from "../core/roles.js";
import { forbiddenError, unauthorizedError } from "../core/errors.js";

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbiddenError());
      return;
    }
    next();
  };
}
