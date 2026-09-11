import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auth, makeFriends, registerAdmin, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

function updateMe(user: TestUser, body: object) {
  return request(app).patch('/api/auth/me').set('Authorization', auth(user.token)).send(body);
}

async function createClub(name: string): Promise<string> {
  const admin = await registerAdmin(app);
  const res = await request(app).post('/api/clubs').set('Authorization', auth(admin.token)).send({ name }).expect(201);
  return res.body.id as string;
}

describe('Profil — modification', () => {
  it('met a jour le profil padel, le club habituel et le telephone (normalise)', async () => {
    const clubId = await createClub('Padel Club Kénitra');
    const me = await registerUser(app, { name: 'Youssef', email: 'youssef@example.com' });

    const res = await updateMe(me, {
      name: 'Youssef Alaoui',
      preferredSide: 'LEFT',
      level: 'ADVANCED',
      dominantHand: 'RIGHT',
      homeClubId: clubId,
      phone: '06 12 34 56 78',
    }).expect(200);
    expect(res.body).toMatchObject({
      name: 'Youssef Alaoui',
      preferredSide: 'LEFT',
      level: 'ADVANCED',
      dominantHand: 'RIGHT',
      phone: '+212612345678',
      homeClub: { id: clubId, name: 'Padel Club Kénitra' },
    });

    // null efface un champ ; les autres restent.
    const cleared = await updateMe(me, { phone: null, homeClubId: null }).expect(200);
    expect(cleared.body).toMatchObject({ phone: null, homeClub: null, level: 'ADVANCED' });
  });

  it('rejette un telephone invalide (400) et un club inconnu (404)', async () => {
    const me = await registerUser(app, { email: 'me@example.com' });
    await updateMe(me, { phone: '12345' }).expect(400);
    await updateMe(me, { level: 'CHAMPION' }).expect(400);
    await updateMe(me, { homeClubId: 'cnotaclub0000000000000000' }).expect(404);
  });

  it('change le mot de passe en confirmant le mot de passe actuel', async () => {
    const me = await registerUser(app, { email: 'me@example.com', password: 'password123' });
    const change = (body: object) =>
      request(app).patch('/api/auth/me/password').set('Authorization', auth(me.token)).send(body);

    // 400 (et non 401, qui deconnecterait l'app).
    await change({ currentPassword: 'mauvais-mdp', newPassword: 'nouveau-mdp-456' }).expect(400);
    await change({ currentPassword: 'password123', newPassword: 'court' }).expect(400);
    await change({ currentPassword: 'password123', newPassword: 'nouveau-mdp-456' }).expect(204);

    await request(app).post('/api/auth/login').send({ email: me.email, password: 'password123' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: me.email, password: 'nouveau-mdp-456' }).expect(200);
  });

  it('change l\'email en confirmant le mot de passe actuel', async () => {
    const me = await registerUser(app, { email: 'me@example.com', password: 'password123' });
    await registerUser(app, { email: 'pris@example.com' });
    const change = (body: object) =>
      request(app).patch('/api/auth/me/email').set('Authorization', auth(me.token)).send(body);

    await change({ email: 'nouveau@example.com', currentPassword: 'mauvais-mdp' }).expect(400);
    await change({ email: 'pris@example.com', currentPassword: 'password123' }).expect(409);
    const res = await change({ email: 'Nouveau@Example.com', currentPassword: 'password123' }).expect(200);
    expect(res.body.email).toBe('nouveau@example.com');

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nouveau@example.com', password: 'password123' })
      .expect(200);
  });

  it('le profil padel est visible de tous, le telephone seulement des amis', async () => {
    const player = await registerUser(app, { email: 'player@example.com' });
    const friend = await registerUser(app, { email: 'friend@example.com' });
    const stranger = await registerUser(app, { email: 'stranger@example.com' });
    await updateMe(player, { level: 'EXPERT', preferredSide: 'RIGHT', phone: '+212 7 00 11 22 33' }).expect(200);
    await makeFriends(app, player, friend);

    const seenBy = (viewer: TestUser) =>
      request(app).get(`/api/users/${player.id}`).set('Authorization', auth(viewer.token)).expect(200);

    const byStranger = await seenBy(stranger);
    expect(byStranger.body).toMatchObject({ level: 'EXPERT', preferredSide: 'RIGHT', phone: null });

    const byFriend = await seenBy(friend);
    expect(byFriend.body.phone).toBe('+212700112233');
  });
});
