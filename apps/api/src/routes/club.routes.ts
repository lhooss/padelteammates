import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createClubSchema, updateClubSchema } from '@padelteammates/shared';
import * as clubService from '../services/club.service.js';

export const clubRouter = Router();

// Lecture: ouverte a tout utilisateur authentifie.
clubRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    // Les clubs desactives ne sont visibles que de l'administrateur.
    const includeInactive = req.query.includeInactive === 'true' && req.auth!.role === 'ADMIN';
    res.json(await clubService.listClubs(city, includeInactive));
  }),
);

clubRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await clubService.getClub(req.params.id!));
  }),
);

// Ecriture: reservee a l'administrateur (voir SDD).
clubRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createClubSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await clubService.createClub(req.body));
  }),
);

clubRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateClubSchema),
  asyncHandler(async (req, res) => {
    res.json(await clubService.updateClub(req.params.id!, req.body));
  }),
);

clubRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await clubService.deleteClub(req.params.id!);
    res.status(204).send();
  }),
);
