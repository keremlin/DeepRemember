// Integration tests for /api/app-variables
// All routes are protected — tests assert 401 without token.
// Validation (400) tests require a valid token so they are covered in unit tests.

const request = require('supertest');
const app = require('../../../server');

describe('App-variables routes — auth guard', () => {
  test('GET /api/app-variables returns 401 without token', async () => {
    const res = await request(app).get('/api/app-variables');
    expect(res.status).toBe(401);
  });

  test('GET /api/app-variables/:id returns 401 without token', async () => {
    const res = await request(app).get('/api/app-variables/1');
    expect(res.status).toBe(401);
  });

  test('GET /api/app-variables/keyname/:keyname returns 401 without token', async () => {
    const res = await request(app).get('/api/app-variables/keyname/test-key');
    expect(res.status).toBe(401);
  });

  test('POST /api/app-variables returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/app-variables')
      .send({ keyname: 'test', value: 'val', type: 'text' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/app-variables/keyname/:keyname returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/app-variables/keyname/test-key')
      .send({ value: 'updated' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/app-variables/keyname/:keyname returns 401 without token', async () => {
    const res = await request(app).delete('/api/app-variables/keyname/test-key');
    expect(res.status).toBe(401);
  });
});
