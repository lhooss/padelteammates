import { Router } from 'express';
import { frmtLinkSchema, frmtSearchSchema, type FrmtSearchInput } from '@padelteammates/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { getValidated, validate } from '../middleware/validate.js';
import * as frmtService from '../services/frmt.service.js';

export const frmtRouter = Router();

frmtRouter.use(requireAuth);

// Date et volumes du dernier import du classement.
frmtRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    res.json(await frmtService.importStatus());
  }),
);

// Recherche d'un joueur dans le classement importe (?q=&category=MEN|WOMEN).
frmtRouter.get(
  '/ranking',
  validate(frmtSearchSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q, category } = getValidated<FrmtSearchInput>(req, 'query');
    res.json(await frmtService.searchRanking(q, category));
  }),
);

// Relier son profil a sa ligne du classement (en attente de validation par l'admin).
frmtRouter.put(
  '/link',
  validate(frmtLinkSchema),
  asyncHandler(async (req, res) => {
    res.json(await frmtService.linkMyRanking(req.auth!.userId, req.body));
  }),
);

frmtRouter.delete(
  '/link',
  asyncHandler(async (req, res) => {
    await frmtService.unlinkMyRanking(req.auth!.userId);
    res.status(204).send();
  }),
);

// --- Administration ---

frmtRouter.get(
  '/links',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await frmtService.listPendingLinks());
  }),
);

frmtRouter.post(
  '/links/:id/verify',
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await frmtService.verifyLink(req.params.id!));
  }),
);

frmtRouter.delete(
  '/links/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await frmtService.rejectLink(req.params.id!);
    res.status(204).send();
  }),
);

// Lance un import immediat (quelques dizaines de requetes vers le site de la FRMT).
frmtRouter.post(
  '/import',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await frmtService.importFrmtRanking());
  }),
);
