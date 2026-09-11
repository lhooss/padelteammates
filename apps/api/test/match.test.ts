import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  auth,
  dayFromToday,
  makeFriends,
  moveMatchToPast,
  registerAdmin,
  registerUser,
  resetDb,
  teardown,
  type TestUser,
} from './helpers.js';

const app = createApp();
const MATCH_DAY = dayFromToday(7);

beforeEach(resetDb);
afterAll(teardown);

async function seedClub(): Promise<string> {
  const admin = await registerAdmin(app);
  const res = await request(app)
    .post('/api/clubs')
    .set('Authorization', auth(admin.token))
    .send({ name: 'Padel Club Kénitra' })
    .expect(201);
  return res.body.id as string;
}

// p1 est ami avec p2, p3 et p4 : on n'invite que ses amis.
async function fourPlayers(): Promise<[TestUser, TestUser, TestUser, TestUser]> {
  const p: [TestUser, TestUser, TestUser, TestUser] = [
    await registerUser(app, { email: 'p1@example.com' }),
    await registerUser(app, { email: 'p2@example.com' }),
    await registerUser(app, { email: 'p3@example.com' }),
    await registerUser(app, { email: 'p4@example.com' }),
  ];
  for (const other of p.slice(1)) await makeFriends(app, p[0], other);
  return p;
}

function createMatchBody(clubId: string, p: TestUser[]) {
  return {
    clubId,
    date: MATCH_DAY,
    slot: '18:00-19:30',
    creatorTeam: 'A',
    invites: [
      { userId: p[1]!.id, team: 'A' },
      { userId: p[2]!.id, team: 'B' },
      { userId: p[3]!.id, team: 'B' },
    ],
  };
}

describe('Matchs — planification & invitations', () => {
  it('cree un match avec 4 participants (createur confirme, invites en attente)', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    const res = await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send(createMatchBody(clubId, p))
      .expect(201);

    expect(res.body.status).toBe('PLANNED');
    expect(res.body.participants).toHaveLength(4);
    const creator = res.body.participants.find((x: { userId: string }) => x.userId === p[0].id);
    expect(creator.presenceStatus).toBe('CONFIRMED');
    const invited = res.body.participants.filter((x: { presenceStatus: string }) => x.presenceStatus === 'INVITED');
    expect(invited).toHaveLength(3);
  });

  it('notifie les invites', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send(createMatchBody(clubId, p))
      .expect(201);

    const notifs = await request(app)
      .get('/api/notifications?unread=true')
      .set('Authorization', auth(p[1].token))
      .expect(200);
    // (p2 a aussi recu la demande d'ami de p1.)
    const invites = notifs.body.filter((n: { type: string }) => n.type === 'INVITE');
    expect(invites).toHaveLength(1);
  });

  it('un invite peut confirmer sa participation', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    const match = await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send(createMatchBody(clubId, p))
      .expect(201);

    const res = await request(app)
      .post(`/api/matches/${match.body.id}/respond`)
      .set('Authorization', auth(p[1].token))
      .send({ accept: true })
      .expect(200);

    const me = res.body.participants.find((x: { userId: string }) => x.userId === p[1].id);
    expect(me.presenceStatus).toBe('CONFIRMED');
  });

  it('un refus retire le participant', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    const match = await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send(createMatchBody(clubId, p))
      .expect(201);

    const res = await request(app)
      .post(`/api/matches/${match.body.id}/respond`)
      .set('Authorization', auth(p[3].token))
      .send({ accept: false })
      .expect(200);
    expect(res.body.participants).toHaveLength(3);
  });

  it('rejette un creneau invalide (400)', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send({ ...createMatchBody(clubId, p), slot: '25:00-26:00' })
      .expect(400);
  });

  it('empeche le conflit de creneau dans le meme club (409)', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    const other = await registerUser(app, { email: 'solo@example.com' });

    await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send({ clubId, date: MATCH_DAY, slot: '18:00-19:30', creatorTeam: 'A', invites: [] })
      .expect(201);

    // Meme club + jour + creneau -> conflit.
    await request(app)
      .post('/api/matches')
      .set('Authorization', auth(other.token))
      .send({ clubId, date: MATCH_DAY, slot: '18:00-19:30', creatorTeam: 'B', invites: [] })
      .expect(409);
  });

  it('liste les matchs de la semaine dans le calendrier', async () => {
    const clubId = await seedClub();
    const p = await fourPlayers();
    await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send(createMatchBody(clubId, p))
      .expect(201);

    const cal = await request(app)
      .get(`/api/matches/calendar/weekly?from=${MATCH_DAY}`)
      .set('Authorization', auth(p[0].token))
      .expect(200);
    expect(cal.body).toHaveLength(1);

    // Une autre semaine ne doit rien renvoyer.
    const empty = await request(app)
      .get(`/api/matches/calendar/weekly?from=${dayFromToday(40)}`)
      .set('Authorization', auth(p[0].token))
      .expect(200);
    expect(empty.body).toHaveLength(0);
  });
});

describe('Matchs — inviter des joueurs apres la creation', () => {
  // Match de p1 avec son partenaire p2 : l'equipe B est libre.
  async function matchWithFreeSpots(): Promise<{ p: TestUser[]; matchId: string }> {
    const clubId = await seedClub();
    const p = await fourPlayers();
    const res = await request(app)
      .post('/api/matches')
      .set('Authorization', auth(p[0].token))
      .send({ clubId, date: MATCH_DAY, slot: '18:00-19:30', creatorTeam: 'A', invites: [{ userId: p[1].id, team: 'A' }] })
      .expect(201);
    return { p, matchId: res.body.id as string };
  }

  function invite(user: TestUser, matchId: string, invites: { userId: string; team: 'A' | 'B' }[]) {
    return request(app)
      .post(`/api/matches/${matchId}/invites`)
      .set('Authorization', auth(user.token))
      .send({ invites });
  }

  it('l\'organisateur complete son match avec des amis, qui sont notifies', async () => {
    const { p, matchId } = await matchWithFreeSpots();

    const res = await invite(p[0]!, matchId, [
      { userId: p[2]!.id, team: 'B' },
      { userId: p[3]!.id, team: 'B' },
    ]).expect(200);
    expect(res.body.participants).toHaveLength(4);

    const notifs = await request(app).get('/api/notifications').set('Authorization', auth(p[2]!.token)).expect(200);
    expect(notifs.body.filter((n: { type: string }) => n.type === 'INVITE')).toHaveLength(1);
  });

  it('refuse une equipe deja complete (400) ou un joueur deja present (409)', async () => {
    const { p, matchId } = await matchWithFreeSpots();
    await invite(p[0]!, matchId, [{ userId: p[2]!.id, team: 'A' }]).expect(400);
    await invite(p[0]!, matchId, [{ userId: p[1]!.id, team: 'B' }]).expect(409);
  });

  it('seul l\'organisateur invite, et seulement ses amis (403)', async () => {
    const { p, matchId } = await matchWithFreeSpots();
    await invite(p[1]!, matchId, [{ userId: p[2]!.id, team: 'B' }]).expect(403);

    const stranger = await registerUser(app, { email: 'stranger@example.com' });
    await invite(p[0]!, matchId, [{ userId: stranger.id, team: 'B' }]).expect(403);
  });

  it('refuse d\'inviter a un match deja passe (400)', async () => {
    const { p, matchId } = await matchWithFreeSpots();
    await moveMatchToPast(matchId);
    await invite(p[0]!, matchId, [{ userId: p[2]!.id, team: 'B' }]).expect(400);
  });
});
