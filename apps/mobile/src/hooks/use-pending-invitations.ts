import { isPendingInvitation } from '@/lib/matches';
import { useMeQuery, useMyMatchesQuery } from '@/store/api';

// Nombre d'invitations en attente (badge de l'onglet "Mes matchs").
export function usePendingInvitations(): number {
  const { data: me } = useMeQuery();
  const { data: matches } = useMyMatchesQuery();
  if (!me || !matches) return 0;
  return matches.filter((m) => isPendingInvitation(m, me.id)).length;
}
