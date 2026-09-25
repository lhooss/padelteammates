import type { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { createRefreshToken, hashRefreshToken } from '../utils/refreshToken.js';
import {
  createResetCode,
  EMAIL_VERIFICATION_TTL_MINUTES,
  hashResetCode,
  RESET_CODE_TTL_MINUTES,
  RESET_MAX_ATTEMPTS,
} from '../utils/resetCode.js';
import { emailVerificationEmail, passwordResetEmail, sendEmail } from './email.service.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { frmtSummaryFor } from './frmt.service.js';
import type {
  ChangeEmailInput,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@padelteammates/shared';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  emailVerifiedAt: true,
  role: true,
  profilePublic: true,
  wins: true,
  losses: true,
  preferredSide: true,
  level: true,
  dominantHand: true,
  phone: true,
  homeClub: { select: { id: true, name: true } },
  createdAt: true,
} as const;

// Ouvre une session : un jeton d'acces court, et un jeton de session longue dont
// seule l'empreinte est stockee.
async function issueSession(user: { id: string; role: Role }) {
  const { raw, hash } = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { token: signToken({ sub: user.id, role: user.role }), refreshToken: raw };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('Email deja utilise');
  const takenUsername = await prisma.user.findUnique({
    where: { username: input.username },
    select: { id: true },
  });
  if (takenUsername) throw new ConflictError('Identifiant deja pris');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash,
      profilePublic: input.profilePublic,
    },
    select: PUBLIC_USER_SELECT,
  });

  // Le code part des l'inscription, mais rien n'attend sa saisie : le joueur
  // entre dans l'app immediatement, elle lui rappellera de confirmer.
  await sendEmailVerification(user.id);

  return { user, ...(await issueSession(user)) };
}

// (Re)envoie un code de verification. Sans effet si l'adresse est deja
// confirmee : inutile de demander deux fois la meme chose.
export async function sendEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, emailVerifiedAt: true },
  });
  if (user.emailVerifiedAt) return;

  const { code, hash } = createResetCode();
  await prisma.$transaction([
    // Un seul code valable a la fois, comme pour le mot de passe oublie.
    prisma.emailVerification.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailVerification.create({
      data: {
        userId,
        codeHash: hash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  await sendEmail({ to: user.email, ...emailVerificationEmail(code, EMAIL_VERIFICATION_TTL_MINUTES) });
}

// Confirme l'adresse. Renvoie le profil a jour : l'app s'en sert pour faire
// disparaitre le rappel sans recharger.
export async function verifyEmail(userId: string, code: string) {
  const invalid = new BadRequestError('Code invalide ou expire');

  const verification = await prisma.emailVerification.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!verification || verification.expiresAt.getTime() <= Date.now()) throw invalid;

  if (verification.attempts >= RESET_MAX_ATTEMPTS) {
    await prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
    throw new BadRequestError('Trop d\'essais : demandez un nouveau code');
  }

  if (verification.codeHash !== hashResetCode(code)) {
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    throw invalid;
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: PUBLIC_USER_SELECT,
    }),
    prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
  ]);
  return user;
}

export async function login(input: LoginInput) {
  const found = await prisma.user.findUnique({ where: { email: input.email } });
  if (!found) throw new UnauthorizedError('Identifiants invalides');

  const ok = await verifyPassword(input.password, found.passwordHash);
  if (!ok) throw new UnauthorizedError('Identifiants invalides');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: found.id }, select: PUBLIC_USER_SELECT });
  return { user, ...(await issueSession(found)) };
}

// Renouvellement silencieux : le jeton presente est revoque et remplace. S'il a deja
// servi, expire ou ete revoque, la session est finie et le joueur se reconnecte.
export async function refreshSession(rawToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError('Session expiree, reconnectez-vous');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId }, select: PUBLIC_USER_SELECT });
  return { user, ...(await issueSession(stored.user)) };
}

// Deconnexion : la session de cet appareil est revoquee. Silencieux si le jeton est
// deja inconnu, pour ne rien reveler.
export async function logout(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Demande de reinitialisation. Ne dit jamais si l'adresse existe : sinon la route
// devient un moyen de decouvrir qui possede un compte.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  const { code, hash } = createResetCode();
  await prisma.$transaction([
    // Une nouvelle demande annule les precedentes : un seul code valable a la fois.
    prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash: hash,
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  await sendEmail({ to: email, ...passwordResetEmail(code, RESET_CODE_TTL_MINUTES) });
}

// Verifie le code et change le mot de passe. Toutes les sessions sont revoquees :
// si le compte etait compromis, les appareils de l'intrus perdent la main.
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const invalid = new BadRequestError('Code invalide ou expire');

  const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (!user) throw invalid;

  const reset = await prisma.passwordReset.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!reset || reset.expiresAt.getTime() <= Date.now()) throw invalid;

  if (reset.attempts >= RESET_MAX_ATTEMPTS) {
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    throw new BadRequestError('Trop d\'essais : demandez un nouveau code');
  }

  if (reset.codeHash !== hashResetCode(input.code)) {
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
    throw invalid;
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    // Le mot de passe a change : plus aucune session ouverte ne reste valable.
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getMe(userId: string) {
  const [user, frmt] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: PUBLIC_USER_SELECT }),
    // Son propre classement FRMT, y compris une demande de lien en attente de l'admin.
    frmtSummaryFor(userId, { includePending: true }),
  ]);
  return { ...user, frmt };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.homeClubId) {
    const club = await prisma.club.findUnique({ where: { id: input.homeClubId }, select: { id: true } });
    if (!club) throw new NotFoundError('Club introuvable');
  }
  if (input.username) {
    const taken = await prisma.user.findUnique({ where: { username: input.username }, select: { id: true } });
    if (taken && taken.id !== userId) throw new ConflictError('Identifiant deja pris');
  }
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: PUBLIC_USER_SELECT,
  });
}

// Confirme l'identite avant un changement sensible. 400 et non 401 : pour l'app,
// un 401 signifie « session expiree » et declenche une deconnexion.
async function assertCurrentPassword(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new BadRequestError('Mot de passe actuel incorrect');
  }
}

export async function changeEmail(userId: string, input: ChangeEmailInput) {
  await assertCurrentPassword(userId, input.currentPassword);
  const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (taken && taken.id !== userId) throw new ConflictError('Email deja utilise');

  // La nouvelle adresse n'est pas confirmee : sans cela, changer d'adresse
  // apres verification viderait celle-ci de son sens.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { email: input.email, emailVerifiedAt: null },
    select: PUBLIC_USER_SELECT,
  });
  await sendEmailVerification(userId);
  return user;
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  await assertCurrentPassword(userId, input.currentPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
