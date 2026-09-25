import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  auth,
  dayFromToday,
  makeFriends,
  registerAdmin,
  registerUser,
  resetDb,
  teardown,
  type TestUser,
} from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

function sendRequest(from: TestUser, to: TestUser) {
  return request(app).post(`/api/friends/${to.id}`).set('Authorization', auth(from.token));
}

function removeRelation(from: TestUser, other: TestUser) {
  return request(app).delete(`/api/friends/${other.id}`).set('Authorization', auth(from.token));
}

function profile(viewer: TestUser, target: TestUser) {
  return request(app).get(`/api/users/${target.id}`).set('Authorization', auth(viewer.token));
}

function friendsOf(user: TestUser) {
  return request(app).get('/api/friends').set('Authorization', auth(user.token));
}

function requestsOf(user: TestUser) {
  return request(app).get('/api/friends/requests').set('Authorization', auth(user.token));
}

describe('Amis — demandes, acceptation, retrait', () => {
  it('une demande acceptee rend les deux joueurs amis', async () => {
    const a = await registerUser(app, { name: 'Alice', username: 'alice', email: 'a@example.com' });
    const b = await registerUser(app, { name: 'Bruno', username: 'bruno', email: 'b@example.com' });

    expect((await sendRequest(a, b).expect(201)).body.state).toBe('REQUEST_SENT');
    expect((await profile(a, b).expect(200)).body.friendship).toBe('REQUEST_SENT');
    expect((await profile(b, a).expect(200)).body.friendship).toBe('REQUEST_RECEIVED');

    const pending = await requestsOf(b).expect(200);
    expect(pending.body.received.map((r: { user: { id: string } }) => r.user.id)).toEqual([a.id]);
    expect(pending.body.sent).toHaveLength(0);

    await request(app).post(`/api/friends/${a.id}/accept`).set('Authorization', auth(b.token)).expect(200);

    expect((await friendsOf(a).expect(200)).body).toEqual([{ id: b.id, name: 'Bruno', username: 'bruno' }]);
    expect((await friendsOf(b).expect(200)).body).toEqual([{ id: a.id, name: 'Alice', username: 'alice' }]);
    expect((await profile(a, b)).body.friendship).toBe('FRIENDS');
  });

  it('deux demandes croisees donnent directement une amitie', async () => {
    const a = await registerUser(app, { email: 'a@example.com' });
    const b = await registerUser(app, { email: 'b@example.com' });

    await sendRequest(a, b).expect(201);
    expect((await sendRequest(b, a).expect(201)).body.state).toBe('FRIENDS');
    expect((await friendsOf(a)).body).toHaveLength(1);
  });

  it('refuse une demande a soi-meme (400), en double ou entre amis (409)', async () => {
    const a = await registerUser(app, { email: 'a@example.com' });
    const b = await registerUser(app, { email: 'b@example.com' });

    await sendRequest(a, a).expect(400);
    await sendRequest(a, b).expect(201);
    await sendRequest(a, b).expect(409);
    await request(app).post(`/api/friends/${a.id}/accept`).set('Authorization', auth(b.token)).expect(200);
    await sendRequest(a, b).expect(409);
    await sendRequest(b, a).expect(409);
  });

  it('refuser, annuler ou retirer supprime la relation', async () => {
    const a = await registerUser(app, { email: 'a@example.com' });
    const b = await registerUser(app, { email: 'b@example.com' });
    const c = await registerUser(app, { email: 'c@example.com' });

    // b refuse la demande de a.
    await sendRequest(a, b).expect(201);
    await removeRelation(b, a).expect(200);
    expect((await profile(a, b)).body.friendship).toBe('NONE');

    // a annule sa demande a c.
    await sendRequest(a, c).expect(201);
    await removeRelation(a, c).expect(200);
    expect((await requestsOf(c)).body.received).toHaveLength(0);

    // a retire b de ses amis.
    await makeFriends(app, a, b);
    await removeRelation(a, b).expect(200);
    expect((await friendsOf(b)).body).toHaveLength(0);

    // Rien a accepter ni a retirer -> 404.
    await request(app).post(`/api/friends/${c.id}/accept`).set('Authorization', auth(a.token)).expect(404);
    await removeRelation(a, c).expect(404);
  });
});

describe('Joueurs — recherche et profil', () => {
  it('recherche par nom (insensible a la casse), sans soi-meme, avec la relation', async () => {
    const me = await registerUser(app, { name: 'Youssef Alaoui', username: 'youssef', email: 'me@example.com' });
    const friend = await registerUser(app, { name: 'Yousra Chraibi', username: 'yousra', email: 'yousra@example.com' });
    const other = await registerUser(app, { name: 'Youness Bennani', username: 'youness', email: 'youness@example.com' });
    // "karim" ne contient pas "you" : la recherche ci-dessous, qui porte aussi
    // sur l'identifiant, doit toujours ne ramener que deux joueurs.
    await registerUser(app, { name: 'Karim Tazi', username: 'karim', email: 'karim@example.com' });
    await makeFriends(app, me, friend);

    const res = await request(app).get('/api/users/search?q=yOu').set('Authorization', auth(me.token)).expect(200);
    expect(res.body).toEqual([
      { id: other.id, name: 'Youness Bennani', username: 'youness', friendship: 'NONE' },
      { id: friend.id, name: 'Yousra Chraibi', username: 'yousra', friendship: 'FRIENDS' },
    ]);

    await request(app).get('/api/users/search?q=y').set('Authorization', auth(me.token)).expect(400);
  });

  it('les stats d\'un profil prive ne sont visibles que de ses amis', async () => {
    const viewer = await registerUser(app, { email: 'viewer@example.com' });
    const privatePlayer = await registerUser(app, { email: 'private@example.com', profilePublic: false });
    const publicPlayer = await registerUser(app, { email: 'public@example.com', profilePublic: true });

    expect((await profile(viewer, publicPlayer).expect(200)).body.stats).toEqual({
      wins: 0,
      losses: 0,
      played: 0,
      winRate: 0,
    });
    expect((await profile(viewer, privatePlayer).expect(200)).body.stats).toBeNull();
    await request(app).get(`/api/users/${privatePlayer.id}/stats`).set('Authorization', auth(viewer.token)).expect(403);

    await makeFriends(app, viewer, privatePlayer);
    expect((await profile(viewer, privatePlayer)).body.stats).not.toBeNull();
    await request(app).get(`/api/users/${privatePlayer.id}/stats`).set('Authorization', auth(viewer.token)).expect(200);
  });
});

describe('Invitations reservees aux amis', () => {
  it('refuse d\'inviter un joueur qui n\'est pas un ami (403)', async () => {
    const admin = await registerAdmin(app);
    const club = await request(app)
      .post('/api/clubs')
      .set('Authorization', auth(admin.token))
      .send({ name: 'Padel Club Kénitra' })
      .expect(201);
    const creator = await registerUser(app, { email: 'creator@example.com' });
    const stranger = await registerUser(app, { email: 'stranger@example.com' });
    const friend = await registerUser(app, { email: 'friend@example.com' });
    await makeFriends(app, creator, friend);

    const body = (invitee: TestUser) => ({
      clubId: club.body.id,
      date: dayFromToday(7),
      slot: '18:00-19:30',
      creatorTeam: 'A',
      invites: [{ userId: invitee.id, team: 'B' }],
    });
    await request(app).post('/api/matches').set('Authorization', auth(creator.token)).send(body(stranger)).expect(403);
    await request(app).post('/api/matches').set('Authorization', auth(creator.token)).send(body(friend)).expect(201);
  });
});
