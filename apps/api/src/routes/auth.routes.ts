import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  changeEmailSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '@padelteammates/shared';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

// Mot de passe oublie : on envoie un code par email. La reponse est toujours 204,
// meme si l'adresse est inconnue, pour ne pas reveler qui possede un compte.
authRouter.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.requestPasswordReset(req.body.email);
    res.status(204).send();
  }),
);

// Verification du code et nouveau mot de passe. Toutes les sessions sont revoquees.
authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    res.status(204).send();
  }),
);

// Renouvellement silencieux du jeton d'acces, sans ressaisie du mot de passe.
authRouter.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.refreshSession(req.body.refreshToken));
  }),
);

// Deconnexion de cet appareil : la session longue est revoquee cote serveur.
authRouter.post(
  '/logout',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.auth!.userId);
    res.json(user);
  }),
);

// Modifier son profil : nom, profil public, profil padel, club habituel, telephone.
authRouter.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.auth!.userId, req.body);
    res.json(user);
  }),
);

// Changer d'email (confirme par le mot de passe actuel).
authRouter.patch(
  '/me/email',
  requireAuth,
  validate(changeEmailSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.changeEmail(req.auth!.userId, req.body));
  }),
);

// Changer de mot de passe (confirme par le mot de passe actuel).
authRouter.patch(
  '/me/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.auth!.userId, req.body);
    res.status(204).send();
  }),
);
