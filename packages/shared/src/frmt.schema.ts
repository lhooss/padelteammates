import { z } from 'zod';

// Classement national padel de la FRMT : categories Messieurs / Dames.
export const FRMT_CATEGORIES = ['MEN', 'WOMEN'] as const;
export type FrmtCategory = (typeof FRMT_CATEGORIES)[number];

// Recherche d'un joueur dans le classement importe.
export const frmtSearchSchema = z.object({
  q: z.string().trim().min(2, 'Tapez au moins 2 lettres').max(80),
  category: z.enum(FRMT_CATEGORIES).optional(),
});

// Demande de lien entre son profil et une ligne du classement (identite FRMT).
export const frmtLinkSchema = z.object({
  category: z.enum(FRMT_CATEGORIES),
  fullName: z.string().min(2).max(120),
  birthYear: z.number().int().min(1900).max(2100).nullable(),
});

export type FrmtSearchInput = z.infer<typeof frmtSearchSchema>;
export type FrmtLinkInput = z.infer<typeof frmtLinkSchema>;
