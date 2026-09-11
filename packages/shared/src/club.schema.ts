import { z } from 'zod';

export const createClubSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().min(2).max(80).default('Kénitra'),
});

export const updateClubSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    city: z.string().min(2).max(80).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ a mettre a jour' });

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
