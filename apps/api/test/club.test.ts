import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auth, dayFromToday, registerAdmin, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

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

describe('Clubs — desactivation', () => {
  async function createClub(admin: TestUser, name: string): Promise<string> {
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', auth(admin.token))
      .send({ name })
      .expect(201);
    expect(res.body.active).toBe(true);
    return res.body.id as string;
  }

  function deactivate(admin: TestUser, clubId: string) {
    return request(app)
      .patch(`/api/clubs/${clubId}`)
      .set('Authorization', auth(admin.token))
      .send({ active: false });
  }

  function planMatch(user: TestUser, clubId: string) {
    return request(app)
      .post('/api/matches')
      .set('Authorization', auth(user.token))
      .send({ clubId, date: dayFromToday(3), slot: '18:00-19:30', creatorTeam: 'A', invites: [] });
  }

  it('un club desactive disparait de la liste, sauf pour l\'admin qui le demande', async () => {
    const admin = await registerAdmin(app);
    const clubId = await createClub(admin, 'Ouled Oujih Padel Center');
    await deactivate(admin, clubId).expect(200);

    const user = await registerUser(app);
    const visible = await request(app).get('/api/clubs').set('Authorization', auth(user.token)).expect(200);
    expect(visible.body).toHaveLength(0);

    // Un joueur ne voit pas les clubs desactives, meme en forcant le parametre.
    const forced = await request(app)
      .get('/api/clubs?includeInactive=true')
      .set('Authorization', auth(user.token))
      .expect(200);
    expect(forced.body).toHaveLength(0);

    const all = await request(app)
      .get('/api/clubs?includeInactive=true')
      .set('Authorization', auth(admin.token))
      .expect(200);
    expect(all.body).toHaveLength(1);
    expect(all.body[0].active).toBe(false);
  });

  it('refuse de planifier un match dans un club desactive (400)', async () => {
    const admin = await registerAdmin(app);
    const clubId = await createClub(admin, 'Kénitra Racket Club');
    await deactivate(admin, clubId).expect(200);

    const user = await registerUser(app);
    await planMatch(user, clubId).expect(400);
  });

  it('supprime un club vide, mais refuse celui qui a des matchs (409)', async () => {
    const admin = await registerAdmin(app);
    const used = await createClub(admin, 'Club avec historique');
    const user = await registerUser(app);
    await planMatch(user, used).expect(201);

    await request(app).delete(`/api/clubs/${used}`).set('Authorization', auth(admin.token)).expect(409);
    // Le club reste utilisable apres le refus.
    await deactivate(admin, used).expect(200);

    const empty = await createClub(admin, 'Club jamais utilise');
    await request(app).delete(`/api/clubs/${empty}`).set('Authorization', auth(admin.token)).expect(204);
  });

  it('un joueur ne peut ni desactiver ni supprimer un club (403)', async () => {
    const admin = await registerAdmin(app);
    const clubId = await createClub(admin, 'Padel Club Kénitra');
    const user = await registerUser(app);
    await deactivate(user, clubId).expect(403);
    await request(app).delete(`/api/clubs/${clubId}`).set('Authorization', auth(user.token)).expect(403);
  });
});
