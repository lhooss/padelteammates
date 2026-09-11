// Formes des reponses de l'API (apps/api). Les dates arrivent en chaines ISO.

export type Team = 'A' | 'B';
export type MatchStatus = 'PLANNED' | 'PENDING' | 'COMPLETED';
export type PresenceStatus = 'INVITED' | 'CONFIRMED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  profilePublic: boolean;
  wins: number;
  losses: number;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Club {
  id: string;
  name: string;
  city: string;
}

export interface Participant {
  id: string;
  userId: string;
  matchId: string;
  team: Team;
  presenceStatus: PresenceStatus;
  user: { id: string; name: string };
}

export interface Score {
  id: string;
  matchId: string;
  gamesPlayed: number;
  winningTeam: Team | null;
  validators: string[];
  enteredById: string;
}

// Relation de l'utilisateur connecte avec un autre joueur.
export type FriendshipState = 'SELF' | 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED';

export interface PlayerSummary {
  id: string;
  name: string;
}

export interface PlayerSearchResult extends PlayerSummary {
  friendship: FriendshipState;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  played: number;
  winRate: number;
}

export interface PlayerProfile extends PlayerSummary {
  profilePublic: boolean;
  friendship: FriendshipState;
  stats: PlayerStats | null; // null : profil prive et pas ami
}

export interface FriendRequests {
  received: { user: PlayerSummary; createdAt: string }[];
  sent: { user: PlayerSummary; createdAt: string }[];
}

// Corps de POST /api/matches (valide cote app avec createMatchSchema de packages/shared).
export interface CreateMatchRequest {
  clubId: string;
  date: string; // "AAAA-MM-JJ"
  slot: string; // "HH:MM-HH:MM"
  creatorTeam: Team;
  invites: { userId: string; team: Team }[];
}

export interface Match {
  id: string;
  date: string; // jour du match, minuit UTC
  slot: string; // "18:00-19:30", heure de Kenitra
  status: MatchStatus;
  clubId: string;
  createdById: string;
  club: Club;
  participants: Participant[];
  score?: Score | null; // absent du calendrier
}
