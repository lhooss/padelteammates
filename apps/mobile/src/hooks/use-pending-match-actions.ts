import { isPendingInvitation, scoreAction } from '@/lib/matches';
import { useMeQuery, useMyMatchesQuery } from '@/store/api';

// Matchs qui attendent une action de l'utilisateur (badge de l'onglet "Mes matchs") :
// invitation a laquelle repondre, score a saisir ou a valider.
export function usePendingMatchActions(): number {
  const { data: me } = useMeQuery();
  const { data: matches } = useMyMatchesQuery();
  if (!me || !matches) return 0;
  return matches.filter((m) => {
    const action = scoreAction(m, me.id);
    return isPendingInvitation(m, me.id) || action === 'enter' || action === 'validate';
  }).length;
}
