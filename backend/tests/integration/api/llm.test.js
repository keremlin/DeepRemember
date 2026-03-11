// Integration tests for /api/llm
// All routes are protected — tests assert 401 without token.

const request = require('supertest');
const app = require('../../../server');

describe('LLM routes — auth guard', () => {
  test('GET /api/llm/models returns 401 without token', async () => {
    const res = await request(app).get('/api/llm/models');
    expect(res.status).toBe(401);
  });
});
