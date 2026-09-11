import { z } from 'zod';

// Un set: nombre de jeux gagnes par chaque equipe (0..7 pour couvrir le tie-break).
// Pas d'egalite: une equipe remporte le set.
const gamesInSet = z.number().int().min(0).max(7, 'Un set se joue en 7 jeux maximum');
const setSchema = z
  .object({
    a: gamesInSet,
    b: gamesInSet,
  })
  .refine((s) => s.a !== s.b, 'Un set ne peut pas etre a egalite');

// Un "match joue" (game) = suite de sets. 1 a 5 sets par game.
const gameSchema = z.object({
  sets: z.array(setSchema).min(1).max(5),
});

const rosterSchema = z.array(z.string().cuid()).length(2, 'Chaque equipe compte exactement 2 joueurs');

export const submitScoreSchema = z
  .object({
    // Composition finale des equipes, 2 contre 2 (peut differer de l'invitation initiale).
    teams: z.object({
      A: rosterSchema,
      B: rosterSchema,
    }),
    // Nombre de matchs joues => games.length. Detail des sets par game.
    games: z.array(gameSchema).min(1).max(10),
  })
  .superRefine((data, ctx) => {
    const a = data.teams.A;
    const b = data.teams.B;

    // Un joueur ne peut pas etre dans les deux equipes.
    const overlap = a.filter((id) => b.includes(id));
    if (overlap.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Un joueur ne peut appartenir aux deux equipes' });
    }

    // Pas de doublon a l'interieur d'une equipe.
    if (new Set(a).size !== a.length || new Set(b).size !== b.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Joueur en double dans une equipe' });
    }
  });

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;

// --- Resultat d'une saisie ---
// Partage : l'API s'en sert pour les stats, l'app pour afficher le resultat pendant la saisie.

export type ScoreTeam = 'A' | 'B';

export interface ScoreResult {
  gamesPlayed: number;
  gamesWonA: number;
  gamesWonB: number;
  winningTeam: ScoreTeam | null; // null = egalite
}

type SetScore = { a: number; b: number };

// Vainqueur d'un set (pas d'egalite possible, voir setSchema).
function setWinner(set: SetScore): ScoreTeam {
  return set.a > set.b ? 'A' : 'B';
}

// Vainqueur d'un game = equipe avec le plus de sets gagnes.
function gameWinner(game: { sets: SetScore[] }): ScoreTeam | null {
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
export function computeResult(input: { games: { sets: SetScore[] }[] }): ScoreResult {
  let gamesWonA = 0;
  let gamesWonB = 0;
  for (const game of input.games) {
    const w = gameWinner(game);
    if (w === 'A') gamesWonA += 1;
    else if (w === 'B') gamesWonB += 1;
  }
  let winningTeam: ScoreTeam | null = null;
  if (gamesWonA > gamesWonB) winningTeam = 'A';
  else if (gamesWonB > gamesWonA) winningTeam = 'B';

  return { gamesPlayed: input.games.length, gamesWonA, gamesWonB, winningTeam };
}
