import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  profilePublic: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    profilePublic: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ a mettre a jour' });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
