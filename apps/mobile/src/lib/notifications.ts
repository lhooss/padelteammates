import type { Href } from 'expo-router';

import type { AppNotification, NotificationType } from '@/api/types';

const LABEL: Record<NotificationType, string> = {
  INVITE: 'Match',
  SCORE_ENTERED: 'Score à valider',
  SCORE_VALIDATED: 'Score',
  MATCH_COMPLETED: 'Match terminé',
  MATCH_CANCELLED: 'Match annulé',
  COURT_BOOKED: 'Terrain',
  PLAYER_LEFT: 'Départ d\'un joueur',
  PLAYER_REMOVED: 'Retiré du match',
  FRIEND_REQUEST: "Demande d'ami",
  FRIEND_ACCEPTED: 'Nouvel ami',
  JOIN_REQUEST: 'Demande pour rejoindre',
  JOIN_ACCEPTED: 'Demande acceptée',
  JOIN_DECLINED: 'Demande non retenue',
  FRMT_LINK_REQUEST: 'Classement FRMT à valider',
  FRMT_LINK_VERIFIED: 'Classement FRMT validé',
  FRMT_LINK_REJECTED: 'Classement FRMT refusé',
};

export function notificationLabel(type: NotificationType): string {
  return LABEL[type] ?? 'Notification';
}

// Ecran a ouvrir quand on touche une notification (null : rien a ouvrir).
export function notificationTarget(notification: AppNotification, isAdmin: boolean): Href | null {
  switch (notification.type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return '/friends';
    case 'FRMT_LINK_REQUEST':
      return isAdmin ? '/admin/frmt' : null;
    case 'FRMT_LINK_VERIFIED':
    case 'FRMT_LINK_REJECTED':
      return '/profile';
    default:
      // Invitations, scores, demandes pour rejoindre : tout se traite dans "Mes matchs".
      return notification.matchId ? '/matches' : null;
  }
}

// "a l'instant", "il y a 5 min", "il y a 3 h", "hier", "il y a 4 jours", puis la date.
export function timeAgo(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return `le ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}
