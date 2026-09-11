import { prisma } from '../config/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { notify, notifyMany } from './notification.service.js';
import type { CreateMatchInput } from '../schemas/match.schema.js';

const MATCH_INCLUDE = {
  club: true,
  participants: {
    include: { user: { select: { id: true, name: true } } },
  },
  score: true,
} as const;

// Normalise une date sur minuit UTC (le jour du match, sans l'heure).
function toDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Bornes de la semaine (lundi 00:00 UTC -> lundi suivant) contenant `ref`.
function weekBounds(ref: Date): { start: Date; end: Date } {
  const start = toDayUTC(ref);
  const day = start.getUTCDay(); // 0 = dimanche
  const diffToMonday = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export async function createMatch(creatorId: string, input: CreateMatchInput) {
  const day = toDayUTC(input.date);
  const inviteeIds = input.invites.map((i) => i.userId);

  if (inviteeIds.includes(creatorId)) {
    throw new BadRequestError('Le createur ne peut pas s\'inviter lui-meme');
  }

  // Le club doit exister.
  const club = await prisma.club.findUnique({ where: { id: input.clubId } });
  if (!club) throw new NotFoundError('Club introuvable');

  // Tous les invites doivent etre des joueurs inscrits.
  if (inviteeIds.length > 0) {
    const found = await prisma.user.count({ where: { id: { in: inviteeIds } } });
    if (found !== inviteeIds.length) {
      throw new BadRequestError('Un ou plusieurs joueurs invites sont introuvables');
    }
  }

  // Conflit de creneau cote joueurs: aucun participant (createur + invites)
  // ne doit deja jouer ce jour + creneau dans un autre match non termine.
  const everyoneIds = [creatorId, ...inviteeIds];
  const clash = await prisma.participant.findFirst({
    where: {
      userId: { in: everyoneIds },
      match: { date: day, slot: input.slot, status: { not: 'COMPLETED' } },
    },
    select: { userId: true },
  });
  if (clash) {
    throw new ConflictError('Un joueur a deja un match sur ce creneau');
  }

  try {
    const match = await prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          clubId: input.clubId,
          date: day,
          slot: input.slot,
          createdById: creatorId,
          participants: {
            create: [
              { userId: creatorId, team: input.creatorTeam, presenceStatus: 'CONFIRMED' },
              ...input.invites.map((i) => ({
                userId: i.userId,
                team: i.team,
                presenceStatus: 'INVITED' as const,
              })),
            ],
          },
        },
        include: MATCH_INCLUDE,
      });

      await notifyMany(
        inviteeIds,
        {
          type: 'INVITE',
          message: `Vous etes invite a un match le ${day.toISOString().slice(0, 10)} (${input.slot}) au club ${club.name}.`,
          matchId: created.id,
        },
        tx,
      );

      return created;
    });

    return match;
  } catch (err) {
    // Conflit sur la contrainte @@unique([clubId, date, slot]).
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Ce creneau est deja reserve dans ce club');
    }
    throw err;
  }
}

export async function respondToInvite(userId: string, matchId: string, accept: boolean) {
  const participant = await prisma.participant.findUnique({
    where: { userId_matchId: { userId, matchId } },
    include: { match: true },
  });
  if (!participant) throw new NotFoundError('Invitation introuvable');
  if (participant.match.status !== 'PLANNED') {
    throw new BadRequestError('Ce match n\'accepte plus de reponses');
  }
  if (participant.presenceStatus === 'CONFIRMED' && accept) {
    return prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: MATCH_INCLUDE });
  }

  if (accept) {
    await prisma.participant.update({
      where: { userId_matchId: { userId, matchId } },
      data: { presenceStatus: 'CONFIRMED' },
    });
    await notify({
      userId: participant.match.createdById,
      type: 'INVITE',
      message: 'Un joueur a confirme sa participation.',
      matchId,
    });
  } else {
    // Refus: on retire le participant du match.
    await prisma.participant.delete({ where: { userId_matchId: { userId, matchId } } });
    await notify({
      userId: participant.match.createdById,
      type: 'INVITE',
      message: 'Un joueur a decline l\'invitation.',
      matchId,
    });
  }

  return prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: MATCH_INCLUDE });
}

export async function getMatch(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: MATCH_INCLUDE });
  if (!match) throw new NotFoundError('Match introuvable');
  return match;
}

export function listMyMatches(userId: string) {
  return prisma.match.findMany({
    where: { participants: { some: { userId } } },
    include: MATCH_INCLUDE,
    orderBy: { date: 'desc' },
  });
}

// Calendrier hebdomadaire global de la communaute.
export function weeklyCalendar(ref: Date, clubId?: string) {
  const { start, end } = weekBounds(ref);
  return prisma.match.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(clubId ? { clubId } : {}),
    },
    include: {
      club: true,
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ date: 'asc' }, { slot: 'asc' }],
  });
}

export async function cancelMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new NotFoundError('Match introuvable');
  if (match.createdById !== userId) {
    throw new ForbiddenError('Seul le createur peut annuler le match');
  }
  if (match.status === 'COMPLETED') {
    throw new BadRequestError('Un match termine ne peut pas etre annule');
  }
  await prisma.match.delete({ where: { id: matchId } });
}
