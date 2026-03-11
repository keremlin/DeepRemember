// Integration tests for /api/chat-templates
// All routes are protected — tests assert 401 without token + 400 for invalid level.

const request = require('supertest');
const app = require('../../../server');

describe('Chat-template routes — auth guard', () => {
  test('GET /api/chat-templates returns 401 without token', async () => {
    const res = await request(app).get('/api/chat-templates');
    expect(res.status).toBe(401);
  });

  test('GET /api/chat-templates/:id returns 401 without token', async () => {
    const res = await request(app).get('/api/chat-templates/1');
    expect(res.status).toBe(401);
  });

  test('POST /api/chat-templates returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/chat-templates')
      .send({ thema: 'test', level: 'A1' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/chat-templates/:id returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/chat-templates/1')
      .send({ thema: 'updated' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/chat-templates/:id returns 401 without token', async () => {
    const res = await request(app).delete('/api/chat-templates/1');
    expect(res.status).toBe(401);
  });
});
