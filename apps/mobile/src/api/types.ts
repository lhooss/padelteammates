// Formes des reponses de l'API (apps/api). Les dates arrivent en chaines ISO.
import type { CourtSide, FrmtCategory, Hand, PlayerLevel } from '@padelteammates/shared';

export type Team = 'A' | 'B';
export type MatchStatus = 'PLANNED' | 'PENDING' | 'COMPLETED';
// Qui voit le match : toute la communaute, les amis de l'organisateur, ses joueurs.
export type MatchVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type PresenceStatus = 'INVITED' | 'CONFIRMED';

// Profil padel d'un joueur (visible de tous).
export interface PadelProfile {
  preferredSide: CourtSide | null;
  level: PlayerLevel | null;
  dominantHand: Hand | null;
  homeClub: { id: string; name: string } | null;
}

// Classement national FRMT relie au profil (valide par l'admin, ou en attente pour soi).
export interface FrmtSummary {
  status: 'PENDING' | 'VERIFIED';
  category: FrmtCategory;
  fullName: string;
  birthYear: number | null;
  rank: number | null; // null : absent du dernier classement importe
  points: number | null;
  evolution: number | null;
  club: string | null;
  importedAt: string | null;
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
  frmt?: FrmtSummary | null; // renvoye par GET /me
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string; // jeton d'acces, courte duree
  refreshToken: string; // jeton de session de cet appareil
}

export interface Club {
  id: string;
  name: string;
  city: string;
  active: boolean; // un club desactive n'est plus propose, son historique reste
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
  frmt: FrmtSummary | null; // seulement s'il est valide (sauf pour soi)
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
  visibility: MatchVisibility;
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
  visibility: MatchVisibility;
  clubId: string;
  createdById: string;
  courtBookedAt: string | null; // null : terrain pas encore reserve au club
  courtBookedById: string | null; // le joueur du match qui a confirme
  club: Club;
  participants: Participant[];
  score?: Score | null; // absent du calendrier
  joinRequests?: JoinRequest[]; // dans le calendrier : seulement la mienne
}

// --- Classement FRMT ---

export interface FrmtRankingEntry {
  id: string;
  category: FrmtCategory;
  rank: number;
  evolution: number | null;
  fullName: string;
  birthYear: number | null;
  club: string | null;
  nationality: string | null;
  points: number;
  importedAt: string;
}

export interface FrmtImportRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  menCount: number;
  womenCount: number;
  error: string | null;
}

export interface FrmtImportStatus {
  lastAttempt: FrmtImportRun | null;
  lastSuccess: FrmtImportRun | null;
}

// --- Notifications in-app ---

export type NotificationType =
  | 'INVITE'
  | 'SCORE_ENTERED'
  | 'SCORE_VALIDATED'
  | 'MATCH_COMPLETED'
  | 'MATCH_CANCELLED'
  | 'COURT_BOOKED'
  | 'PLAYER_LEFT'
  | 'PLAYER_REMOVED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'JOIN_REQUEST'
  | 'JOIN_ACCEPTED'
  | 'JOIN_DECLINED'
  | 'FRMT_LINK_REQUEST'
  | 'FRMT_LINK_VERIFIED'
  | 'FRMT_LINK_REJECTED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  matchId: string | null;
  createdAt: string;
}

// Demande de lien a valider (ecran admin).
export interface FrmtPendingLink {
  id: string;
  category: FrmtCategory;
  fullName: string;
  birthYear: number | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  entry: FrmtRankingEntry | null;
}
