import { Router } from 'express';
import { pushTokenSchema } from '@padelteammates/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as notificationService from '../services/notification.service.js';
import * as pushService from '../services/push.service.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

// Appareil du joueur : il recoit les notifications push tant que le jeton est enregistre.
notificationRouter.put(
  '/push-tokens',
  validate(pushTokenSchema),
  asyncHandler(async (req, res) => {
    await pushService.registerPushToken(req.auth!.userId, req.body.token, req.body.platform);
    res.status(204).send();
  }),
);

// Diagnostic : s'envoie une notification de test et renvoie ce qui s'est passe.
// `devices` a 0 signifie que l'appareil n'est pas enregistre (permission refusee
// ou jeton non obtenu) ; des `errors` non vides viennent d'Expo ou de Firebase.
notificationRouter.post(
  '/test',
  asyncHandler(async (req, res) => {
    const outcome = await pushService.sendPush([req.auth!.userId], {
      type: 'INVITE',
      message: 'Notification de test : si vous voyez ceci, tout fonctionne.',
    });
    res.json(outcome);
  }),
);

// Deconnexion : cet appareil ne doit plus rien recevoir.
notificationRouter.delete(
  '/push-tokens/:token',
  asyncHandler(async (req, res) => {
    await pushService.removePushToken(req.auth!.userId, req.params.token!);
    res.status(204).send();
  }),
);

notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === 'true';
    res.json(await notificationService.listNotifications(req.auth!.userId, unreadOnly));
  }),
);

notificationRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.auth!.userId);
    res.status(204).send();
  }),
);

notificationRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await notificationService.markRead(req.auth!.userId, req.params.id!);
    res.status(204).send();
  }),
);
