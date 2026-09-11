import { prisma } from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '@padelteammates/shared';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  profilePublic: true,
  wins: true,
  losses: true,
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
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new UnauthorizedError('Identifiants invalides');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Identifiants invalides');

  const token = signToken({ sub: user.id, role: user.role });
  const { passwordHash: _omit, ...safe } = user;
  return { user: safe, token };
}

export function getMe(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: PUBLIC_USER_SELECT });
}

export function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: PUBLIC_USER_SELECT,
  });
}
