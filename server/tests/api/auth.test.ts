import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/models/User';
import { useTestDatabase } from '../helpers/db';
import { TEST_PASSWORD, app, createStudent } from '../helpers/factories';

useTestDatabase();

function setCookieHeader(res: request.Response): string {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  return header?.join('; ') ?? '';
}

describe('POST /api/auth/register', () => {
  it('creates a student and starts a session in an httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Test', email: 'ADA.Test@Example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      name: 'Ada Test',
      email: 'ada.test@example.com',
      xp: 0,
      quizzesCompleted: 0,
      badges: [],
    });
    expect(setCookieHeader(res)).toMatch(/pn_session=/);
    expect(setCookieHeader(res)).toMatch(/HttpOnly/i);
  });

  it('never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Test', email: 'ada@example.com', password: TEST_PASSWORD });

    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ada', email: 'ada@example.com', password: TEST_PASSWORD });

    const user = await UserModel.findOne({ email: 'ada@example.com' }).select('+passwordHash');
    expect(user?.passwordHash).not.toBe(TEST_PASSWORD);
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('ignores fields the client should not control, such as XP', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky',
      email: 'sneaky@example.com',
      password: TEST_PASSWORD,
      xp: 99_999,
      badges: [{ key: 'perfect-score' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.xp).toBe(0);
    expect(res.body.data.user.badges).toEqual([]);
  });

  it('rejects an email that is already registered', async () => {
    const { email } = await createStudent();
    const res = await request(app).post('/api/auth/register').send({ name: 'Again', email, password: TEST_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('explains which fields are invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'nope', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('rejects a body that is not valid JSON', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": broken');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password', async () => {
    const { email } = await createStudent('Login Test');
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Login Test');
    expect(setCookieHeader(res)).toMatch(/pn_session=/);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const { email } = await createStudent();

    const wrongPassword = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the logged-in student', async () => {
    const { agent } = await createStudent('Me Test');
    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Me Test');
  });

  it('rejects a request with no session', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'pn_session=not.a.real-token');
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with a different secret', async () => {
    const { id } = await createStudent();
    const forged = jwt.sign({ sub: id }, 'an-attacker-secret-that-is-also-32-chars-long');

    const res = await request(app).get('/api/auth/me').set('Cookie', `pn_session=${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects a valid token for an account that no longer exists', async () => {
    const { agent, id } = await createStudent();
    await UserModel.deleteOne({ _id: id });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('ends the session', async () => {
    const { agent } = await createStudent();

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });
});
