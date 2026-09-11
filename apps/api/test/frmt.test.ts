import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { FrmtRow } from '../src/services/frmt.client.js';
import { importFrmtRanking, type FrmtSource } from '../src/services/frmt.service.js';
import { auth, registerAdmin, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

const row = (rank: number, fullName: string, birthYear: number, points: number, evolution: number | null = null): FrmtRow => ({
  rank,
  evolution,
  fullName,
  birthYear,
  club: 'COC',
  nationality: 'MAR',
  points,
});

// Classement fictif (aucun appel au site de la FRMT dans les tests).
const source =
  (men: FrmtRow[], women: FrmtRow[] = []): FrmtSource =>
  async (category) =>
    category === 'MEN' ? men : women;

const IDENTITY = { category: 'MEN', fullName: 'BENNANI YOUSSEF', birthYear: 2001 } as const;

function linkRanking(user: TestUser, body: object = IDENTITY) {
  return request(app).put('/api/frmt/link').set('Authorization', auth(user.token)).send(body);
}

function profileOf(viewer: TestUser, target: TestUser) {
  return request(app).get(`/api/users/${target.id}`).set('Authorization', auth(viewer.token)).expect(200);
}

describe('Classement FRMT — import', () => {
  it('importe Messieurs + Dames et remplace le classement precedent', async () => {
    await importFrmtRanking(source([row(1, 'BENNANI YOUSSEF', 2001, 23100), row(2, 'EL AMRANI SAMI', 1995, 6413)]));
    const run = await importFrmtRanking(source([row(1, 'EL AMRANI SAMI', 1995, 9000, 1)], [row(1, 'ALAOUI SARA', 1999, 5000)]));
    expect(run).toMatchObject({ menCount: 1, womenCount: 1, error: null });

    const player = await registerUser(app, { email: 'p@example.com' });
    const search = await request(app)
      .get('/api/frmt/ranking?q=amrani')
      .set('Authorization', auth(player.token))
      .expect(200);
    expect(search.body).toEqual([expect.objectContaining({ fullName: 'EL AMRANI SAMI', rank: 1, points: 9000, evolution: 1 })]);
  });

  it('trace l\'echec d\'un import sans toucher au classement en place', async () => {
    await importFrmtRanking(source([row(1, 'BENNANI YOUSSEF', 2001, 23100)]));
    await expect(importFrmtRanking(source([]))).rejects.toThrow(/vide/);

    const player = await registerUser(app, { email: 'p@example.com' });
    const status = await request(app).get('/api/frmt/status').set('Authorization', auth(player.token)).expect(200);
    expect(status.body.lastAttempt.error).toMatch(/vide/);
    expect(status.body.lastSuccess.menCount).toBe(1);
    const search = await request(app).get('/api/frmt/ranking?q=bennani').set('Authorization', auth(player.token));
    expect(search.body).toHaveLength(1);
  });
});

describe('Classement FRMT — lien avec le profil, valide par l\'admin', () => {
  it('le joueur demande le lien, l\'admin valide : le classement apparait sur son profil', async () => {
    await importFrmtRanking(source([row(1, 'BENNANI YOUSSEF', 2001, 23100)]));
    const admin = await registerAdmin(app);
    const player = await registerUser(app, { email: 'youssef@example.com' });
    const other = await registerUser(app, { email: 'other@example.com' });

    const pending = await linkRanking(player).expect(200);
    expect(pending.body).toMatchObject({ status: 'PENDING', rank: 1, points: 23100 });

    // En attente : visible par le joueur (via /me), pas par les autres.
    const me = await request(app).get('/api/auth/me').set('Authorization', auth(player.token)).expect(200);
    expect(me.body.frmt).toMatchObject({ status: 'PENDING' });
    expect((await profileOf(other, player)).body.frmt).toBeNull();

    // L'admin est notifie et voit la demande.
    const notifs = await request(app).get('/api/notifications').set('Authorization', auth(admin.token));
    expect(notifs.body.map((n: { type: string }) => n.type)).toContain('FRMT_LINK_REQUEST');
    const links = await request(app).get('/api/frmt/links').set('Authorization', auth(admin.token)).expect(200);
    expect(links.body).toEqual([
      expect.objectContaining({ fullName: 'BENNANI YOUSSEF', user: expect.objectContaining({ id: player.id }), entry: expect.objectContaining({ rank: 1 }) }),
    ]);

    await request(app).post(`/api/frmt/links/${links.body[0].id}/verify`).set('Authorization', auth(admin.token)).expect(200);
    expect((await profileOf(other, player)).body.frmt).toMatchObject({ status: 'VERIFIED', rank: 1, points: 23100, category: 'MEN' });

    // Un nouvel import met a jour le rang affiche (le lien porte l'identite, pas une ligne).
    await importFrmtRanking(source([row(1, 'EL AMRANI SAMI', 1995, 30000), row(2, 'BENNANI YOUSSEF', 2001, 24000, -1)]));
    expect((await profileOf(other, player)).body.frmt).toMatchObject({ rank: 2, points: 24000, evolution: -1 });
  });

  it('refuse un joueur absent du classement (404) ou deja relie a un autre (409)', async () => {
    await importFrmtRanking(source([row(1, 'BENNANI YOUSSEF', 2001, 23100)]));
    const admin = await registerAdmin(app);
    const first = await registerUser(app, { email: 'first@example.com' });
    const second = await registerUser(app, { email: 'second@example.com' });

    await linkRanking(first, { ...IDENTITY, birthYear: 1990 }).expect(404);
    await linkRanking(first).expect(200);
    const links = await request(app).get('/api/frmt/links').set('Authorization', auth(admin.token));
    await request(app).post(`/api/frmt/links/${links.body[0].id}/verify`).set('Authorization', auth(admin.token)).expect(200);

    await linkRanking(second).expect(409);
  });

  it('seul l\'admin valide ou refuse ; un refus supprime la demande et previent le joueur', async () => {
    await importFrmtRanking(source([row(1, 'BENNANI YOUSSEF', 2001, 23100)]));
    const admin = await registerAdmin(app);
    const player = await registerUser(app, { email: 'player@example.com' });
    await linkRanking(player).expect(200);

    await request(app).get('/api/frmt/links').set('Authorization', auth(player.token)).expect(403);
    const links = await request(app).get('/api/frmt/links').set('Authorization', auth(admin.token));
    await request(app).post(`/api/frmt/links/${links.body[0].id}/verify`).set('Authorization', auth(player.token)).expect(403);

    await request(app).delete(`/api/frmt/links/${links.body[0].id}`).set('Authorization', auth(admin.token)).expect(204);
    const me = await request(app).get('/api/auth/me').set('Authorization', auth(player.token));
    expect(me.body.frmt).toBeNull();
    const notifs = await request(app).get('/api/notifications').set('Authorization', auth(player.token));
    expect(notifs.body.map((n: { type: string }) => n.type)).toContain('FRMT_LINK_REJECTED');
  });

  it('le joueur peut retirer son lien', async () => {
    await importFrmtRanking(source([row(1, 'BENNANI YOUSSEF', 2001, 23100)]));
    const player = await registerUser(app, { email: 'player@example.com' });
    await linkRanking(player).expect(200);
    await request(app).delete('/api/frmt/link').set('Authorization', auth(player.token)).expect(204);
    await request(app).delete('/api/frmt/link').set('Authorization', auth(player.token)).expect(404);
  });
});
