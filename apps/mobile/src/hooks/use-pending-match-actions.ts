import { needsMyAction } from '@/lib/matches';
import { useMeQuery, useMyMatchesQuery } from '@/store/api';

// Matchs qui attendent une action de l'utilisateur (badge de l'onglet "Mes matchs") :
// invitation, score a saisir ou a valider, demande pour rejoindre a traiter.
export function usePendingMatchActions(): number {
  const { data: me } = useMeQuery();
  const { data: matches } = useMyMatchesQuery();
  if (!me || !matches) return 0;
  return matches.filter((m) => needsMyAction(m, me.id)).length;
}
