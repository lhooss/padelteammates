import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { auth, registerUser, resetDb, teardown } from './helpers.js';

const app = createApp();
const TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

beforeEach(resetDb);
afterAll(teardown);

describe('Notifications push — appareils', () => {
  it('enregistre l\'appareil du joueur', async () => {
    const user = await registerUser(app, { email: 'push@example.com' });
    await request(app)
      .put('/api/notifications/push-tokens')
      .set('Authorization', auth(user.token))
      .send({ token: TOKEN, platform: 'android' })
      .expect(204);

    const devices = await prisma.pushToken.findMany({ where: { userId: user.id } });
    expect(devices).toHaveLength(1);
    expect(devices[0]!.platform).toBe('android');
  });

  it('n\'enregistre pas deux fois le meme appareil', async () => {
    const user = await registerUser(app, { email: 'push-twice@example.com' });
    for (let i = 0; i < 2; i++) {
      await request(app)
        .put('/api/notifications/push-tokens')
        .set('Authorization', auth(user.token))
        .send({ token: TOKEN, platform: 'android' })
        .expect(204);
    }
    expect(await prisma.pushToken.count()).toBe(1);
  });

  it('reattribue l\'appareil au dernier compte connecte', async () => {
    const first = await registerUser(app, { email: 'push-first@example.com' });
    const second = await registerUser(app, { email: 'push-second@example.com' });

    for (const user of [first, second]) {
      await request(app)
        .put('/api/notifications/push-tokens')
        .set('Authorization', auth(user.token))
        .send({ token: TOKEN, platform: 'android' })
        .expect(204);
    }

    // Un seul appareil, rattache au second joueur : sinon le premier continuerait
    // de recevoir les notifications sur un telephone qui ne lui appartient plus.
    const devices = await prisma.pushToken.findMany();
    expect(devices).toHaveLength(1);
    expect(devices[0]!.userId).toBe(second.id);
  });

  it('retire l\'appareil a la deconnexion', async () => {
    const user = await registerUser(app, { email: 'push-out@example.com' });
    await request(app)
      .put('/api/notifications/push-tokens')
      .set('Authorization', auth(user.token))
      .send({ token: TOKEN, platform: 'android' })
      .expect(204);

    await request(app)
      .delete(`/api/notifications/push-tokens/${encodeURIComponent(TOKEN)}`)
      .set('Authorization', auth(user.token))
      .expect(204);

    expect(await prisma.pushToken.count()).toBe(0);
  });

  it('rejette un jeton invalide (400) et refuse sans authentification (401)', async () => {
    const user = await registerUser(app, { email: 'push-invalid@example.com' });
    await request(app)
      .put('/api/notifications/push-tokens')
      .set('Authorization', auth(user.token))
      .send({ token: 'court', platform: 'android' })
      .expect(400);

    await request(app).put('/api/notifications/push-tokens').send({ token: TOKEN, platform: 'android' }).expect(401);
  });
});
