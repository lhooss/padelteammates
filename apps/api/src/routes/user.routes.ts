import { Router } from 'express';
import { userSearchSchema, type UserSearchInput } from '@padelteammates/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { getValidated, validate } from '../middleware/validate.js';
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

// Recherche de joueurs par nom (?q=). Avant /:id pour eviter la collision.
userRouter.get(
  '/search',
  validate(userSearchSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q } = getValidated<UserSearchInput>(req, 'query');
    res.json(await userService.searchUsers(req.auth!.userId, q));
  }),
);

// Profil d'un joueur : relation d'amitie, stats si profil public ou ami.
userRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await userService.getProfile(req.auth!.userId, req.params.id!));
  }),
);

// Stats d'un joueur (403 si profil prive et pas ami).
userRouter.get(
  '/:id/stats',
  asyncHandler(async (req, res) => {
    res.json(await userService.getPublicStats(req.auth!.userId, req.params.id!));
  }),
);
