import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../core/asyncHandler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { UserRepository } from "../repositories/user.repo.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { AuthService } from "../services/auth.service.js";
import { unauthorizedError } from "../core/errors.js";

const authService = new AuthService(new UserRepository(prisma));

export const authRouter = Router();

authRouter.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw unauthorizedError();
    }
    const user = await authService.me(req.user.sub);
    res.status(200).json({ user });
  }),
);
