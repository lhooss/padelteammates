import type { Match, Team } from '@/api/types';

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

// Places libres par equipe (2 joueurs max par equipe).
export function freeSpots(match: Match): Record<Team, number> {
  const taken = (team: Team) => match.participants.filter((p) => p.team === team).length;
  return { A: 2 - taken('A'), B: 2 - taken('B') };
}

// L'organisateur peut encore inviter : match planifie avec au moins une place libre.
export function canInvitePlayers(match: Match, meId: string): boolean {
  const spots = freeSpots(match);
  return match.createdById === meId && match.status === 'PLANNED' && spots.A + spots.B > 0;
}
