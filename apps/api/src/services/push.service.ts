import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

// Service de notifications push d'Expo : il relaie vers FCM (Android) et APNs (iOS).
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// L'API accepte au plus 100 messages par requete.
const BATCH_SIZE = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

// Titre affiche sur le telephone. Le corps est le message deja redige par le service metier.
const TITLES: Record<string, string> = {
  INVITE: 'Invitation à un match',
  SCORE_ENTERED: 'Score à valider',
  SCORE_VALIDATED: 'Score validé',
  MATCH_COMPLETED: 'Match terminé',
  MATCH_CANCELLED: 'Match annulé',
  COURT_BOOKED: 'Terrain',
  PLAYER_LEFT: 'Départ d\'un joueur',
  PLAYER_REMOVED: 'Match',
  FRIEND_REQUEST: 'Demande d\'ami',
  FRIEND_ACCEPTED: 'Nouvel ami',
  JOIN_REQUEST: 'Demande pour rejoindre',
  JOIN_ACCEPTED: 'Demande acceptée',
  JOIN_DECLINED: 'Demande non retenue',
  FRMT_LINK_REQUEST: 'Classement FRMT',
  FRMT_LINK_VERIFIED: 'Classement FRMT validé',
  FRMT_LINK_REJECTED: 'Classement FRMT',
};

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Envoie une notification push aux appareils de ces joueurs.
// Volontairement silencieux : une notification manquee ne doit jamais faire
// echouer l'action metier qui l'a declenchee (inviter, valider un score...).
export interface PushOutcome {
  devices: number; // appareils enregistres pour ces joueurs
  accepted: number; // messages acceptes par Expo
  errors: string[]; // refus d'Expo, tels quels (utile au diagnostic)
}

export async function sendPush(
  userIds: string[],
  notification: { type: string; message: string; matchId?: string | null },
): Promise<PushOutcome> {
  const outcome: PushOutcome = { devices: 0, accepted: 0, errors: [] };
  if (userIds.length === 0) return outcome;
  // La suite de tests ne doit joindre aucun service externe.
  if (env.NODE_ENV === 'test') return outcome;

  try {
    const devices = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
    outcome.devices = devices.length;
    if (devices.length === 0) return outcome;

    const title = TITLES[notification.type] ?? 'Padelteammates';

    for (const batch of chunk(devices, BATCH_SIZE)) {
      const messages = batch.map((device) => ({
        to: device.token,
        title,
        body: notification.message,
        sound: 'default' as const,
        channelId: 'default',
        // Permet a l'app d'ouvrir le bon ecran quand on touche la notification.
        data: { type: notification.type, matchId: notification.matchId ?? null },
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        const detail = `Expo a refuse l'envoi (HTTP ${response.status})`;
        console.error('[push]', detail);
        outcome.errors.push(detail);
        continue;
      }

      const body = (await response.json()) as { data?: ExpoTicket[] };
      const tickets = body.data ?? [];
      for (const ticket of tickets) {
        if (ticket.status === 'ok') outcome.accepted += 1;
        else if (ticket.message) {
          console.error('[push] refus:', ticket.message);
          outcome.errors.push(ticket.message);
        }
      }
      await dropUnregistered(batch.map((d) => d.token), tickets);
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[push] envoi impossible:', detail);
    outcome.errors.push(detail);
  }

  return outcome;
}

// Un appareil qui a desinstalle l'app renvoie "DeviceNotRegistered" : son jeton ne
// resservira jamais, on le supprime pour ne pas reessayer a chaque notification.
async function dropUnregistered(tokens: string[], tickets: ExpoTicket[]): Promise<void> {
  const dead = tokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered');
  if (dead.length === 0) return;
  await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
}

// Enregistre (ou reattribue) le jeton de cet appareil.
export async function registerPushToken(userId: string, token: string, platform: string): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId },
    // Le telephone a peut-etre change de main : le jeton suit le compte connecte.
    update: { userId, platform },
  });
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token, userId } });
}
