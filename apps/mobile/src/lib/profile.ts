import type { CourtSide, Hand, PlayerLevel } from '@padelteammates/shared';

import type { PadelProfile } from '@/api/types';

export const SIDE_LABEL: Record<CourtSide, string> = {
  LEFT: 'Gauche',
  RIGHT: 'Droite',
  BOTH: 'Les deux côtés',
};

export const LEVEL_LABEL: Record<PlayerLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Confirmé',
  EXPERT: 'Expert',
};

export const HAND_LABEL: Record<Hand, string> = {
  RIGHT: 'Droitier',
  LEFT: 'Gaucher',
};

// "+212612345678" -> "06 12 34 56 78"
export function formatPhone(phone: string): string {
  const local = phone.startsWith('+212') ? `0${phone.slice(4)}` : phone;
  return local.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

// Lien pour ecrire au joueur sur WhatsApp.
export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

// Lignes "Libelle : valeur" du profil padel.
export function padelProfileRows(profile: PadelProfile): { label: string; value: string | null }[] {
  return [
    { label: 'Niveau', value: profile.level ? LEVEL_LABEL[profile.level] : null },
    { label: 'Côté préféré', value: profile.preferredSide ? SIDE_LABEL[profile.preferredSide] : null },
    { label: 'Main', value: profile.dominantHand ? HAND_LABEL[profile.dominantHand] : null },
    { label: 'Club habituel', value: profile.homeClub?.name ?? null },
  ];
}
