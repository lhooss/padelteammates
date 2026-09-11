import { prisma } from '../config/prisma.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { findFriendship, friendshipState, friendshipsWith } from './friendship.service.js';

function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 1000) / 10; // 1 decimale
}

function statsOf(user: { wins: number; losses: number }) {
  return {
    wins: user.wins,
    losses: user.losses,
    played: user.wins + user.losses,
    winRate: winRate(user.wins, user.losses),
  };
}

const PROFILE_SELECT = { id: true, name: true, profilePublic: true, wins: true, losses: true } as const;

// Stats d'un joueur : visibles si son profil est public, par ses amis, ou par lui-meme.
export async function getPublicStats(viewerId: string, userId: string) {
  const profile = await getProfile(viewerId, userId);
  if (!profile.stats) {
    throw new ForbiddenError('Le profil de ce joueur est prive');
  }
  return { id: profile.id, name: profile.name, ...profile.stats };
}

// Profil d'un joueur vu par `viewerId` : relation d'amitie, et stats si elles sont visibles.
export async function getProfile(viewerId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  if (!user) throw new NotFoundError('Joueur introuvable');

  const friendship = viewerId === userId ? null : await findFriendship(viewerId, userId);
  const state = friendshipState(viewerId, userId, friendship);
  const statsVisible = user.profilePublic || state === 'SELF' || state === 'FRIENDS';

  return {
    id: user.id,
    name: user.name,
    profilePublic: user.profilePublic,
    friendship: state,
    stats: statsVisible ? statsOf(user) : null,
  };
}

// Recherche de joueurs par nom (insensible a la casse), avec la relation d'amitie.
export async function searchUsers(viewerId: string, query: string) {
  const users = await prisma.user.findMany({
    where: { id: { not: viewerId }, name: { contains: query, mode: 'insensitive' } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 20,
  });
  const relations = await friendshipsWith(
    viewerId,
    users.map((u) => u.id),
  );
  return users.map((u) => ({ ...u, friendship: friendshipState(viewerId, u.id, relations.get(u.id)) }));
}

// Classement communautaire limite aux profils publics.
export async function leaderboard() {
  const users = await prisma.user.findMany({
    where: { profilePublic: true },
    select: { id: true, name: true, wins: true, losses: true },
    orderBy: [{ wins: 'desc' }],
    take: 100,
  });
  return users.map((u) => ({ id: u.id, name: u.name, ...statsOf(u) }));
}
