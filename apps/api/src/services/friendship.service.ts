import type { Friendship } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';
import { notify } from './notification.service.js';

// Relation d'un joueur (le "viewer") avec un autre joueur.
export type FriendshipState = 'SELF' | 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED';

const PLAYER_SELECT = { id: true, name: true } as const;

export function friendshipState(
  viewerId: string,
  otherId: string,
  friendship: Friendship | null | undefined,
): FriendshipState {
  if (viewerId === otherId) return 'SELF';
  if (!friendship) return 'NONE';
  if (friendship.status === 'ACCEPTED') return 'FRIENDS';
  return friendship.requesterId === viewerId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED';
}

// Relation entre deux joueurs, quel que soit le sens de la demande.
export function findFriendship(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

// Relations du viewer avec une liste de joueurs, indexees par l'id de l'autre joueur.
export async function friendshipsWith(viewerId: string, otherIds: string[]): Promise<Map<string, Friendship>> {
  if (otherIds.length === 0) return new Map();
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: { in: otherIds } },
        { addresseeId: viewerId, requesterId: { in: otherIds } },
      ],
    },
  });
  return new Map(rows.map((f) => [f.requesterId === viewerId ? f.addresseeId : f.requesterId, f]));
}

export async function friendIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return new Set(rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)));
}

// Envoie une demande d'ami. Si l'autre joueur m'en avait deja envoye une, on devient amis.
export async function sendFriendRequest(userId: string, targetId: string): Promise<{ state: FriendshipState }> {
  if (userId === targetId) throw new BadRequestError('Vous ne pouvez pas vous ajouter vous-meme');
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw new NotFoundError('Joueur introuvable');

  const existing = await findFriendship(userId, targetId);
  if (existing?.status === 'ACCEPTED') throw new ConflictError('Vous etes deja amis');
  if (existing?.requesterId === userId) throw new ConflictError('Demande deja envoyee');
  if (existing) return acceptFriendRequest(userId, targetId);

  const requester = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  await prisma.$transaction(async (tx) => {
    await tx.friendship.create({ data: { requesterId: userId, addresseeId: targetId } });
    await notify(
      { userId: targetId, type: 'FRIEND_REQUEST', message: `${requester.name} vous a envoye une demande d'ami.` },
      tx,
    );
  });
  return { state: 'REQUEST_SENT' };
}

// Accepte la demande d'ami envoyee par `requesterId`.
export async function acceptFriendRequest(userId: string, requesterId: string): Promise<{ state: FriendshipState }> {
  const pending = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId, addresseeId: userId } },
  });
  if (!pending || pending.status !== 'PENDING') {
    throw new NotFoundError('Aucune demande d\'ami de ce joueur');
  }

  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  await prisma.$transaction(async (tx) => {
    await tx.friendship.update({ where: { id: pending.id }, data: { status: 'ACCEPTED' } });
    await notify(
      { userId: requesterId, type: 'FRIEND_ACCEPTED', message: `${me.name} a accepte votre demande d'ami.` },
      tx,
    );
  });
  return { state: 'FRIENDS' };
}

// Supprime la relation, quel que soit son etat : refuser une demande recue,
// annuler une demande envoyee ou retirer un ami.
export async function removeFriendship(userId: string, otherId: string): Promise<{ state: FriendshipState }> {
  const friendship = await findFriendship(userId, otherId);
  if (!friendship) throw new NotFoundError('Aucune relation avec ce joueur');
  await prisma.friendship.delete({ where: { id: friendship.id } });
  return { state: 'NONE' };
}

export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: { requester: { select: PLAYER_SELECT }, addressee: { select: PLAYER_SELECT } },
  });
  return rows
    .map((f) => (f.requesterId === userId ? f.addressee : f.requester))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Demandes en attente : recues (a accepter ou refuser) et envoyees (annulables).
export async function listFriendRequests(userId: string) {
  const [received, sent] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: { requester: { select: PLAYER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: { addressee: { select: PLAYER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    received: received.map((f) => ({ user: f.requester, createdAt: f.createdAt })),
    sent: sent.map((f) => ({ user: f.addressee, createdAt: f.createdAt })),
  };
}
