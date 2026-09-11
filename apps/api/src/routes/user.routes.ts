import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as userService from '../services/user.service.js';

export const userRouter = Router();

userRouter.use(requireAuth);

// Classement des joueurs (profils publics uniquement).
userRouter.get(
  '/leaderboard',
  asyncHandler(async (_req, res) => {
    res.json(await userService.leaderboard());
  }),
);

// Stats publiques d'un joueur (403 si profil prive).
userRouter.get(
  '/:id/stats',
  asyncHandler(async (req, res) => {
    res.json(await userService.getPublicStats(req.params.id!));
  }),
);
