import { prisma } from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { frmtSummaryFor } from './frmt.service.js';
import type {
  ChangeEmailInput,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@padelteammates/shared';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
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

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('Email deja utilise');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      profilePublic: input.profilePublic,
    },
    select: PUBLIC_USER_SELECT,
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

export async function login(input: LoginInput) {
  const found = await prisma.user.findUnique({ where: { email: input.email } });
  if (!found) throw new UnauthorizedError('Identifiants invalides');

  const ok = await verifyPassword(input.password, found.passwordHash);
  if (!ok) throw new UnauthorizedError('Identifiants invalides');

  const token = signToken({ sub: found.id, role: found.role });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: found.id }, select: PUBLIC_USER_SELECT });
  return { user, token };
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

  return prisma.user.update({
    where: { id: userId },
    data: { email: input.email },
    select: PUBLIC_USER_SELECT,
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  await assertCurrentPassword(userId, input.currentPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
