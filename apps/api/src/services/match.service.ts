import type { MatchStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { formatMatchDay } from '../utils/format.js';
import { slotEnd } from '../utils/slot.js';
import { friendIds } from './friendship.service.js';
import { notify, notifyMany } from './notification.service.js';
import type { AddInvitesInput, CreateMatchInput } from '@padelteammates/shared';

const PLAYER_SELECT = { id: true, name: true } as const;

const MATCH_INCLUDE = {
  club: true,
  participants: {
    include: { user: { select: PLAYER_SELECT } },
  },
  score: true,
  // Demandes pour rejoindre en attente (a traiter par l'organisateur).
  joinRequests: {
    include: { user: { select: PLAYER_SELECT } },
    orderBy: { createdAt: 'asc' },
  },
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

function inviteMessage(day: Date, slot: string, clubName: string): string {
  return `Vous êtes invité à un match le ${formatMatchDay(day)} (${slot}) au club ${clubName}.`;
}

// Les invites doivent etre des joueurs inscrits et des amis de l'organisateur.
async function assertCanInvite(organizerId: string, inviteeIds: string[]): Promise<void> {
  if (inviteeIds.length === 0) return;
  const found = await prisma.user.count({ where: { id: { in: inviteeIds } } });
  if (found !== inviteeIds.length) {
    throw new BadRequestError('Un ou plusieurs joueurs invites sont introuvables');
  }
  // On n'invite que ses amis (demande d'ami acceptee).
  const friends = await friendIds(organizerId);
  if (inviteeIds.some((id) => !friends.has(id))) {
    throw new ForbiddenError('Vous ne pouvez inviter que vos amis');
  }
}

// Conflit de creneau cote joueurs : aucun ne doit deja jouer ce jour + creneau
// dans un autre match non termine.
export async function assertNoSlotClash(userIds: string[], day: Date, slot: string): Promise<void> {
  const clash = await prisma.participant.findFirst({
    where: {
      userId: { in: userIds },
      match: { date: day, slot, status: { not: 'COMPLETED' } },
    },
    select: { userId: true },
  });
  if (clash) {
    throw new ConflictError('Un joueur a deja un match sur ce creneau');
  }
}

// Un match accepte de nouveaux joueurs (invitation ou demande pour rejoindre)
// tant qu'il est planifie et que son creneau n'est pas passe.
export function assertOpenForNewPlayers(match: { status: MatchStatus; date: Date; slot: string }): void {
  if (match.status !== 'PLANNED' || Date.now() >= slotEnd(match.date, match.slot).getTime()) {
    throw new BadRequestError('Ce match n\'accepte plus de nouveaux joueurs');
  }
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

  await assertCanInvite(creatorId, inviteeIds);
  await assertNoSlotClash([creatorId, ...inviteeIds], day, input.slot);

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
        { type: 'INVITE', message: inviteMessage(day, input.slot, club.name), matchId: created.id },
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

// Ajoute des amis a un match deja cree, dans les places libres. Reserve a l'organisateur,
// tant que le match est planifie et que son creneau n'est pas passe.
export async function invitePlayers(userId: string, matchId: string, input: AddInvitesInput) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true, club: true },
  });
  if (!match) throw new NotFoundError('Match introuvable');
  if (match.createdById !== userId) {
    throw new ForbiddenError('Seul l\'organisateur peut inviter des joueurs');
  }
  assertOpenForNewPlayers(match);

  const inviteeIds = input.invites.map((i) => i.userId);
  if (match.participants.some((p) => inviteeIds.includes(p.userId))) {
    throw new ConflictError('Ce joueur participe deja au match');
  }
  // 2 joueurs max par equipe, en comptant ceux deja presents (invites compris).
  for (const team of ['A', 'B'] as const) {
    const total =
      match.participants.filter((p) => p.team === team).length +
      input.invites.filter((i) => i.team === team).length;
    if (total > 2) throw new BadRequestError(`Plus assez de place dans l'equipe ${team}`);
  }

  await assertCanInvite(userId, inviteeIds);
  await assertNoSlotClash(inviteeIds, match.date, match.slot);

  await prisma.$transaction(async (tx) => {
    await tx.participant.createMany({
      data: input.invites.map((i) => ({
        matchId,
        userId: i.userId,
        team: i.team,
        presenceStatus: 'INVITED' as const,
      })),
    });
    // Un invite qui avait demande a rejoindre ce match n'a plus besoin de sa demande.
    await tx.joinRequest.deleteMany({ where: { matchId, userId: { in: inviteeIds } } });
    await notifyMany(
      inviteeIds,
      { type: 'INVITE', message: inviteMessage(match.date, match.slot, match.club.name), matchId },
      tx,
    );
  });

  return getMatch(matchId);
}

export async function respondToInvite(userId: string, matchId: string, accept: boolean) {
  const participant = await prisma.participant.findUnique({
    where: { userId_matchId: { userId, matchId } },
    include: { match: true, user: { select: { name: true } } },
  });
  if (!participant) throw new NotFoundError('Invitation introuvable');
  if (participant.match.status !== 'PLANNED') {
    throw new BadRequestError('Ce match n\'accepte plus de reponses');
  }
  if (participant.presenceStatus === 'CONFIRMED' && accept) {
    return prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: MATCH_INCLUDE });
  }

  const ofMatch = `au match du ${formatMatchDay(participant.match.date)}`;
  if (accept) {
    await prisma.participant.update({
      where: { userId_matchId: { userId, matchId } },
      data: { presenceStatus: 'CONFIRMED' },
    });
    await notify({
      userId: participant.match.createdById,
      type: 'INVITE',
      message: `${participant.user.name} a confirmé sa participation ${ofMatch}.`,
      matchId,
    });
  } else {
    // Refus: on retire le participant du match.
    await prisma.participant.delete({ where: { userId_matchId: { userId, matchId } } });
    await notify({
      userId: participant.match.createdById,
      type: 'INVITE',
      message: `${participant.user.name} a décliné votre invitation ${ofMatch}.`,
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

// Mes matchs : ceux ou je joue (ou suis invite) et ceux que j'ai demande a rejoindre.
export function listMyMatches(userId: string) {
  return prisma.match.findMany({
    where: {
      OR: [{ participants: { some: { userId } } }, { joinRequests: { some: { userId } } }],
    },
    include: MATCH_INCLUDE,
    orderBy: { date: 'desc' },
  });
}

// Calendrier hebdomadaire global de la communaute. Chacun n'y voit que sa propre
// demande pour rejoindre : les autres restent entre leur auteur et l'organisateur.
export function weeklyCalendar(viewerId: string, ref: Date, clubId?: string) {
  const { start, end } = weekBounds(ref);
  return prisma.match.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(clubId ? { clubId } : {}),
    },
    include: {
      club: true,
      participants: { include: { user: { select: PLAYER_SELECT } } },
      joinRequests: { where: { userId: viewerId }, include: { user: { select: PLAYER_SELECT } } },
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
