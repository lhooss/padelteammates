import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getValidated, validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createMatchSchema,
  respondInviteSchema,
  submitScoreSchema,
  weeklyCalendarSchema,
  type WeeklyCalendarInput,
} from '@padelteammates/shared';
import * as matchService from '../services/match.service.js';
import * as scoreService from '../services/score.service.js';

export const matchRouter = Router();

matchRouter.use(requireAuth);

// Calendrier hebdomadaire global (communaute). Avant /:id pour eviter la collision.
matchRouter.get(
  '/calendar/weekly',
  validate(weeklyCalendarSchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = getValidated<WeeklyCalendarInput>(req, 'query');
    const ref = q.from ?? new Date();
    res.json(await matchService.weeklyCalendar(ref, q.clubId));
  }),
);

matchRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    res.json(await matchService.listMyMatches(req.auth!.userId));
  }),
);

// Planification d'un match.
matchRouter.post(
  '/',
  validate(createMatchSchema),
  asyncHandler(async (req, res) => {
    const match = await matchService.createMatch(req.auth!.userId, req.body);
    res.status(201).json(match);
  }),
);

matchRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await matchService.getMatch(req.params.id!));
  }),
);

// Reponse a une invitation (accepter / decliner).
matchRouter.post(
  '/:id/respond',
  validate(respondInviteSchema),
  asyncHandler(async (req, res) => {
    const match = await matchService.respondToInvite(req.auth!.userId, req.params.id!, req.body.accept);
    res.json(match);
  }),
);

matchRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await matchService.cancelMatch(req.auth!.userId, req.params.id!);
    res.status(204).send();
  }),
);

// --- Scores ---

matchRouter.get(
  '/:id/score',
  asyncHandler(async (req, res) => {
    res.json(await scoreService.getScore(req.params.id!));
  }),
);

// Saisie du resultat par un participant (compte comme 1ere validation).
matchRouter.post(
  '/:id/score',
  validate(submitScoreSchema),
  asyncHandler(async (req, res) => {
    const score = await scoreService.submitScore(req.auth!.userId, req.params.id!, req.body);
    res.status(201).json(score);
  }),
);

// Validation du resultat (verrouillage a >= 2 validations).
matchRouter.post(
  '/:id/score/validate',
  asyncHandler(async (req, res) => {
    const result = await scoreService.validateScore(req.auth!.userId, req.params.id!);
    res.json(result);
  }),
);
