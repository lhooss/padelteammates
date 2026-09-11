import { prisma } from '../config/prisma.js';
import type { CreateClubInput, UpdateClubInput } from '../schemas/club.schema.js';

// NB: la restriction "admin uniquement" est appliquee au niveau des routes
// (middleware requireAdmin). Le service se concentre sur la persistance.
export function createClub(input: CreateClubInput) {
  return prisma.club.create({ data: input });
}

export function updateClub(id: string, input: UpdateClubInput) {
  return prisma.club.update({ where: { id }, data: input });
}

export function listClubs(city?: string) {
  return prisma.club.findMany({
    where: city ? { city } : undefined,
    orderBy: { name: 'asc' },
  });
}

export function getClub(id: string) {
  return prisma.club.findUniqueOrThrow({ where: { id } });
}

export async function deleteClub(id: string) {
  await prisma.club.delete({ where: { id } });
}
