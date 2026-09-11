import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  auth,
  dayFromToday,
  moveMatchToPast,
  registerAdmin,
  registerUser,
  resetDb,
  teardown,
  type TestUser,
} from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

interface SetupOptions {
  played?: boolean; // creneau termine (defaut) ou match a venir
  unconfirmed?: number[]; // index des invites (1..3) n'ayant pas confirme
}

async function setupMatch({ played = true, unconfirmed = [] }: SetupOptions = {}): Promise<{
  clubId: string;
  p: TestUser[];
  matchId: string;
}> {
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
      date: dayFromToday(7),
      slot: '18:00-19:30',
      creatorTeam: 'A',
      invites: [
        { userId: p[1]!.id, team: 'A' },
        { userId: p[2]!.id, team: 'B' },
        { userId: p[3]!.id, team: 'B' },
      ],
    })
    .expect(201);
  const matchId = match.body.id as string;

  for (const i of [1, 2, 3]) {
    if (unconfirmed.includes(i)) continue;
    await request(app)
      .post(`/api/matches/${matchId}/respond`)
      .set('Authorization', auth(p[i]!.token))
      .send({ accept: true })
      .expect(200);
  }

  if (played) await moveMatchToPast(matchId);

  return { clubId, p, matchId };
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

// Equipe B gagne 1 game a 0.
function losingScore(p: TestUser[]) {
  return {
    teams: { A: [p[0]!.id, p[1]!.id], B: [p[2]!.id, p[3]!.id] },
    games: [{ sets: [{ a: 3, b: 6 }, { a: 4, b: 6 }] }],
  };
}

function submit(user: TestUser, matchId: string, body: object) {
  return request(app).post(`/api/matches/${matchId}/score`).set('Authorization', auth(user.token)).send(body);
}

function validate(user: TestUser, matchId: string) {
  return request(app).post(`/api/matches/${matchId}/score/validate`).set('Authorization', auth(user.token));
}

describe('Scores — saisie, validation, stats', () => {
  it('saisie -> PENDING, puis validation par l\'equipe adverse -> COMPLETED + stats', async () => {
    const { p, matchId } = await setupMatch();

    // Saisie par p1 (compte comme 1re validation, equipe A).
    const entered = await submit(p[0]!, matchId, winningScore(p)).expect(201);
    expect(entered.body.winningTeam).toBe('A');
    expect(entered.body.validators).toEqual([p[0]!.id]);

    let match = await request(app).get(`/api/matches/${matchId}`).set('Authorization', auth(p[0]!.token));
    expect(match.body.status).toBe('PENDING');

    // Validation par p3 (equipe B) -> verrouillage.
    const validated = await validate(p[2]!, matchId).expect(200);
    expect(validated.body.status).toBe('COMPLETED');

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

  it('deux coequipiers ne peuvent pas verrouiller seuls le resultat', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, winningScore(p)).expect(201);

    // p2 est le partenaire de p1 : 2 validations, mais toutes deux de l'equipe A.
    const teammate = await validate(p[1]!, matchId).expect(200);
    expect(teammate.body.status).toBe('PENDING');
    expect(teammate.body.awaitingTeams).toEqual(['B']);

    const opponent = await validate(p[3]!, matchId).expect(200);
    expect(opponent.body.status).toBe('COMPLETED');
  });

  it('ne verrouille pas avec une seule validation', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, winningScore(p)).expect(201);

    // Meme joueur revalide: toujours 1 validateur distinct -> reste PENDING.
    const again = await validate(p[0]!, matchId).expect(200);
    expect(again.body.status).toBe('PENDING');
  });

  it('une re-saisie remet les validations a zero et les stats suivent la derniere saisie', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, winningScore(p)).expect(201);
    await validate(p[1]!, matchId).expect(200);

    // p3 conteste en re-saisissant : seule sa validation (equipe B) subsiste.
    const corrected = await submit(p[2]!, matchId, losingScore(p)).expect(201);
    expect(corrected.body.validators).toEqual([p[2]!.id]);
    expect((await validate(p[3]!, matchId).expect(200)).body.status).toBe('PENDING');

    // L'equipe A accepte la correction -> verrouillage sur la victoire de B.
    expect((await validate(p[0]!, matchId).expect(200)).body.status).toBe('COMPLETED');

    const stats = await request(app)
      .get(`/api/users/${p[0]!.id}/stats`)
      .set('Authorization', auth(p[0]!.token))
      .expect(200);
    expect(stats.body.wins).toBe(0);
    expect(stats.body.losses).toBe(1);
  });

  it('des validations simultanees n\'appliquent les stats qu\'une seule fois', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, winningScore(p)).expect(201);

    // p3 et p4 (equipe B) valident en meme temps : chacun suffirait a verrouiller.
    const results = await Promise.all([validate(p[2]!, matchId), validate(p[3]!, matchId)]);
    const completed = results.filter((r) => r.status === 200 && r.body.status === 'COMPLETED');
    expect(completed).toHaveLength(1);

    const stats = await request(app)
      .get(`/api/users/${p[0]!.id}/stats`)
      .set('Authorization', auth(p[0]!.token))
      .expect(200);
    expect(stats.body.wins).toBe(1);
  });

  it('refuse la saisie avant la fin du creneau (400)', async () => {
    const { p, matchId } = await setupMatch({ played: false });
    await submit(p[0]!, matchId, winningScore(p)).expect(400);
  });

  it('un invite non confirme ne peut ni saisir ni valider (403)', async () => {
    const { p, matchId } = await setupMatch({ unconfirmed: [3] });

    await submit(p[3]!, matchId, winningScore(p)).expect(403);
    await validate(p[3]!, matchId).expect(403);

    // Et un joueur confirme ne peut pas l'inclure dans la composition finale.
    await submit(p[0]!, matchId, winningScore(p)).expect(400);
  });

  it('exige une composition 2 contre 2 (400)', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, {
      teams: { A: [p[0]!.id], B: [p[2]!.id] },
      games: [{ sets: [{ a: 6, b: 4 }] }],
    }).expect(400);
  });

  it('un non-participant ne peut pas saisir (403)', async () => {
    const { p, matchId } = await setupMatch();
    const intrus = await registerUser(app, { email: 'intrus@example.com' });
    await submit(intrus, matchId, winningScore(p)).expect(403);
  });

  it('rejette un set a egalite (400)', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, {
      teams: { A: [p[0]!.id, p[1]!.id], B: [p[2]!.id, p[3]!.id] },
      games: [{ sets: [{ a: 6, b: 6 }] }],
    }).expect(400);
  });

  it('valider sans saisie prealable renvoie 400', async () => {
    const { p, matchId } = await setupMatch();
    await validate(p[1]!, matchId).expect(400);
  });

  it('le classement liste les profils publics', async () => {
    const { p, matchId } = await setupMatch();
    await submit(p[0]!, matchId, winningScore(p)).expect(201);
    await validate(p[2]!, matchId).expect(200);

    const board = await request(app)
      .get('/api/users/leaderboard')
      .set('Authorization', auth(p[0]!.token))
      .expect(200);
    // Seuls p1 & p2 (publics) apparaissent.
    expect(board.body).toHaveLength(2);
    expect(board.body.every((u: { wins: number }) => u.wins === 1)).toBe(true);
  });
});
