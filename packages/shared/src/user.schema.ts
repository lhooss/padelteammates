import { z } from 'zod';

// Recherche de joueurs par nom.
export const userSearchSchema = z.object({
  q: z.string().trim().min(2, 'Tapez au moins 2 lettres').max(80),
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
