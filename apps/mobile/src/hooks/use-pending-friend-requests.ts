import { useFriendRequestsQuery } from '@/store/api';

// Nombre de demandes d'ami recues en attente (badge de l'onglet "Amis").
export function usePendingFriendRequests(): number {
  const { data } = useFriendRequestsQuery();
  return data?.received.length ?? 0;
}
