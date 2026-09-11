import { prisma } from '../config/prisma.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 1000) / 10; // 1 decimale
}

// Stats publiques d'un joueur: consultables uniquement si profilePublic = true (voir SDD).
export async function getPublicStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, profilePublic: true, wins: true, losses: true },
  });
  if (!user) throw new NotFoundError('Joueur introuvable');
  if (!user.profilePublic) {
    throw new ForbiddenError('Le profil de ce joueur est prive');
  }
  return {
    id: user.id,
    name: user.name,
    wins: user.wins,
    losses: user.losses,
    played: user.wins + user.losses,
    winRate: winRate(user.wins, user.losses),
  };
}

// Classement communautaire limite aux profils publics.
export async function leaderboard() {
  const users = await prisma.user.findMany({
    where: { profilePublic: true },
    select: { id: true, name: true, wins: true, losses: true },
    orderBy: [{ wins: 'desc' }],
    take: 100,
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    wins: u.wins,
    losses: u.losses,
    played: u.wins + u.losses,
    winRate: winRate(u.wins, u.losses),
  }));
}
