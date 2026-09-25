import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { hashResetCode } from '../src/utils/resetCode.js';
import { auth, registerUser, resetDb, teardown, type TestUser } from './helpers.js';

const app = createApp();

beforeEach(resetDb);
afterAll(teardown);

// Le code part par email : en test, on remplace son empreinte par celle d'un
// code connu, comme pour le mot de passe oublie.
async function knownCode(user: TestUser, code = '123456'): Promise<void> {
  const verification = await prisma.emailVerification.findFirstOrThrow({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: { codeHash: hashResetCode(code) },
  });
}

function verifyWith(user: TestUser, code: string) {
  return request(app).post('/api/auth/verify-email').set('Authorization', auth(user.token)).send({ code });
}

function meOf(user: TestUser) {
  return request(app).get('/api/auth/me').set('Authorization', auth(user.token));
}

describe("Verification de l'adresse email", () => {
  it("l'inscription prepare un code, et l'adresse n'est pas encore verifiee", async () => {
    const user = await registerUser(app, { email: 'nouveau@example.com' });

    expect((await meOf(user).expect(200)).body.emailVerifiedAt).toBeNull();
    expect(await prisma.emailVerification.count({ where: { userId: user.id, usedAt: null } })).toBe(1);
  });

  it("rien n'est bloque tant que l'adresse n'est pas verifiee", async () => {
    const user = await registerUser(app, { email: 'libre@example.com' });
    // Le compte sert immediatement : la verification est un rappel, pas un barrage.
    await request(app).get('/api/users/leaderboard').set('Authorization', auth(user.token)).expect(200);
  });

  it("le bon code confirme l'adresse", async () => {
    const user = await registerUser(app, { email: 'ok@example.com' });
    await knownCode(user);

    expect((await verifyWith(user, '123456').expect(200)).body.emailVerifiedAt).not.toBeNull();
    expect((await meOf(user)).body.emailVerifiedAt).not.toBeNull();
  });

  it('refuse un code errone (400), compte les essais, puis brule la demande', async () => {
    const user = await registerUser(app, { email: 'errone@example.com' });
    await knownCode(user);

    await verifyWith(user, '000000').expect(400);
    const after = await prisma.emailVerification.findFirstOrThrow({ where: { userId: user.id } });
    expect(after.attempts).toBe(1);

    for (let i = 0; i < 4; i++) await verifyWith(user, '000000').expect(400);
    // Cinq essais manques : le bon code ne sert plus, il faut en redemander un.
    await verifyWith(user, '123456').expect(400);
    expect((await meOf(user)).body.emailVerifiedAt).toBeNull();
  });

  it('refuse un code expire', async () => {
    const user = await registerUser(app, { email: 'expire@example.com' });
    await knownCode(user);
    await prisma.emailVerification.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await verifyWith(user, '123456').expect(400);
  });

  it('un nouveau code annule le precedent', async () => {
    const user = await registerUser(app, { email: 'deux@example.com' });
    await knownCode(user, '111111');

    await request(app).post('/api/auth/verify-email/send').set('Authorization', auth(user.token)).expect(204);
    await knownCode(user, '222222');

    await verifyWith(user, '111111').expect(400);
    await verifyWith(user, '222222').expect(200);
  });

  it("changer d'adresse annule la verification et prepare un nouveau code", async () => {
    const user = await registerUser(app, { email: 'avant@example.com' });
    await knownCode(user);
    await verifyWith(user, '123456').expect(200);

    const changed = await request(app)
      .patch('/api/auth/me/email')
      .set('Authorization', auth(user.token))
      .send({ email: 'apres@example.com', currentPassword: 'password123' })
      .expect(200);

    // Sans cela, verifier son adresse puis en changer viderait la garantie de son sens.
    expect(changed.body.emailVerifiedAt).toBeNull();
    expect(await prisma.emailVerification.count({ where: { userId: user.id, usedAt: null } })).toBe(1);
  });

  it('rejette un code mal forme (400) et exige une session (401)', async () => {
    const user = await registerUser(app, { email: 'forme@example.com' });
    await verifyWith(user, '12ab').expect(400);
    await request(app).post('/api/auth/verify-email').send({ code: '123456' }).expect(401);
  });
});
