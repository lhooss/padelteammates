// Formes des reponses de l'API (apps/api). Les dates arrivent en chaines ISO.
import type { CourtSide, Hand, PlayerLevel } from '@padelteammates/shared';

export type Team = 'A' | 'B';
export type MatchStatus = 'PLANNED' | 'PENDING' | 'COMPLETED';
export type PresenceStatus = 'INVITED' | 'CONFIRMED';

// Profil padel d'un joueur (visible de tous).
export interface PadelProfile {
  preferredSide: CourtSide | null;
  level: PlayerLevel | null;
  dominantHand: Hand | null;
  homeClub: { id: string; name: string } | null;
}

export interface User extends PadelProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  profilePublic: boolean;
  wins: number;
  losses: number;
  phone: string | null; // +212XXXXXXXXX
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

export interface SetScore {
  a: number; // jeux de l'equipe A
  b: number; // jeux de l'equipe B
}

// Composition finale + detail des parties (meme forme que submitScoreSchema).
export interface ScoreDetail {
  teams: Record<Team, string[]>;
  games: { sets: SetScore[] }[];
}

export interface Score {
  id: string;
  matchId: string;
  gamesPlayed: number;
  winningTeam: Team | null; // null : egalite
  validators: string[];
  enteredById: string;
  setsDetail: ScoreDetail;
}

export interface ValidateScoreResponse {
  score: Score;
  status: 'PENDING' | 'COMPLETED';
  awaitingTeams?: Team[];
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

export interface PlayerProfile extends PlayerSummary, PadelProfile {
  profilePublic: boolean;
  friendship: FriendshipState;
  phone: string | null; // seulement pour ses amis
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

// Demande d'un joueur pour rejoindre un match, en attente de l'organisateur.
export interface JoinRequest {
  id: string;
  matchId: string;
  userId: string;
  team: Team;
  createdAt: string;
  user: PlayerSummary;
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
  joinRequests?: JoinRequest[]; // dans le calendrier : seulement la mienne
}
