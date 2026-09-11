import type { Match, Score, Team } from '@/api/types';

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

// Fin du creneau. Les joueurs sont a Kenitra : l'heure locale du telephone suffit
// (l'API, qui fait foi, reverifie avec le fuseau Africa/Casablanca).
export function hasSlotEnded(match: Match, now = new Date()): boolean {
  const day = new Date(match.date);
  const [hours, minutes] = (match.slot.split('-')[1] ?? '00:00').split(':').map(Number) as [number, number];
  const end = new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hours, minutes);
  return now.getTime() >= end.getTime();
}

// Equipe d'un joueur dans la composition finale saisie.
export function teamInScore(score: Score, userId: string): Team | undefined {
  if (score.setsDetail.teams.A.includes(userId)) return 'A';
  if (score.setsDetail.teams.B.includes(userId)) return 'B';
  return undefined;
}

// Ce que l'utilisateur doit (ou peut) faire sur le score d'un match :
// - "enter"    : creneau termine, 4 joueurs confirmes, pas encore de saisie ;
// - "validate" : une saisie attend la validation de son equipe ;
// - "waiting"  : son equipe a valide, on attend l'equipe adverse.
export type ScoreAction = 'enter' | 'validate' | 'waiting';

export function scoreAction(match: Match, meId: string, now = new Date()): ScoreAction | null {
  const me = match.participants.find((p) => p.userId === meId);
  if (!me || me.presenceStatus !== 'CONFIRMED') return null;

  if (match.status === 'PLANNED') {
    const confirmed = match.participants.filter((p) => p.presenceStatus === 'CONFIRMED').length;
    return confirmed === 4 && hasSlotEnded(match, now) ? 'enter' : null;
  }
  if (match.status === 'PENDING' && match.score) {
    const myTeam = teamInScore(match.score, meId);
    if (!myTeam) return null;
    const validated = match.score.validators.some((id) => teamInScore(match.score!, id) === myTeam);
    return validated ? 'waiting' : 'validate';
  }
  return null;
}
