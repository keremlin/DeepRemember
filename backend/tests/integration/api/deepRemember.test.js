// Integration tests for /deepRemember
// All routes are protected — tests assert 401 without token.
// NOTE: debug endpoints must also be protected (audit finding).

const request = require('supertest');
const app = require('../../../server');

describe('DeepRemember routes — auth guard', () => {
  test('POST /deepRemember/create-card returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/create-card')
      .send({ userId: 'test', word: 'lernen' });
    expect(res.status).toBe(401);
  });

  test('GET /deepRemember/review-cards/:userId returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/review-cards/anyone');
    expect(res.status).toBe(401);
  });

  test('GET /deepRemember/all-cards/:userId returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/all-cards/anyone');
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/answer-card returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/answer-card')
      .send({ userId: 'anyone', cardId: '1', rating: 3 });
    expect(res.status).toBe(401);
  });

  test('GET /deepRemember/stats/:userId returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/stats/anyone');
    expect(res.status).toBe(401);
  });

  test('DELETE /deepRemember/delete-card/:userId/:cardId returns 401 without token', async () => {
    const res = await request(app).delete('/deepRemember/delete-card/anyone/card_001');
    expect(res.status).toBe(401);
  });

  test('PUT /deepRemember/update-card/:userId/:cardId returns 401 without token', async () => {
    const res = await request(app)
      .put('/deepRemember/update-card/anyone/card_001')
      .send({ word: 'lernen' });
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/convert-to-speech returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/convert-to-speech')
      .send({ text: 'test' });
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/translate-word returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/translate-word')
      .send({ word: 'lernen' });
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/translate returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/translate')
      .send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/analyze-sentence returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/analyze-sentence')
      .send({ sentence: 'Ich lerne Deutsch' });
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/save-sentence-analysis returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/save-sentence-analysis')
      .send({ sentence: 'test', analysis: {} });
    expect(res.status).toBe(401);
  });

  test('GET /deepRemember/search-similar/:userId/:query returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/search-similar/anyone/lernen');
    expect(res.status).toBe(401);
  });

  test('POST /deepRemember/chat returns 401 without token', async () => {
    const res = await request(app)
      .post('/deepRemember/chat')
      .send({ message: 'hello' });
    expect(res.status).toBe(401);
  });

  test('GET /deepRemember/get-audio/:word/:sentence returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/get-audio/lernen/Ich%20lerne');
    expect(res.status).toBe(401);
  });

  // Debug endpoints — must be protected (audit finding)
  test('GET /deepRemember/debug/all-cards returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/debug/all-cards');
    expect(res.status).toBe(401);
  });

  test('GET /deepRemember/debug/log returns 401 without token', async () => {
    const res = await request(app).get('/deepRemember/debug/log');
    expect(res.status).toBe(401);
  });
});
