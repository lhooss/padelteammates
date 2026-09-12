import type { Team } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { formatMatchDay } from '../utils/format.js';
import { assertNoSlotClash, assertOpenForNewPlayers, getMatch } from './match.service.js';
import { notify } from './notification.service.js';

// Demandes pour rejoindre un match depuis le calendrier. N'importe quel joueur peut
// demander une place libre ; l'organisateur accepte (le joueur devient participant
// confirme) ou refuse. La demande est supprimee dans tous les cas.

async function loadMatch(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { participants: true } });
  if (!match) throw new NotFoundError('Match introuvable');
  return match;
}

function assertTeamHasRoom(participants: { team: Team }[], team: Team): void {
  if (participants.filter((p) => p.team === team).length >= 2) {
    throw new ConflictError(`Plus de place dans l'equipe ${team}`);
  }
}

// "du lundi 14 septembre (20:00-21:30)"
function describeMatch(match: { date: Date; slot: string }): string {
  return `du ${formatMatchDay(match.date)} (${match.slot})`;
}

export async function requestToJoin(userId: string, matchId: string, team: Team) {
  const match = await loadMatch(matchId);
  assertOpenForNewPlayers(match);
  if (match.participants.some((p) => p.userId === userId)) {
    throw new ConflictError('Vous participez deja a ce match');
  }
  assertTeamHasRoom(match.participants, team);
  await assertNoSlotClash([userId], match.date, match.slot);

  const requester = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.joinRequest.create({ data: { matchId, userId, team } });
      await notify(
        {
          userId: match.createdById,
          type: 'JOIN_REQUEST',
          message: `${requester.name} demande à rejoindre l'équipe ${team} de votre match ${describeMatch(match)}.`,
          matchId,
        },
        tx,
      );
      return request;
    });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Demande deja envoyee pour ce match');
    }
    throw err;
  }
}

// L'organisateur accepte : le joueur rejoint l'equipe demandee, deja confirme.
export async function acceptJoinRequest(organizerId: string, matchId: string, requesterId: string) {
  const match = await loadMatch(matchId);
  if (match.createdById !== organizerId) {
    throw new ForbiddenError('Seul l\'organisateur peut repondre aux demandes');
  }
  assertOpenForNewPlayers(match);

  const request = await prisma.joinRequest.findUnique({
    where: { matchId_userId: { matchId, userId: requesterId } },
  });
  if (!request) throw new NotFoundError('Aucune demande de ce joueur pour ce match');
  assertTeamHasRoom(match.participants, request.team);
  await assertNoSlotClash([requesterId], match.date, match.slot);

  await prisma.$transaction(async (tx) => {
    await tx.joinRequest.delete({ where: { id: request.id } });
    await tx.participant.create({
      data: { matchId, userId: requesterId, team: request.team, presenceStatus: 'CONFIRMED' },
    });
    await notify(
      {
        userId: requesterId,
        type: 'JOIN_ACCEPTED',
        message: `Vous jouez ! Votre demande pour le match ${describeMatch(match)} a été acceptée.`,
        matchId,
      },
      tx,
    );
  });
  return getMatch(matchId);
}

// Refus par l'organisateur, ou annulation par le joueur lui-meme.
export async function removeJoinRequest(userId: string, matchId: string, requesterId: string): Promise<void> {
  const match = await loadMatch(matchId);
  const isOrganizer = match.createdById === userId;
  if (!isOrganizer && userId !== requesterId) {
    throw new ForbiddenError('Seul l\'organisateur ou le demandeur peut retirer cette demande');
  }

  const request = await prisma.joinRequest.findUnique({
    where: { matchId_userId: { matchId, userId: requesterId } },
  });
  if (!request) throw new NotFoundError('Aucune demande de ce joueur pour ce match');

  await prisma.$transaction(async (tx) => {
    await tx.joinRequest.delete({ where: { id: request.id } });
    if (isOrganizer && userId !== requesterId) {
      await notify(
        {
          userId: requesterId,
          type: 'JOIN_DECLINED',
          message: `Votre demande pour le match ${describeMatch(match)} n'a pas été retenue.`,
          matchId,
        },
        tx,
      );
    }
  });
}
