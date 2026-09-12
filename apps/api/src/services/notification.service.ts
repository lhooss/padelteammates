import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

type NotificationType =
  | 'INVITE'
  | 'SCORE_ENTERED'
  | 'SCORE_VALIDATED'
  | 'MATCH_COMPLETED'
  | 'MATCH_CANCELLED'
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

interface CreateNotificationArgs {
  userId: string;
  type: NotificationType;
  message: string;
  matchId?: string;
}

// Notifications in-app (v0): simple ecriture en base, lues via l'API.
// Accepte un client transactionnel optionnel pour rester atomique avec l'action metier.
export async function notify(
  args: CreateNotificationArgs,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      message: args.message,
      matchId: args.matchId ?? null,
    },
  });
}

export async function notifyMany(
  userIds: string[],
  args: Omit<CreateNotificationArgs, 'userId'>,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (userIds.length === 0) return;
  await client.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: args.type,
      message: args.message,
      matchId: args.matchId ?? null,
    })),
  });
}

export function listNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  // updateMany garantit qu'on ne touche que ses propres notifications.
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
