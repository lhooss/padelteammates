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
const MATCH_DAY = dayFromToday(7);

beforeEach(resetDb);
afterAll(teardown);

// Match de l'organisateur, seul dans l'equipe A : 1 place en A, 2 en B.
async function openMatch(): Promise<{ organizer: TestUser; matchId: string }> {
  const admin = await registerAdmin(app);
  const club = await request(app)
    .post('/api/clubs')
    .set('Authorization', auth(admin.token))
    .send({ name: 'Padel Club Kénitra' })
    .expect(201);
  const organizer = await registerUser(app, { name: 'Organisateur', email: 'orga@example.com' });
  const match = await request(app)
    .post('/api/matches')
    .set('Authorization', auth(organizer.token))
    .send({ clubId: club.body.id, date: MATCH_DAY, slot: '18:00-19:30', creatorTeam: 'A', invites: [] })
    .expect(201);
  return { organizer, matchId: match.body.id as string };
}

function askToJoin(user: TestUser, matchId: string, team: 'A' | 'B') {
  return request(app).post(`/api/matches/${matchId}/join-requests`).set('Authorization', auth(user.token)).send({ team });
}

function accept(organizer: TestUser, matchId: string, requester: TestUser) {
  return request(app)
    .post(`/api/matches/${matchId}/join-requests/${requester.id}/accept`)
    .set('Authorization', auth(organizer.token));
}

function removeRequest(by: TestUser, matchId: string, requester: TestUser) {
  return request(app)
    .delete(`/api/matches/${matchId}/join-requests/${requester.id}`)
    .set('Authorization', auth(by.token));
}

function notificationTypes(user: TestUser) {
  return request(app)
    .get('/api/notifications')
    .set('Authorization', auth(user.token))
    .then((res) => res.body.map((n: { type: string }) => n.type));
}

describe('Demandes pour rejoindre un match', () => {
  it('un joueur demande une place, l\'organisateur accepte : il rejoint le match, confirme', async () => {
    const { organizer, matchId } = await openMatch();
    const player = await registerUser(app, { name: 'Nadia', email: 'nadia@example.com' });

    await askToJoin(player, matchId, 'B').expect(201);
    expect(await notificationTypes(organizer)).toContain('JOIN_REQUEST');

    // L'organisateur voit la demande dans le detail du match.
    const pending = await request(app).get(`/api/matches/${matchId}`).set('Authorization', auth(organizer.token));
    expect(pending.body.joinRequests.map((r: { userId: string }) => r.userId)).toEqual([player.id]);

    const res = await accept(organizer, matchId, player).expect(200);
    const joined = res.body.participants.find((p: { userId: string }) => p.userId === player.id);
    expect(joined).toMatchObject({ team: 'B', presenceStatus: 'CONFIRMED' });
    expect(res.body.joinRequests).toHaveLength(0);
    expect(await notificationTypes(player)).toContain('JOIN_ACCEPTED');
  });

  it('le calendrier montre ma demande, et le match apparait dans mes matchs', async () => {
    const { matchId } = await openMatch();
    const player = await registerUser(app, { email: 'player@example.com' });
    const other = await registerUser(app, { email: 'other@example.com' });
    await askToJoin(player, matchId, 'B').expect(201);
    await askToJoin(other, matchId, 'A').expect(201);

    // Dans le calendrier, chacun ne voit que sa propre demande.
    const cal = await request(app)
      .get(`/api/matches/calendar/weekly?from=${MATCH_DAY}`)
      .set('Authorization', auth(player.token))
      .expect(200);
    expect(cal.body[0].joinRequests).toEqual([expect.objectContaining({ userId: player.id, team: 'B' })]);

    const mine = await request(app).get('/api/matches/mine').set('Authorization', auth(player.token)).expect(200);
    expect(mine.body.map((m: { id: string }) => m.id)).toEqual([matchId]);
  });

  it('refus par l\'organisateur (notifie) ou annulation par le joueur', async () => {
    const { organizer, matchId } = await openMatch();
    const declined = await registerUser(app, { email: 'declined@example.com' });
    const cancelled = await registerUser(app, { email: 'cancelled@example.com' });
    await askToJoin(declined, matchId, 'B').expect(201);
    await askToJoin(cancelled, matchId, 'B').expect(201);

    await removeRequest(organizer, matchId, declined).expect(204);
    expect(await notificationTypes(declined)).toContain('JOIN_DECLINED');

    await removeRequest(cancelled, matchId, cancelled).expect(204);
    const match = await request(app).get(`/api/matches/${matchId}`).set('Authorization', auth(organizer.token));
    expect(match.body.joinRequests).toHaveLength(0);

    // Un tiers ne peut pas retirer la demande d'un autre.
    await askToJoin(cancelled, matchId, 'B').expect(201);
    await removeRequest(declined, matchId, cancelled).expect(403);
  });

  it('refuse une equipe complete, un participant, une demande en double (409) ou un match passe (400)', async () => {
    const { organizer, matchId } = await openMatch();
    const first = await registerUser(app, { email: 'first@example.com' });
    const second = await registerUser(app, { email: 'second@example.com' });

    await askToJoin(organizer, matchId, 'B').expect(409);
    await askToJoin(first, matchId, 'A').expect(201);
    await askToJoin(first, matchId, 'B').expect(409);

    // L'equipe A se remplit : une nouvelle demande pour A est refusee.
    await accept(organizer, matchId, first).expect(200);
    await askToJoin(second, matchId, 'A').expect(409);

    await moveMatchToPast(matchId);
    await askToJoin(second, matchId, 'B').expect(400);
  });

  it('seul l\'organisateur accepte une demande (403)', async () => {
    const { matchId } = await openMatch();
    const player = await registerUser(app, { email: 'player@example.com' });
    const intruder = await registerUser(app, { email: 'intruder@example.com' });
    await askToJoin(player, matchId, 'B').expect(201);
    await accept(intruder, matchId, player).expect(403);
  });
});
