import type { Prisma, Team } from '@prisma/client';

// Le calcul du vainqueur (computeResult) vit dans @padelteammates/shared,
// partage avec l'app mobile.

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
