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
});
