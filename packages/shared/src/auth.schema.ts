import { z } from 'zod';

const nameSchema = z.string().min(2, 'Le nom doit faire au moins 2 caracteres').max(80, 'Le nom est trop long');
const emailSchema = z.string().email('Email invalide').toLowerCase();
const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit faire au moins 8 caracteres')
  .max(128, 'Le mot de passe est trop long');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  profilePublic: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
});

// Jeton de session longue, echange contre un nouveau couple de jetons (rotation).
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20, 'Jeton de session invalide'),
});

// --- Profil padel ---

export const COURT_SIDES = ['LEFT', 'RIGHT', 'BOTH'] as const; // cote prefere sur le terrain
export const PLAYER_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export const HANDS = ['RIGHT', 'LEFT'] as const;

export type CourtSide = (typeof COURT_SIDES)[number];
export type PlayerLevel = (typeof PLAYER_LEVELS)[number];
export type Hand = (typeof HANDS)[number];

// Telephone marocain : "06 12 34 56 78", "+212 6 12 34 56 78" ou "00212..." -> "+212612345678".
export function normalizeMoroccanPhone(value: string): string {
  const compact = value.replace(/[\s.\-()]/g, '');
  if (compact.startsWith('+212')) return compact;
  if (compact.startsWith('00212')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+212${compact.slice(1)}`;
  return compact;
}

const phoneSchema = z
  .string()
  .transform(normalizeMoroccanPhone)
  .pipe(z.string().regex(/^\+212[5-7]\d{8}$/, 'Numero marocain invalide (ex. 06 12 34 56 78)'));

// Mise a jour du profil : chaque champ est facultatif ; `null` efface un champ du profil padel.
export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    profilePublic: z.boolean().optional(),
    preferredSide: z.enum(COURT_SIDES).nullable().optional(),
    level: z.enum(PLAYER_LEVELS).nullable().optional(),
    dominantHand: z.enum(HANDS).nullable().optional(),
    homeClubId: z.string().cuid().nullable().optional(),
    phone: phoneSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ a mettre a jour' });

// --- Compte : email et mot de passe (confirmation par le mot de passe actuel) ---

export const changeEmailSchema = z.object({
  email: emailSchema,
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
// Corps de requete accepte (avant application des valeurs par defaut), cote client.
export type RegisterRequest = z.input<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileRequest = z.input<typeof updateProfileSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
