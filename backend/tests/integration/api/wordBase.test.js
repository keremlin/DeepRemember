// Integration tests for /api/word-base
// Per audit-report.md [CRITICAL]: all word-base endpoints are missing auth middleware.
// These tests assert the REQUIRED behaviour (401 without token).
// They fail against the unpatched code and must pass after the fix.

const request = require('supertest');
const app = require('../../../server');

describe('Word-base routes — auth guard', () => {

  test('GET /api/word-base returns 401 without token', async () => {
    const res = await request(app).get('/api/word-base');
    expect(res.status).toBe(401);
  });

  test('GET /api/word-base/:id returns 401 without token', async () => {
    const res = await request(app).get('/api/word-base/1');
    expect(res.status).toBe(401);
  });

  test('GET /api/word-base/group/:name returns 401 without token', async () => {
    const res = await request(app).get('/api/word-base/group/A');
    expect(res.status).toBe(401);
  });

  test('GET /api/word-base/type/:type returns 401 without token', async () => {
    const res = await request(app).get('/api/word-base/type/noun');
    expect(res.status).toBe(401);
  });

  test('GET /api/word-base/search/:term returns 401 without token', async () => {
    const res = await request(app).get('/api/word-base/search/laufen');
    expect(res.status).toBe(401);
  });

  test('POST /api/word-base returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/word-base')
      .send({ word: 'laufen', groupAlphabetName: 'L', type_of_word: 'verb' });
    expect(res.status).toBe(401);
  });

  test('POST /api/word-base/bulk returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/word-base/bulk')
      .send({ words: [{ word: 'laufen', groupAlphabetName: 'L', type_of_word: 'verb' }] });
    expect(res.status).toBe(401);
  });

  test('PUT /api/word-base/:id returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/word-base/1')
      .send({ word: 'laufen', groupAlphabetName: 'L', type_of_word: 'verb' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/word-base/:id returns 401 without token', async () => {
    const res = await request(app).delete('/api/word-base/1');
    expect(res.status).toBe(401);
  });

  test('GET /api/word-base/count/total returns 401 without token', async () => {
    const res = await request(app).get('/api/word-base/count/total');
    expect(res.status).toBe(401);
  });

});
