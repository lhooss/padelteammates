import type { Prisma, Team } from '@prisma/client';
import type { SubmitScoreInput } from '@padelteammates/shared';

export interface ComputedResult {
  gamesPlayed: number;
  gamesWonA: number;
  gamesWonB: number;
  winningTeam: Team | null; // null = match nul
}

// Determine le vainqueur d'un set.
function setWinner(set: { a: number; b: number }): Team {
  return set.a > set.b ? 'A' : 'B';
}

// Vainqueur d'un game = equipe avec le plus de sets gagnes.
function gameWinner(game: { sets: { a: number; b: number }[] }): Team | null {
  let a = 0;
  let b = 0;
  for (const s of game.sets) {
    if (setWinner(s) === 'A') a += 1;
    else b += 1;
  }
  if (a === b) return null;
  return a > b ? 'A' : 'B';
}

// Vainqueur global de la session = equipe ayant remporte le plus de games.
export function computeResult(input: SubmitScoreInput): ComputedResult {
  let gamesWonA = 0;
  let gamesWonB = 0;
  for (const game of input.games) {
    const w = gameWinner(game);
    if (w === 'A') gamesWonA += 1;
    else if (w === 'B') gamesWonB += 1;
  }
  let winningTeam: Team | null = null;
  if (gamesWonA > gamesWonB) winningTeam = 'A';
  else if (gamesWonB > gamesWonA) winningTeam = 'B';

  return { gamesPlayed: input.games.length, gamesWonA, gamesWonB, winningTeam };
}

// Applique les stats (victoires/defaites) sur les joueurs, dans une transaction.
export async function applyStats(
  tx: Prisma.TransactionClient,
  teams: { A: string[]; B: string[] },
  winningTeam: Team | null,
): Promise<void> {
  if (winningTeam === null) return; // match nul: pas de victoire/defaite

  const winners = winningTeam === 'A' ? teams.A : teams.B;
  const losers = winningTeam === 'A' ? teams.B : teams.A;

  await tx.user.updateMany({ where: { id: { in: winners } }, data: { wins: { increment: 1 } } });
  await tx.user.updateMany({ where: { id: { in: losers } }, data: { losses: { increment: 1 } } });
}
