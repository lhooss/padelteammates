import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as notificationService from '../services/notification.service.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

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
