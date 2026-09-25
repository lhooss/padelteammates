import { z } from 'zod';

import { USERNAME_MAX, USERNAME_MIN } from './username.js';

const nameSchema = z.string().min(2, 'Le nom doit faire au moins 2 caracteres').max(80, 'Le nom est trop long');
// Identifiant public unique : ce qui distingue deux joueurs du meme nom. Pas
// d'espace ni d'accent, pour qu'il se tape et se dise sans ambiguite.
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `L'identifiant doit faire au moins ${USERNAME_MIN} caracteres`)
  .max(USERNAME_MAX, "L'identifiant est trop long")
  .regex(
    /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/,
    'Lettres, chiffres, tiret et tiret bas uniquement (sans tiret au debut ni a la fin)',
  );
const emailSchema = z.string().email('Email invalide').toLowerCase();
const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit faire au moins 8 caracteres')
  .max(128, 'Le mot de passe est trop long');

export const registerSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  profilePublic: z.boolean().optional().default(false),
});

// Disponibilite d'un identifiant, interrogee pendant la saisie a l'inscription :
// le joueur l'apprend en tapant, pas au moment de valider.
export const usernameCheckSchema = z.object({
  username: usernameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
});

// Jeton de session longue, echange contre un nouveau couple de jetons (rotation).
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20, 'Jeton de session invalide'),
});

// --- Mot de passe oublie ---

// On demande un code par email. La reponse ne dit jamais si l'adresse existe.
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Code a 6 chiffres recu par email, puis nouveau mot de passe.
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Le code comporte 6 chiffres'),
  newPassword: passwordSchema,
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
    username: usernameSchema.optional(),
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
export type UsernameCheckInput = z.infer<typeof usernameCheckSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileRequest = z.input<typeof updateProfileSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
