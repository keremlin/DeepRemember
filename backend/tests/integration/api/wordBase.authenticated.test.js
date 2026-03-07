// Integration tests for /api/word-base — authenticated access
//
// WHY THIS FILE EXISTS:
//   wordBase.test.js only checks 401 when no token is sent.
//   It did NOT catch that WordBaseContext.jsx was calling the API without
//   an Authorization header, causing the refresh button to silently fail.
//
//   These tests mock AuthMiddleware so verifyToken always passes, then
//   verify each endpoint returns 200 with the expected shape.
//   Any future change that breaks an authenticated word-base flow
//   (missing field, wrong status code, broken DB query) will fail here.

jest.mock('../../../security/authMiddleware', () => {
  return jest.fn().mockImplementation(() => ({
    verifyToken: (req, res, next) => {
      req.user = { email: 'test@integration.test', id: 'test-user-id' };
      req.userId = 'test@integration.test';
      req.userEmail = 'test@integration.test';
      next();
    },
    checkResourceOwnership: () => (req, res, next) => next(),
    verifyAdmin: (req, res, next) => next()
  }));
});

const request = require('supertest');
const app = require('../../../server');

describe('Word-base routes — authenticated responses', () => {

  // ── GET / ────────────────────────────────────────────────────────────────

  test('GET /api/word-base returns 200 with words array', async () => {
    const res = await request(app).get('/api/word-base');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.words)).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  test('GET /api/word-base with limit/offset returns 200', async () => {
    const res = await request(app).get('/api/word-base?limit=10&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.words)).toBe(true);
  });

  // ── GET /count/total ─────────────────────────────────────────────────────

  test('GET /api/word-base/count/total returns 200 with numeric count', async () => {
    const res = await request(app).get('/api/word-base/count/total');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  // ── POST / ───────────────────────────────────────────────────────────────

  test('POST /api/word-base with valid data returns 201', async () => {
    const res = await request(app)
      .post('/api/word-base')
      .send({ word: 'laufen', groupAlphabetName: 'L', type_of_word: 'verb' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.word).toBeDefined();
    expect(res.body.word.word).toBe('laufen');
  });

  test('POST /api/word-base with missing required fields returns 400', async () => {
    const res = await request(app)
      .post('/api/word-base')
      .send({ word: 'laufen' }); // missing groupAlphabetName and type_of_word
    expect(res.status).toBe(400);
  });

  // ── POST /bulk ───────────────────────────────────────────────────────────

  test('POST /api/word-base/bulk with valid data returns 201', async () => {
    const res = await request(app)
      .post('/api/word-base/bulk')
      .send({
        words: [
          { word: 'rennen', groupAlphabetName: 'R', type_of_word: 'verb' },
          { word: 'springen', groupAlphabetName: 'S', type_of_word: 'verb' }
        ]
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.insertedCount).toBe(2);
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────

  test('GET /api/word-base/:id returns 404 for non-existent id', async () => {
    const res = await request(app).get('/api/word-base/999999');
    expect(res.status).toBe(404);
  });

  test('GET /api/word-base/:id returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/word-base/not-a-number');
    expect(res.status).toBe(400);
  });

  test('GET /api/word-base/:id returns 200 for existing word', async () => {
    // Create a word first
    const createRes = await request(app)
      .post('/api/word-base')
      .send({ word: 'schreiben', groupAlphabetName: 'S', type_of_word: 'verb' });
    expect(createRes.status).toBe(201);
    const wordId = createRes.body.word.id;

    const res = await request(app).get(`/api/word-base/${wordId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.word.word).toBe('schreiben');
  });

  // ── PUT /:id ─────────────────────────────────────────────────────────────

  test('PUT /api/word-base/:id updates word and returns 200', async () => {
    const createRes = await request(app)
      .post('/api/word-base')
      .send({ word: 'lesen', groupAlphabetName: 'L', type_of_word: 'verb' });
    const wordId = createRes.body.word.id;

    const res = await request(app)
      .put(`/api/word-base/${wordId}`)
      .send({ word: 'lesen', groupAlphabetName: 'L', type_of_word: 'verb', translate: 'to read' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.word.translate).toBe('to read');
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────

  test('DELETE /api/word-base/:id deletes word and returns 200', async () => {
    const createRes = await request(app)
      .post('/api/word-base')
      .send({ word: 'toDelete', groupAlphabetName: 'T', type_of_word: 'noun' });
    const wordId = createRes.body.word.id;

    const res = await request(app).delete(`/api/word-base/${wordId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/word-base/:id returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/api/word-base/999999');
    expect(res.status).toBe(404);
  });

  // ── GET /search/:term ────────────────────────────────────────────────────

  test('GET /api/word-base/search/:term returns 200 with results array', async () => {
    const res = await request(app).get('/api/word-base/search/lauf');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.words)).toBe(true);
  });

});
