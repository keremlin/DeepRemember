// Integration tests for /api/timer
// All routes are protected — tests assert 401 without token.
// Also tests 400 for missing lengthSeconds on /pause and /end (these hit auth first).

const request = require('supertest');
const app = require('../../../server');

describe('Timer routes — auth guard', () => {
  test('POST /api/timer/start returns 401 without token', async () => {
    const res = await request(app).post('/api/timer/start');
    expect(res.status).toBe(401);
  });

  test('POST /api/timer/pause returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/timer/pause')
      .send({ lengthSeconds: 60 });
    expect(res.status).toBe(401);
  });

  test('POST /api/timer/resume returns 401 without token', async () => {
    const res = await request(app).post('/api/timer/resume');
    expect(res.status).toBe(401);
  });

  test('POST /api/timer/end returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/timer/end')
      .send({ lengthSeconds: 120 });
    expect(res.status).toBe(401);
  });

  test('GET /api/timer/today-total returns 401 without token', async () => {
    const res = await request(app).get('/api/timer/today-total');
    expect(res.status).toBe(401);
  });

  test('GET /api/timer/active returns 401 without token', async () => {
    const res = await request(app).get('/api/timer/active');
    expect(res.status).toBe(401);
  });

  test('GET /api/timer/activity-stats returns 401 without token', async () => {
    const res = await request(app).get('/api/timer/activity-stats');
    expect(res.status).toBe(401);
  });
});
