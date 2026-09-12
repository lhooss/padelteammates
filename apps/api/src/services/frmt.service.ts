import type { FrmtLink } from '@prisma/client';
import type { FrmtCategory, FrmtLinkInput } from '@padelteammates/shared';
import { prisma } from '../config/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { fetchFrmtCategory, type FrmtRow } from './frmt.client.js';
import { notify, notifyMany } from './notification.service.js';

// Source du classement : le site de la FRMT, ou une source factice dans les tests.
export type FrmtSource = (category: FrmtCategory) => Promise<FrmtRow[]>;

// Importe le classement Messieurs + Dames et remplace les lignes precedentes d'un bloc.
// Chaque tentative est tracee dans FrmtImport (volumes ou erreur).
export async function importFrmtRanking(source: FrmtSource = (category) => fetchFrmtCategory(category)) {
  const run = await prisma.frmtImport.create({ data: {} });
  try {
    const men = await source('MEN');
    const women = await source('WOMEN');
    if (men.length === 0) {
      throw new Error('Classement Messieurs vide : la page de la FRMT a peut-etre change');
    }
    const importedAt = new Date();
    await prisma.$transaction([
      prisma.frmtRankingEntry.deleteMany({}),
      prisma.frmtRankingEntry.createMany({
        data: [
          ...men.map((row) => ({ ...row, category: 'MEN' as const, importedAt })),
          ...women.map((row) => ({ ...row, category: 'WOMEN' as const, importedAt })),
        ],
      }),
    ]);
    return prisma.frmtImport.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), menCount: men.length, womenCount: women.length },
    });
  } catch (err) {
    await prisma.frmtImport.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

export async function importStatus() {
  const [lastAttempt, lastSuccess] = await Promise.all([
    prisma.frmtImport.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.frmtImport.findFirst({ where: { error: null, finishedAt: { not: null } }, orderBy: { startedAt: 'desc' } }),
  ]);
  return { lastAttempt, lastSuccess };
}

export function searchRanking(query: string, category?: FrmtCategory) {
  return prisma.frmtRankingEntry.findMany({
    where: { fullName: { contains: query, mode: 'insensitive' }, ...(category ? { category } : {}) },
    orderBy: [{ category: 'asc' }, { rank: 'asc' }],
    take: 30,
  });
}

type Identity = Pick<FrmtLink, 'category' | 'fullName' | 'birthYear'>;

function findEntry(identity: Identity) {
  return prisma.frmtRankingEntry.findFirst({
    where: { category: identity.category, fullName: identity.fullName, birthYear: identity.birthYear },
  });
}

// Classement FRMT d'un joueur, pour son profil. Les autres ne voient qu'un lien valide.
export async function frmtSummaryFor(userId: string, { includePending }: { includePending: boolean }) {
  const link = await prisma.frmtLink.findUnique({ where: { userId } });
  if (!link || (link.status !== 'VERIFIED' && !includePending)) return null;
  const entry = await findEntry(link);
  return {
    status: link.status,
    category: link.category,
    fullName: link.fullName,
    birthYear: link.birthYear,
    // null : le joueur n'apparait plus dans le dernier classement importe.
    rank: entry?.rank ?? null,
    points: entry?.points ?? null,
    evolution: entry?.evolution ?? null,
    club: entry?.club ?? null,
    importedAt: entry?.importedAt ?? null,
  };
}

// Le joueur demande a relier son profil a une ligne du classement : l'admin validera.
export async function linkMyRanking(userId: string, input: FrmtLinkInput) {
  const entry = await findEntry(input);
  if (!entry) throw new NotFoundError('Joueur introuvable dans le classement FRMT importe');

  const taken = await prisma.frmtLink.findFirst({
    where: { ...identityOf(input), status: 'VERIFIED', userId: { not: userId } },
  });
  if (taken) throw new ConflictError('Ce classement est deja relie a un autre joueur');

  await prisma.frmtLink.upsert({
    where: { userId },
    create: { userId, ...identityOf(input) },
    update: { ...identityOf(input), status: 'PENDING', reviewedAt: null },
  });

  const [me, admins] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }),
  ]);
  await notifyMany(
    admins.map((a) => a.id),
    {
      type: 'FRMT_LINK_REQUEST',
      message: `${me.name} demande à relier son profil au classement FRMT (${entry.fullName}, ${entry.rank}e).`,
    },
  );
  return frmtSummaryFor(userId, { includePending: true });
}

export async function unlinkMyRanking(userId: string): Promise<void> {
  const { count } = await prisma.frmtLink.deleteMany({ where: { userId } });
  if (count === 0) throw new NotFoundError('Aucun classement FRMT relie a votre profil');
}

// --- Administration ---

export async function listPendingLinks() {
  const links = await prisma.frmtLink.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(
    links.map(async (link) => ({
      id: link.id,
      category: link.category,
      fullName: link.fullName,
      birthYear: link.birthYear,
      createdAt: link.createdAt,
      user: link.user,
      entry: await findEntry(link),
    })),
  );
}

export async function verifyLink(linkId: string) {
  const link = await prisma.frmtLink.findUnique({ where: { id: linkId } });
  if (!link) throw new NotFoundError('Demande introuvable');
  await prisma.frmtLink.update({ where: { id: linkId }, data: { status: 'VERIFIED', reviewedAt: new Date() } });
  await notify({
    userId: link.userId,
    type: 'FRMT_LINK_VERIFIED',
    message: 'Votre classement FRMT est validé : il est affiché sur votre profil.',
  });
  return frmtSummaryFor(link.userId, { includePending: true });
}

export async function rejectLink(linkId: string): Promise<void> {
  const link = await prisma.frmtLink.findUnique({ where: { id: linkId } });
  if (!link) throw new NotFoundError('Demande introuvable');
  await prisma.frmtLink.delete({ where: { id: linkId } });
  await notify({
    userId: link.userId,
    type: 'FRMT_LINK_REJECTED',
    message: "Votre demande de lien avec le classement FRMT n'a pas été validée.",
  });
}

function identityOf(input: FrmtLinkInput): Identity {
  return { category: input.category, fullName: input.fullName, birthYear: input.birthYear };
}
