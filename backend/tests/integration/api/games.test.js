// Integration tests for /api/games
// All routes are protected — tests assert 401 without token.

const request = require('supertest');
const app = require('../../../server');

describe('Games routes — auth guard', () => {
  test('GET /api/games returns 401 without token', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(401);
  });

  test('POST /api/games/data returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 5, total: 10 });
    expect(res.status).toBe(401);
  });

  test('GET /api/games/data returns 401 without token', async () => {
    const res = await request(app).get('/api/games/data');
    expect(res.status).toBe(401);
  });
});
