import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit faire au moins 2 caracteres').max(80, 'Le nom est trop long'),
  email: z.string().email('Email invalide').toLowerCase(),
  password: z
    .string()
    .min(8, 'Le mot de passe doit faire au moins 8 caracteres')
    .max(128, 'Le mot de passe est trop long'),
  profilePublic: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase(),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    profilePublic: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ a mettre a jour' });

export type RegisterInput = z.infer<typeof registerSchema>;
// Corps de requete accepte (avant application des valeurs par defaut), cote client.
export type RegisterRequest = z.input<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
