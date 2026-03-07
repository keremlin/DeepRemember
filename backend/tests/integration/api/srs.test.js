// Integration tests for /api/srs
// Per audit-report.md [CRITICAL]: all srs endpoints are missing auth middleware.
// These tests assert the REQUIRED behaviour (401 without token).
// They fail against the unpatched code and must pass after the fix.

const request = require('supertest');
const app = require('../../../server');

describe('SRS routes — auth guard', () => {

  // --- card endpoints ---

  test('POST /api/srs/create-card returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/srs/create-card')
      .send({ userId: 'anyone', word: 'test' });
    expect(res.status).toBe(401);
  });

  test('GET /api/srs/review-cards/:userId returns 401 without token', async () => {
    const res = await request(app).get('/api/srs/review-cards/anyone');
    expect(res.status).toBe(401);
  });

  test('POST /api/srs/answer-card returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/srs/answer-card')
      .send({ userId: 'anyone', cardId: '1', rating: 3 });
    expect(res.status).toBe(401);
  });

  test('GET /api/srs/stats/:userId returns 401 without token', async () => {
    const res = await request(app).get('/api/srs/stats/anyone');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/srs/delete-card/:userId/:cardId returns 401 without token', async () => {
    const res = await request(app).delete('/api/srs/delete-card/anyone/card_001');
    expect(res.status).toBe(401);
  });

  // --- label endpoints ---

  test('GET /api/srs/labels/:userId returns 401 without token', async () => {
    const res = await request(app).get('/api/srs/labels/anyone');
    expect(res.status).toBe(401);
  });

  test('POST /api/srs/labels/:userId returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/srs/labels/anyone')
      .send({ name: 'test-label' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/srs/labels/:userId/:labelId returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/srs/labels/anyone/label_1')
      .send({ name: 'updated' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/srs/labels/:userId/:labelId returns 401 without token', async () => {
    const res = await request(app).delete('/api/srs/labels/anyone/label_1');
    expect(res.status).toBe(401);
  });

  test('POST /api/srs/cards/:userId/:cardId/labels returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/srs/cards/anyone/card_001/labels')
      .send({ labelId: 'label_1' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/srs/cards/:userId/:cardId/labels/:labelId returns 401 without token', async () => {
    const res = await request(app).delete('/api/srs/cards/anyone/card_001/labels/label_1');
    expect(res.status).toBe(401);
  });

  test('GET /api/srs/cards/:userId/:cardId/labels returns 401 without token', async () => {
    const res = await request(app).get('/api/srs/cards/anyone/card_001/labels');
    expect(res.status).toBe(401);
  });

  // --- debug endpoints (must be protected — currently fully public) ---

  test('GET /api/srs/debug/all-cards returns 401 without token', async () => {
    const res = await request(app).get('/api/srs/debug/all-cards');
    expect(res.status).toBe(401);
  });

  test('GET /api/srs/debug/log returns 401 without token', async () => {
    const res = await request(app).get('/api/srs/debug/log');
    expect(res.status).toBe(401);
  });

});
