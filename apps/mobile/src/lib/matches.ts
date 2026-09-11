import type { Match } from '@/api/types';

export function isParticipant(match: Match, meId: string | undefined): boolean {
  return meId !== undefined && match.participants.some((p) => p.userId === meId);
}

// Invitation a laquelle l'utilisateur n'a pas encore repondu.
export function isPendingInvitation(match: Match, meId: string): boolean {
  return (
    match.status === 'PLANNED' &&
    match.participants.some((p) => p.userId === meId && p.presenceStatus === 'INVITED')
  );
}
