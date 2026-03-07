// Integration tests for /api/auth
// Tests public-route validation (no Supabase required) + auth guard on protected routes.

const request = require('supertest');
const app = require('../../../server');

// ─── Public route validation ────────────────────────────────────────────────

describe('POST /api/auth/register — input validation', () => {
  test('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Test1234!' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 when password missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 when both fields missing', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Test1234!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  test('400 for password shorter than 6 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });
});

describe('POST /api/auth/login — input validation', () => {
  test('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Test1234!' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 when password missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/reset-password — input validation', () => {
  test('400 when email missing', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/verify-token — input validation', () => {
  test('400 when token missing', async () => {
    const res = await request(app).post('/api/auth/verify-token').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/refresh-token — input validation', () => {
  test('400 when refresh_token missing', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/resend-confirmation — input validation', () => {
  test('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/resend-confirmation')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/confirm-email — input validation', () => {
  test('400 when token missing', async () => {
    const res = await request(app).post('/api/auth/confirm-email').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Protected routes — auth guard ──────────────────────────────────────────

describe('Auth-guarded routes — 401 without token', () => {
  test('POST /api/auth/logout returns 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('PUT /api/auth/change-password returns 401', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'newpass' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/auth/account returns 401', async () => {
    const res = await request(app).delete('/api/auth/account');
    expect(res.status).toBe(401);
  });
});
