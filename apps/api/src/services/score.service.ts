import type { Prisma, Team } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { slotEnd } from '../utils/slot.js';
import { applyStats } from './stats.service.js';
import { notifyMany } from './notification.service.js';
import { clearActive, markActive, withMatchLock } from './activeMatch.service.js';
import { computeResult, type SubmitScoreInput } from '@padelteammates/shared';

type Roster = { A: string[]; B: string[] };

async function loadMatchOrThrow(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true, score: true },
  });
  if (!match) throw new NotFoundError('Match introuvable');
  return match;
}

type LoadedMatch = Awaited<ReturnType<typeof loadMatchOrThrow>>;

// Seuls les participants ayant confirme leur presence peuvent saisir ou valider un score.
function assertConfirmedParticipant(match: LoadedMatch, userId: string): void {
  const participant = match.participants.find((p) => p.userId === userId);
  if (!participant) {
    throw new ForbiddenError('Seuls les participants du match peuvent agir sur le score');
  }
  if (participant.presenceStatus !== 'CONFIRMED') {
    throw new ForbiddenError('Confirmez votre participation avant d\'agir sur le score');
  }
}

// Equipes de la composition finale n'ayant encore aucun validateur.
function teamsAwaitingValidation(teams: Roster, validators: Set<string>): Team[] {
  return (['A', 'B'] as const).filter((team) => !teams[team].some((id) => validators.has(id)));
}

// Saisie (ou re-saisie) du resultat par un participant confirme, a l'issue du match.
// La saisie compte comme la 1ere validation de son auteur (pour son equipe).
export async function submitScore(userId: string, matchId: string, input: SubmitScoreInput) {
  return withMatchLock(matchId, async () => {
    const match = await loadMatchOrThrow(matchId);

    assertConfirmedParticipant(match, userId);
    if (match.status === 'COMPLETED') {
      throw new BadRequestError('Le resultat de ce match est deja verrouille');
    }
    if (Date.now() < slotEnd(match.date, match.slot).getTime()) {
      throw new BadRequestError('Le resultat ne peut etre saisi qu\'a l\'issue du creneau du match');
    }

    // La composition finale (2 contre 2, validee par Zod) doit reprendre les 4 joueurs confirmes.
    const confirmedIds = new Set(
      match.participants.filter((p) => p.presenceStatus === 'CONFIRMED').map((p) => p.userId),
    );
    const roster = [...input.teams.A, ...input.teams.B];
    if (roster.some((id) => !confirmedIds.has(id))) {
      throw new BadRequestError('La composition finale doit reprendre les 4 joueurs confirmes du match');
    }

    const result = computeResult(input);
    const setsDetail = { teams: input.teams, games: input.games } as unknown as Prisma.InputJsonValue;

    const score = await prisma.$transaction(async (tx) => {
      const saved = await tx.score.upsert({
        where: { matchId },
        create: {
          matchId,
          setsDetail,
          gamesPlayed: result.gamesPlayed,
          winningTeam: result.winningTeam,
          enteredById: userId,
          validators: [userId], // l'auteur valide de facto sa saisie
        },
        update: {
          // Re-saisie: les donnees changent, on reinitialise les validations.
          setsDetail,
          gamesPlayed: result.gamesPlayed,
          winningTeam: result.winningTeam,
          enteredById: userId,
          validators: [userId],
        },
      });

      await tx.match.update({ where: { id: matchId }, data: { status: 'PENDING' } });

      const others = match.participants.filter((p) => p.userId !== userId).map((p) => p.userId);
      await notifyMany(
        others,
        {
          type: 'SCORE_ENTERED',
          message: 'Un resultat a ete saisi. Merci de le valider ou de le corriger.',
          matchId,
        },
        tx,
      );

      return saved;
    });

    await markActive({
      matchId,
      enteredById: userId,
      validators: score.validators,
      updatedAt: new Date().toISOString(),
    });

    return score;
  });
}

// Validation d'une saisie par un participant confirme.
// Le match est verrouille (COMPLETED) et les stats calculees des qu'au moins un joueur
// de chaque equipe a valide : >= 2 des 4 participants (SDD), jamais une equipe seule.
export async function validateScore(userId: string, matchId: string) {
  return withMatchLock(matchId, async () => {
    const match = await loadMatchOrThrow(matchId);
    assertConfirmedParticipant(match, userId);

    const score = match.score;
    if (!score) throw new BadRequestError('Aucun resultat n\'a encore ete saisi');
    if (match.status === 'COMPLETED') {
      throw new BadRequestError('Le resultat est deja verrouille');
    }

    // On ne compte que des joueurs de la composition finale, sans doublon.
    const { teams } = score.setsDetail as unknown as { teams: Roster };
    const rosterIds = new Set([...teams.A, ...teams.B]);
    const validators = new Set([...score.validators, userId].filter((id) => rosterIds.has(id)));
    const validatorList = [...validators];
    const awaitingTeams = teamsAwaitingValidation(teams, validators);

    if (awaitingTeams.length === 0) {
      // Verrouillage + stats, de maniere atomique.
      const updated = await prisma.$transaction(async (tx) => {
        // Garde-fou en base, en plus du verrou Redis : un seul passage PENDING -> COMPLETED,
        // les stats ne peuvent donc jamais etre appliquees deux fois.
        const { count } = await tx.match.updateMany({
          where: { id: matchId, status: 'PENDING' },
          data: { status: 'COMPLETED' },
        });
        if (count !== 1) throw new ConflictError('Le resultat a deja ete verrouille');

        const savedScore = await tx.score.update({
          where: { matchId },
          data: { validators: validatorList },
        });
        await applyStats(tx, teams, score.winningTeam);
        await notifyMany(
          match.participants.map((p) => p.userId),
          {
            type: 'MATCH_COMPLETED',
            message: 'Le resultat est valide et verrouille. Les statistiques ont ete mises a jour.',
            matchId,
          },
          tx,
        );
        return savedScore;
      });

      await clearActive(matchId);
      return { score: updated, status: 'COMPLETED' as const };
    }

    // Une equipe n'a pas encore valide : on enregistre et on garde la session active.
    const savedScore = await prisma.score.update({
      where: { matchId },
      data: { validators: validatorList },
    });
    await markActive({
      matchId,
      enteredById: score.enteredById,
      validators: validatorList,
      updatedAt: new Date().toISOString(),
    });

    return { score: savedScore, status: 'PENDING' as const, awaitingTeams };
  });
}

export async function getScore(matchId: string) {
  const score = await prisma.score.findUnique({ where: { matchId } });
  if (!score) throw new NotFoundError('Aucun resultat pour ce match');
  return score;
}
