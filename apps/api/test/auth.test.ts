import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auth, registerUser, resetDb, teardown } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

describe('Auth', () => {
  it('inscrit un joueur et renvoie un token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Youssef', email: 'y@example.com', password: 'password123' })
      .expect(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe('y@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('refuse un email en double (409)', async () => {
    await registerUser(app, { email: 'dup@example.com' });
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Xavier', email: 'dup@example.com', password: 'password123' })
      .expect(409);
  });

  it('rejette une inscription invalide (400)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' })
      .expect(400);
  });

  it('connecte et retourne le profil via /me', async () => {
    const user = await registerUser(app, { email: 'me@example.com', profilePublic: true });
    const me = await request(app).get('/api/auth/me').set('Authorization', auth(user.token)).expect(200);
    expect(me.body.id).toBe(user.id);
    expect(me.body.profilePublic).toBe(true);
  });

  it('refuse /me sans token (401)', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('repond 400 a un corps JSON malforme, pas 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{email:admin}')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('Auth — session longue (renouvellement silencieux)', () => {
  function createAccount(email: string) {
    return request(app)
      .post('/api/auth/register')
      .send({ name: 'Joueur Test', email, password: 'password123' })
      .expect(201);
  }

  it('echange le jeton de session contre un nouveau couple utilisable', async () => {
    const created = await createAccount('refresh@example.com');
    expect(created.body.refreshToken).toBeTypeOf('string');

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: created.body.refreshToken })
      .expect(200);

    expect(refreshed.body.refreshToken).not.toBe(created.body.refreshToken);
    expect(refreshed.body.user.email).toBe('refresh@example.com');
    // Le nouveau jeton d'acces ouvre bien les routes authentifiees.
    await request(app).get('/api/auth/me').set('Authorization', auth(refreshed.body.token)).expect(200);
  });

  it('un jeton de session ne sert qu\'une fois : le rejeu est refuse (401)', async () => {
    const created = await createAccount('rotation@example.com');
    await request(app).post('/api/auth/refresh').send({ refreshToken: created.body.refreshToken }).expect(200);
    await request(app).post('/api/auth/refresh').send({ refreshToken: created.body.refreshToken }).expect(401);
  });

  it('la deconnexion revoque la session de cet appareil (401 ensuite)', async () => {
    const created = await createAccount('logout@example.com');
    await request(app).post('/api/auth/logout').send({ refreshToken: created.body.refreshToken }).expect(204);
    await request(app).post('/api/auth/refresh').send({ refreshToken: created.body.refreshToken }).expect(401);
  });

  it('rejette un jeton de session inconnu (401)', async () => {
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'x'.repeat(43) })
      .expect(401);
  });
});
