import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auth, registerAdmin, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

async function setupMatch(): Promise<{ clubId: string; p: TestUser[]; matchId: string }> {
  const admin = await registerAdmin(app);
  const club = await request(app)
    .post('/api/clubs')
    .set('Authorization', auth(admin.token))
    .send({ name: 'Padel Club Kénitra' })
    .expect(201);
  const clubId = club.body.id as string;

  // p1 & p2 (equipe A) publics ; p3 & p4 (equipe B) prives.
  const p = [
    await registerUser(app, { email: 'w1@example.com', profilePublic: true }),
    await registerUser(app, { email: 'w2@example.com', profilePublic: true }),
    await registerUser(app, { email: 'l1@example.com', profilePublic: false }),
    await registerUser(app, { email: 'l2@example.com', profilePublic: false }),
  ];

  const match = await request(app)
    .post('/api/matches')
    .set('Authorization', auth(p[0]!.token))
    .send({
      clubId,
      date: '2026-09-20',
      slot: '18:00-19:30',
      creatorTeam: 'A',
      invites: [
        { userId: p[1]!.id, team: 'A' },
        { userId: p[2]!.id, team: 'B' },
        { userId: p[3]!.id, team: 'B' },
      ],
    })
    .expect(201);

  return { clubId, p, matchId: match.body.id as string };
}

// Equipe A gagne 2 games a 1.
function winningScore(p: TestUser[]) {
  return {
    teams: { A: [p[0]!.id, p[1]!.id], B: [p[2]!.id, p[3]!.id] },
    games: [
      { sets: [{ a: 6, b: 4 }, { a: 6, b: 3 }] },
      { sets: [{ a: 2, b: 6 }, { a: 4, b: 6 }] },
      { sets: [{ a: 7, b: 5 }, { a: 3, b: 6 }, { a: 6, b: 2 }] },
    ],
  };
}

describe('Scores — saisie, validation, stats', () => {
  it('saisie -> PENDING, puis 2e validation -> COMPLETED + stats', async () => {
    const { p, matchId } = await setupMatch();

    // Saisie par p1 (compte comme 1re validation).
    const submit = await request(app)
      .post(`/api/matches/${matchId}/score`)
      .set('Authorization', auth(p[0]!.token))
      .send(winningScore(p))
      .expect(201);
    expect(submit.body.winningTeam).toBe('A');
    expect(submit.body.validators).toEqual([p[0]!.id]);

    let match = await request(app).get(`/api/matches/${matchId}`).set('Authorization', auth(p[0]!.token));
    expect(match.body.status).toBe('PENDING');

    // 2e validation par p2 -> verrouillage.
    const validate = await request(app)
      .post(`/api/matches/${matchId}/score/validate`)
      .set('Authorization', auth(p[1]!.token))
      .expect(200);
    expect(validate.body.status).toBe('COMPLETED');

    match = await request(app).get(`/api/matches/${matchId}`).set('Authorization', auth(p[0]!.token));
    expect(match.body.status).toBe('COMPLETED');

    // Stats du gagnant p1 (profil public).
    const stats = await request(app)
      .get(`/api/users/${p[0]!.id}/stats`)
      .set('Authorization', auth(p[0]!.token))
      .expect(200);
    expect(stats.body.wins).toBe(1);
    expect(stats.body.losses).toBe(0);
    expect(stats.body.winRate).toBe(100);

    // Perdant p3 -> profil prive -> 403.
    await request(app)
      .get(`/api/users/${p[2]!.id}/stats`)
      .set('Authorization', auth(p[0]!.token))
      .expect(403);
  });

  it('ne verrouille pas avec une seule validation', async () => {
    const { p, matchId } = await setupMatch();
    await request(app)
      .post(`/api/matches/${matchId}/score`)
      .set('Authorization', auth(p[0]!.token))
      .send(winningScore(p))
      .expect(201);

    // Meme joueur revalide: toujours 1 validateur distinct -> reste PENDING.
    const again = await request(app)
      .post(`/api/matches/${matchId}/score/validate`)
      .set('Authorization', auth(p[0]!.token))
      .expect(200);
    expect(again.body.status).toBe('PENDING');
  });

  it('un non-participant ne peut pas saisir (403)', async () => {
    const { p, matchId } = await setupMatch();
    const intrus = await registerUser(app, { email: 'intrus@example.com' });
    await request(app)
      .post(`/api/matches/${matchId}/score`)
      .set('Authorization', auth(intrus.token))
      .send(winningScore(p))
      .expect(403);
  });

  it('rejette un set a egalite (400)', async () => {
    const { p, matchId } = await setupMatch();
    await request(app)
      .post(`/api/matches/${matchId}/score`)
      .set('Authorization', auth(p[0]!.token))
      .send({
        teams: { A: [p[0]!.id, p[1]!.id], B: [p[2]!.id, p[3]!.id] },
        games: [{ sets: [{ a: 6, b: 6 }] }],
      })
      .expect(400);
  });

  it('valider sans saisie prealable renvoie 400', async () => {
    const { p, matchId } = await setupMatch();
    await request(app)
      .post(`/api/matches/${matchId}/score/validate`)
      .set('Authorization', auth(p[1]!.token))
      .expect(400);
  });

  it('le classement liste les profils publics', async () => {
    const { p, matchId } = await setupMatch();
    await request(app)
      .post(`/api/matches/${matchId}/score`)
      .set('Authorization', auth(p[0]!.token))
      .send(winningScore(p))
      .expect(201);
    await request(app)
      .post(`/api/matches/${matchId}/score/validate`)
      .set('Authorization', auth(p[1]!.token))
      .expect(200);

    const board = await request(app)
      .get('/api/users/leaderboard')
      .set('Authorization', auth(p[0]!.token))
      .expect(200);
    // Seuls p1 & p2 (publics) apparaissent.
    expect(board.body).toHaveLength(2);
    expect(board.body.every((u: { wins: number }) => u.wins === 1)).toBe(true);
  });
});
