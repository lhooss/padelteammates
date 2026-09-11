import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as friendshipService from '../services/friendship.service.js';

export const friendRouter = Router();

friendRouter.use(requireAuth);

// Mes amis.
friendRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await friendshipService.listFriends(req.auth!.userId));
  }),
);

// Demandes d'ami en attente, recues et envoyees.
friendRouter.get(
  '/requests',
  asyncHandler(async (req, res) => {
    res.json(await friendshipService.listFriendRequests(req.auth!.userId));
  }),
);

// Envoyer une demande d'ami (ou accepter celle que ce joueur m'a deja envoyee).
friendRouter.post(
  '/:userId',
  asyncHandler(async (req, res) => {
    res.status(201).json(await friendshipService.sendFriendRequest(req.auth!.userId, req.params.userId!));
  }),
);

// Accepter la demande d'ami de ce joueur.
friendRouter.post(
  '/:userId/accept',
  asyncHandler(async (req, res) => {
    res.json(await friendshipService.acceptFriendRequest(req.auth!.userId, req.params.userId!));
  }),
);

// Refuser sa demande, annuler la mienne ou le retirer de mes amis.
friendRouter.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    res.json(await friendshipService.removeFriendship(req.auth!.userId, req.params.userId!));
  }),
);
