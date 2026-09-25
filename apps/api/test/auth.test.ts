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
      .send({ name: 'Youssef', username: 'youssef', email: 'y@example.com', password: 'password123' })
      .expect(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe('y@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('refuse un email en double (409)', async () => {
    await registerUser(app, { email: 'dup@example.com' });
    // Identifiant different : c'est bien l'email en double que l'on teste ici.
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Xavier', username: 'xavier', email: 'dup@example.com', password: 'password123' })
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
      .send({ name: 'Joueur Test', username: email.split('@')[0], email, password: 'password123' })
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

describe('Identifiant unique', () => {
  it('refuse un identifiant deja pris (409), meme avec un autre email', async () => {
    await registerUser(app, { username: 'jean-luc', email: 'jl1@example.com' });
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jean-Luc', username: 'jean-luc', email: 'jl2@example.com', password: 'password123' })
      .expect(409);
  });

  it('refuse un identifiant mal forme (400)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jean-Luc', username: 'Jean Luc!', email: 'jl3@example.com', password: 'password123' })
      .expect(400);
  });

  it('propose une variante libre quand l\'identifiant est pris', async () => {
    await registerUser(app, { username: 'jean-luc', email: 'jl1@example.com' });

    // Route publique : interrogee pendant l'inscription, donc sans jeton.
    const libre = await request(app).get('/api/auth/username?username=amine').expect(200);
    expect(libre.body).toEqual({ available: true, suggestion: 'amine' });

    const pris = await request(app).get('/api/auth/username?username=jean-luc').expect(200);
    expect(pris.body).toEqual({ available: false, suggestion: 'jean-luc2' });
  });

  it('deux homonymes se distinguent par leur identifiant dans la recherche', async () => {
    const me = await registerUser(app, { name: 'Amine', username: 'amine', email: 'me2@example.com' });
    await registerUser(app, { name: 'Jean-Luc', username: 'jean-luc', email: 'jl1@example.com' });
    const second = await registerUser(app, { name: 'Jean-Luc', username: 'jean-luc2', email: 'jl2@example.com' });

    // Le nom seul ne permet pas de choisir : les deux repondent.
    const parNom = await request(app).get('/api/users/search?q=jean').set('Authorization', auth(me.token)).expect(200);
    expect(parNom.body.map((p: { username: string }) => p.username).sort()).toEqual(['jean-luc', 'jean-luc2']);

    // L'identifiant, lui, designe un joueur et un seul.
    const parIdentifiant = await request(app)
      .get('/api/users/search?q=jean-luc2')
      .set('Authorization', auth(me.token))
      .expect(200);
    expect(parIdentifiant.body).toHaveLength(1);
    expect(parIdentifiant.body[0].id).toBe(second.id);
  });
});
