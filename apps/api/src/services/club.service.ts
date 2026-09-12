import { prisma } from '../config/prisma.js';
import { ConflictError } from '../utils/errors.js';
import type { CreateClubInput, UpdateClubInput } from '@padelteammates/shared';

// NB: la restriction "admin uniquement" est appliquee au niveau des routes
// (middleware requireAdmin). Le service se concentre sur la persistance.
export function createClub(input: CreateClubInput) {
  return prisma.club.create({ data: input });
}

export function updateClub(id: string, input: UpdateClubInput) {
  return prisma.club.update({ where: { id }, data: input });
}

// Par defaut, seuls les clubs actifs : un club ferme ne doit plus etre propose.
// `includeInactive` est reserve a l'ecran d'administration.
export function listClubs(city?: string, includeInactive = false) {
  return prisma.club.findMany({
    where: { ...(city ? { city } : {}), ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export function getClub(id: string) {
  return prisma.club.findUniqueOrThrow({ where: { id } });
}

// Suppression reservee aux clubs sans aucun match : ailleurs, on desactive pour
// garder l'historique (PATCH { active: false }).
export async function deleteClub(id: string): Promise<void> {
  const matches = await prisma.match.count({ where: { clubId: id } });
  if (matches > 0) {
    throw new ConflictError('Ce club a des matchs : desactivez-le au lieu de le supprimer');
  }
  await prisma.club.delete({ where: { id } });
}
