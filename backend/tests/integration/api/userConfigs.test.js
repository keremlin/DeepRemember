// Integration tests for /api/user-configs
// All routes are protected — tests assert 401 without token.

const request = require('supertest');
const app = require('../../../server');

describe('User-configs routes — auth guard', () => {
  test('GET /api/user-configs returns 401 without token', async () => {
    const res = await request(app).get('/api/user-configs');
    expect(res.status).toBe(401);
  });

  test('GET /api/user-configs/:id returns 401 without token', async () => {
    const res = await request(app).get('/api/user-configs/1');
    expect(res.status).toBe(401);
  });

  test('GET /api/user-configs/name/:name returns 401 without token', async () => {
    const res = await request(app).get('/api/user-configs/name/myConfig');
    expect(res.status).toBe(401);
  });

  test('POST /api/user-configs returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/user-configs')
      .send({ name: 'myConfig', value_type: 'string', value: 'test' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/user-configs/:id returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/user-configs/1')
      .send({ value: 'updated' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/user-configs/:id returns 401 without token', async () => {
    const res = await request(app).delete('/api/user-configs/1');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/user-configs/name/:name returns 401 without token', async () => {
    const res = await request(app).delete('/api/user-configs/name/myConfig');
    expect(res.status).toBe(401);
  });
});
