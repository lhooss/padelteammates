import { z } from 'zod';

const teamSchema = z.enum(['A', 'B']);

// Creneau au format "HH:MM-HH:MM" (ex: "18:00-19:30"), debut < fin.
const slotSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/, 'Creneau invalide (attendu HH:MM-HH:MM)')
  .refine((s) => {
    const [start, end] = s.split('-') as [string, string];
    return start < end;
  }, 'Le debut du creneau doit preceder la fin');

// Date du match: on accepte une date ISO (jour), pas dans le passe.
const matchDateSchema = z.coerce.date().refine((d) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}, 'La date du match ne peut pas etre dans le passe');

const inviteSchema = z.object({
  userId: z.string().cuid(),
  team: teamSchema,
});

export const createMatchSchema = z
  .object({
    clubId: z.string().cuid(),
    date: matchDateSchema,
    slot: slotSchema,
    creatorTeam: teamSchema,
    invites: z.array(inviteSchema).max(3).default([]),
  })
  .superRefine((data, ctx) => {
    const all = [{ userId: '__creator__', team: data.creatorTeam }, ...data.invites];

    // Total joueurs <= 4 (padel double).
    if (all.length > 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Un match compte au maximum 4 joueurs' });
    }

    // Au maximum 2 joueurs par equipe.
    const countA = all.filter((p) => p.team === 'A').length;
    const countB = all.filter((p) => p.team === 'B').length;
    if (countA > 2 || countB > 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Chaque equipe compte au maximum 2 joueurs' });
    }

    // Pas d'invitation en double.
    const ids = data.invites.map((i) => i.userId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invitations en double detectees' });
    }
  });

// Reponse d'un invite a une invitation.
export const respondInviteSchema = z.object({
  accept: z.boolean(),
});

// Ajout de joueurs a un match deja cree (places libres). La place restante
// dans chaque equipe est verifiee par l'API, qui connait les participants.
export const addInvitesSchema = z
  .object({
    invites: z.array(inviteSchema).min(1, 'Choisissez au moins un joueur').max(3),
  })
  .refine(
    (data) => new Set(data.invites.map((i) => i.userId)).size === data.invites.length,
    'Invitations en double detectees',
  );

// Demande pour rejoindre un match depuis le calendrier : equipe souhaitee (place libre).
export const joinRequestSchema = z.object({
  team: teamSchema,
});

// Filtre du calendrier hebdomadaire: date de reference (defaut = semaine courante).
export const weeklyCalendarSchema = z.object({
  from: z.coerce.date().optional(),
  clubId: z.string().cuid().optional(),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type RespondInviteInput = z.infer<typeof respondInviteSchema>;
export type AddInvitesInput = z.infer<typeof addInvitesSchema>;
export type WeeklyCalendarInput = z.infer<typeof weeklyCalendarSchema>;
