import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { hashResetCode } from '../src/utils/resetCode.js';
import { auth, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

const app = createApp();
const NEW_PASSWORD = 'nouveau-mot-de-passe';

beforeEach(resetDb);
afterAll(teardown);

// Le code est envoye par email : en test, on le pose directement pour pouvoir
// verifier le parcours sans service d'envoi.
async function askForCode(user: TestUser, code = '123456'): Promise<void> {
  await request(app).post('/api/auth/forgot-password').send({ email: user.email }).expect(204);
  const reset = await prisma.passwordReset.findFirstOrThrow({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.passwordReset.update({ where: { id: reset.id }, data: { codeHash: hashResetCode(code) } });
}

function resetWith(email: string, code: string, newPassword = NEW_PASSWORD) {
  return request(app).post('/api/auth/reset-password').send({ email, code, newPassword });
}

describe('Mot de passe oublie', () => {
  it('cree une demande et permet de changer le mot de passe', async () => {
    const user = await registerUser(app, { email: 'oubli@example.com' });
    await askForCode(user);

    await resetWith(user.email, '123456').expect(204);

    // L'ancien mot de passe ne marche plus, le nouveau oui.
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' }).expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: NEW_PASSWORD })
      .expect(200);
  });

  it('ne revele pas si l\'adresse existe (204 dans tous les cas)', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'personne@example.com' })
      .expect(204);
    expect(await prisma.passwordReset.count()).toBe(0);
  });

  it('refuse un code errone (400) et compte les essais', async () => {
    const user = await registerUser(app, { email: 'errone@example.com' });
    await askForCode(user);

    await resetWith(user.email, '000000').expect(400);

    const reset = await prisma.passwordReset.findFirstOrThrow({ where: { userId: user.id } });
    expect(reset.attempts).toBe(1);
    // Le mot de passe n'a pas change.
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' }).expect(200);
  });

  it('brule la demande apres trop d\'essais', async () => {
    const user = await registerUser(app, { email: 'essais@example.com' });
    await askForCode(user);

    for (let i = 0; i < 5; i++) await resetWith(user.email, '000000').expect(400);
    // Le bon code ne sert plus a rien : il faut redemander.
    await resetWith(user.email, '123456').expect(400);

    await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' }).expect(200);
  });

  it('refuse un code expire', async () => {
    const user = await registerUser(app, { email: 'expire@example.com' });
    await askForCode(user);
    await prisma.passwordReset.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await resetWith(user.email, '123456').expect(400);
  });

  it('une nouvelle demande annule la precedente', async () => {
    const user = await registerUser(app, { email: 'deux@example.com' });
    await askForCode(user, '111111');
    await askForCode(user, '222222');

    await resetWith(user.email, '111111').expect(400);
    await resetWith(user.email, '222222').expect(204);
  });

  it('revoque les sessions ouvertes : l\'ancien jeton ne se renouvelle plus', async () => {
    const created = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Joueur Test', email: 'sessions@example.com', password: 'password123' })
      .expect(201);
    const user: TestUser = { id: created.body.user.id, email: 'sessions@example.com', token: created.body.token };

    await askForCode(user);
    await resetWith(user.email, '123456').expect(204);

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: created.body.refreshToken })
      .expect(401);
  });

  it('rejette un code mal forme (400) sans creer de demande', async () => {
    const user = await registerUser(app, { email: 'forme@example.com' });
    await resetWith(user.email, '12ab').expect(400);
    await request(app).get('/api/auth/me').set('Authorization', auth(user.token)).expect(200);
  });
});
