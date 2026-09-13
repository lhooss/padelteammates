import type { Express } from 'express';
import request from 'supertest';
import { prisma } from '../src/config/prisma.js';
import { redis } from '../src/config/redis.js';

// Vide toutes les tables entre les tests (isolation).
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Notification","Score","JoinRequest","Participant","Match","Club","Friendship","FrmtLink","FrmtRankingEntry","FrmtImport","RefreshToken","PushToken","User" RESTART IDENTITY CASCADE;',
  );
  await redis.flushdb();
}

export async function teardown(): Promise<void> {
  await prisma.$disconnect();
  redis.disconnect();
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

// Inscrit un joueur via l'API et renvoie {id, email, token}.
export async function registerUser(
  app: Express,
  overrides: Partial<{ name: string; email: string; password: string; profilePublic: boolean }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user_${Math.floor(performance.now() * 1000)}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: overrides.name ?? 'Joueur Test',
      email,
      password: overrides.password ?? 'password123',
      profilePublic: overrides.profilePublic ?? false,
    })
    .expect(201);
  return { id: res.body.user.id, email, token: res.body.token };
}

// Inscrit un joueur puis le promeut ADMIN, et renvoie un token frais avec le role admin.
export async function registerAdmin(app: Express): Promise<TestUser> {
  const user = await registerUser(app, { email: `admin_${Math.floor(performance.now() * 1000)}@example.com` });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  // Re-login pour obtenir un JWT portant le role ADMIN.
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'password123' })
    .expect(200);
  return { ...user, token: res.body.token };
}

// Rend deux joueurs amis via l'API (demande de `a`, acceptee par `b`).
export async function makeFriends(app: Express, a: TestUser, b: TestUser): Promise<void> {
  await request(app).post(`/api/friends/${b.id}`).set('Authorization', auth(a.token)).expect(201);
  await request(app).post(`/api/friends/${a.id}/accept`).set('Authorization', auth(b.token)).expect(200);
}

export function auth(token: string): string {
  return `Bearer ${token}`;
}

// Jour (AAAA-MM-JJ) situe `days` jours apres aujourd'hui :
// les tests restent valides quelle que soit leur date d'execution.
export function dayFromToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Simule un match deja joue : le deplace a la veille, son creneau est donc termine.
// (L'API refuse de creer un match dans le passe.)
export async function moveMatchToPast(matchId: string): Promise<void> {
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await prisma.match.update({ where: { id: matchId }, data: { date: yesterday } });
}
