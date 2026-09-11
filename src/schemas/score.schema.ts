import { z } from 'zod';

// Un set: nombre de jeux gagnes par chaque equipe (0..7 pour couvrir le tie-break).
// Pas d'egalite: une equipe remporte le set.
const setSchema = z
  .object({
    a: z.number().int().min(0).max(7),
    b: z.number().int().min(0).max(7),
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
