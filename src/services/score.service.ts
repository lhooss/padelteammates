import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { applyStats, computeResult } from './stats.service.js';
import { notifyMany } from './notification.service.js';
import {
  acquireLock,
  clearActive,
  markActive,
  releaseLock,
} from './activeMatch.service.js';
import type { SubmitScoreInput } from '../schemas/score.schema.js';

const VALIDATORS_REQUIRED = 2; // >= 2 des 4 participants (voir SDD)

async function loadMatchOrThrow(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true, score: true },
  });
  if (!match) throw new NotFoundError('Match introuvable');
  return match;
}

function assertParticipant(participantIds: Set<string>, userId: string): void {
  if (!participantIds.has(userId)) {
    throw new ForbiddenError('Seuls les participants du match peuvent agir sur le score');
  }
}

// Saisie (ou re-saisie) du resultat par un participant.
// La saisie compte comme la 1ere validation de son auteur.
export async function submitScore(userId: string, matchId: string, input: SubmitScoreInput) {
  const match = await loadMatchOrThrow(matchId);
  const participantIds = new Set(match.participants.map((p) => p.userId));

  assertParticipant(participantIds, userId);
  if (match.status === 'COMPLETED') {
    throw new BadRequestError('Le resultat de ce match est deja verrouille');
  }

  // La composition finale ne peut contenir que des participants du match.
  const roster = [...input.teams.A, ...input.teams.B];
  const unknown = roster.filter((id) => !participantIds.has(id));
  if (unknown.length > 0) {
    throw new BadRequestError('La composition finale contient des joueurs non-participants');
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
}

// Validation d'une saisie par un participant.
// Verrouille le match (COMPLETED) et calcule les stats des que 2 participants ont valide.
export async function validateScore(userId: string, matchId: string) {
  const locked = await acquireLock(matchId);
  if (!locked) {
    throw new ConflictError('Validation concurrente en cours, reessayez');
  }

  try {
    const match = await loadMatchOrThrow(matchId);
    const participantIds = new Set(match.participants.map((p) => p.userId));
    assertParticipant(participantIds, userId);

    if (!match.score) throw new BadRequestError('Aucun resultat n\'a encore ete saisi');
    if (match.status === 'COMPLETED') {
      throw new BadRequestError('Le resultat est deja verrouille');
    }

    // On ne compte que des validateurs qui sont bien des participants, sans doublon.
    const validators = new Set(match.score.validators.filter((id) => participantIds.has(id)));
    validators.add(userId);
    const validatorList = [...validators];

    const setsDetail = match.score.setsDetail as unknown as {
      teams: { A: string[]; B: string[] };
    };

    if (validatorList.length >= VALIDATORS_REQUIRED) {
      // Verrouillage + stats, de maniere atomique.
      const updated = await prisma.$transaction(async (tx) => {
        const savedScore = await tx.score.update({
          where: { matchId },
          data: { validators: validatorList },
        });
        await tx.match.update({ where: { id: matchId }, data: { status: 'COMPLETED' } });
        await applyStats(tx, setsDetail.teams, match.score!.winningTeam);
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

    // Pas encore assez de validations: on enregistre et on garde la session active.
    const savedScore = await prisma.score.update({
      where: { matchId },
      data: { validators: validatorList },
    });
    await markActive({
      matchId,
      enteredById: match.score.enteredById,
      validators: validatorList,
      updatedAt: new Date().toISOString(),
    });

    return { score: savedScore, status: 'PENDING' as const };
  } finally {
    await releaseLock(matchId);
  }
}

export async function getScore(matchId: string) {
  const score = await prisma.score.findUnique({ where: { matchId } });
  if (!score) throw new NotFoundError('Aucun resultat pour ce match');
  return score;
}
