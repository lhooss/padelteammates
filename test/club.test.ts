import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auth, registerAdmin, registerUser, resetDb, teardown } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

describe('Clubs (ecriture reservee admin)', () => {
  it('un admin peut creer un club', async () => {
    const admin = await registerAdmin(app);
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', auth(admin.token))
      .send({ name: 'Padel Club Kénitra' })
      .expect(201);
    expect(res.body.city).toBe('Kénitra');
  });

  it('un joueur non-admin est refuse (403)', async () => {
    const user = await registerUser(app);
    await request(app)
      .post('/api/clubs')
      .set('Authorization', auth(user.token))
      .send({ name: 'Club interdit' })
      .expect(403);
  });

  it('tout joueur authentifie peut lister les clubs', async () => {
    const admin = await registerAdmin(app);
    await request(app)
      .post('/api/clubs')
      .set('Authorization', auth(admin.token))
      .send({ name: 'Mehdia Padel' })
      .expect(201);

    const user = await registerUser(app);
    const res = await request(app).get('/api/clubs').set('Authorization', auth(user.token)).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Mehdia Padel');
  });
});
