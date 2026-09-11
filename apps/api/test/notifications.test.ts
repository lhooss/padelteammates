import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { auth, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

function notificationsOf(user: TestUser, unreadOnly = false) {
  return request(app)
    .get(`/api/notifications${unreadOnly ? '?unread=true' : ''}`)
    .set('Authorization', auth(user.token))
    .expect(200);
}

describe('Notifications in-app', () => {
  it('liste mes notifications (les plus recentes d\'abord) et les marque comme lues', async () => {
    const me = await registerUser(app, { name: 'Moi', email: 'me@example.com' });
    const sara = await registerUser(app, { name: 'Sara', email: 'sara@example.com' });
    const karim = await registerUser(app, { name: 'Karim', email: 'karim@example.com' });

    // Deux demandes d'ami -> deux notifications pour moi.
    await request(app).post(`/api/friends/${me.id}`).set('Authorization', auth(sara.token)).expect(201);
    await request(app).post(`/api/friends/${me.id}`).set('Authorization', auth(karim.token)).expect(201);

    const all = await notificationsOf(me);
    expect(all.body).toHaveLength(2);
    expect(all.body[0]).toMatchObject({ type: 'FRIEND_REQUEST', read: false });
    expect(all.body[0].message).toContain('Karim');

    await request(app).post(`/api/notifications/${all.body[0].id}/read`).set('Authorization', auth(me.token)).expect(204);
    expect((await notificationsOf(me, true)).body).toHaveLength(1);

    // Un autre joueur ne peut pas marquer mes notifications.
    await request(app).post(`/api/notifications/${all.body[1].id}/read`).set('Authorization', auth(sara.token)).expect(204);
    expect((await notificationsOf(me, true)).body).toHaveLength(1);

    await request(app).post('/api/notifications/read-all').set('Authorization', auth(me.token)).expect(204);
    expect((await notificationsOf(me, true)).body).toHaveLength(0);
    expect((await notificationsOf(me)).body).toHaveLength(2);
  });
});
