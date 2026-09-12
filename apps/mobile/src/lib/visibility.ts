import type { Match, MatchVisibility } from '@/api/types';

export const VISIBILITY_OPTIONS: MatchVisibility[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

export const VISIBILITY_LABEL: Record<MatchVisibility, string> = {
  PUBLIC: 'Tout le monde',
  FRIENDS: 'Mes amis',
  PRIVATE: 'Privé',
};

export const VISIBILITY_HINT: Record<MatchVisibility, string> = {
  PUBLIC: 'Visible de toute la communauté : n\'importe qui peut demander une place libre.',
  FRIENDS: 'Visible de vos amis seulement : eux seuls peuvent demander une place libre.',
  PRIVATE: 'Visible des joueurs du match uniquement. Personne ne peut demander à le rejoindre.',
};

// Defaut a la planification, selon l'intention : un match a completer cherche des
// joueurs, un match deja complet n'a aucune raison de s'afficher a toute la ville.
export function defaultVisibility(invitedCount: number): MatchVisibility {
  return invitedCount >= 3 ? 'FRIENDS' : 'PUBLIC';
}

// Mention affichee sur la carte : rien pour un match public, c'est le cas courant.
export function visibilityTag(match: Match): string | null {
  return match.visibility === 'PUBLIC' ? null : VISIBILITY_LABEL[match.visibility];
}
