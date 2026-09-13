import { z } from 'zod';

const teamSchema = z.enum(['A', 'B']);

const MINUTES_PER_DAY = 24 * 60;
// Un match de padel dure 1h a 1h30 ; on borne large sans laisser passer l'absurde.
const SLOT_MAX_MINUTES = 3 * 60;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

// Duree d'un creneau, en tenant compte des creneaux tardifs qui passent minuit.
export function slotDurationMinutes(slot: string): number {
  const [start, end] = slot.split('-') as [string, string];
  return (timeToMinutes(end) - timeToMinutes(start) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// Creneau au format "HH:MM-HH:MM" (ex: "18:00-19:30"). La fin peut tomber apres
// minuit ("23:00-00:30") : a Kenitra on joue tard. Seule la duree est bornee.
const slotSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/, 'Creneau invalide (attendu HH:MM-HH:MM)')
  .refine((s) => {
    const minutes = slotDurationMinutes(s);
    return minutes > 0 && minutes <= SLOT_MAX_MINUTES;
  }, 'Duree de creneau invalide (au plus 3 heures)');

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

// Qui voit le match : toute la communaute, les amis de l'organisateur, ou ses seuls joueurs.
export const matchVisibilitySchema = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']);

export const updateVisibilitySchema = z.object({
  visibility: matchVisibilitySchema,
});

export const createMatchSchema = z
  .object({
    clubId: z.string().cuid(),
    date: matchDateSchema,
    slot: slotSchema,
    creatorTeam: teamSchema,
    invites: z.array(inviteSchema).max(3).default([]),
    visibility: matchVisibilitySchema.default('PUBLIC'),
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

// Reservation du terrain au club, confirmee (true) ou retiree (false) par un joueur du match.
export const courtBookingSchema = z.object({
  booked: z.boolean(),
});

// Filtre du calendrier hebdomadaire: date de reference (defaut = semaine courante).
export const weeklyCalendarSchema = z.object({
  from: z.coerce.date().optional(),
  clubId: z.string().cuid().optional(),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type RespondInviteInput = z.infer<typeof respondInviteSchema>;
export type AddInvitesInput = z.infer<typeof addInvitesSchema>;
export type CourtBookingInput = z.infer<typeof courtBookingSchema>;
export type MatchVisibility = z.infer<typeof matchVisibilitySchema>;
export type UpdateVisibilityInput = z.infer<typeof updateVisibilitySchema>;
export type WeeklyCalendarInput = z.infer<typeof weeklyCalendarSchema>;
