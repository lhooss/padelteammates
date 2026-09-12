import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getValidated, validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  addInvitesSchema,
  courtBookingSchema,
  createMatchSchema,
  joinRequestSchema,
  respondInviteSchema,
  submitScoreSchema,
  updateVisibilitySchema,
  weeklyCalendarSchema,
  type WeeklyCalendarInput,
} from '@padelteammates/shared';
import * as joinRequestService from '../services/joinRequest.service.js';
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
    res.json(await matchService.weeklyCalendar(req.auth!.userId, ref, q.clubId));
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

// Un match que le joueur ne voit pas est introuvable (404), y compris par lien direct.
matchRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await matchService.getMatchFor(req.auth!.userId, req.params.id!));
  }),
);

// Visibilite du match : toute la communaute, les amis de l'organisateur, ou ses joueurs.
matchRouter.patch(
  '/:id/visibility',
  validate(updateVisibilitySchema),
  asyncHandler(async (req, res) => {
    res.json(await matchService.setVisibility(req.auth!.userId, req.params.id!, req.body.visibility));
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

// Inviter des amis a un match deja cree (organisateur, places libres).
matchRouter.post(
  '/:id/invites',
  validate(addInvitesSchema),
  asyncHandler(async (req, res) => {
    res.json(await matchService.invitePlayers(req.auth!.userId, req.params.id!, req.body));
  }),
);

// --- Demandes pour rejoindre (depuis le calendrier) ---

// Demander une place libre dans une equipe.
matchRouter.post(
  '/:id/join-requests',
  validate(joinRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await joinRequestService.requestToJoin(req.auth!.userId, req.params.id!, req.body.team));
  }),
);

// L'organisateur accepte la demande de ce joueur.
matchRouter.post(
  '/:id/join-requests/:userId/accept',
  asyncHandler(async (req, res) => {
    res.json(await joinRequestService.acceptJoinRequest(req.auth!.userId, req.params.id!, req.params.userId!));
  }),
);

// Refus par l'organisateur, ou annulation par le joueur.
matchRouter.delete(
  '/:id/join-requests/:userId',
  asyncHandler(async (req, res) => {
    await joinRequestService.removeJoinRequest(req.auth!.userId, req.params.id!, req.params.userId!);
    res.status(204).send();
  }),
);

// Reservation du terrain au club : n'importe quel joueur du match la confirme ou la retire.
matchRouter.post(
  '/:id/booking',
  validate(courtBookingSchema),
  asyncHandler(async (req, res) => {
    res.json(await matchService.setCourtBooking(req.auth!.userId, req.params.id!, req.body.booked));
  }),
);

// --- Composition ---

// Quitter le match, ou (organisateur) en retirer un joueur.
matchRouter.delete(
  '/:id/participants/:userId',
  asyncHandler(async (req, res) => {
    res.json(await matchService.leaveMatch(req.auth!.userId, req.params.id!, req.params.userId!));
  }),
);

// Annulation du match par l'organisateur : il disparait pour tout le monde.
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

// Validation du resultat (verrouillage des qu'un joueur de chaque equipe a valide).
matchRouter.post(
  '/:id/score/validate',
  asyncHandler(async (req, res) => {
    const result = await scoreService.validateScore(req.auth!.userId, req.params.id!);
    res.json(result);
  }),
);
