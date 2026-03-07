// Integration tests for /api/games — authenticated access
//
// WHY THIS FILE EXISTS:
//   games.test.js only checks 401 when no token is sent.
//   It does NOT verify that authenticated Artikel-Spiel flows work:
//   listing games, saving session results, per-word answer upserts,
//   score formula, and fetching game history.
//
//   These tests mock AuthMiddleware so verifyToken always passes, then
//   verify each endpoint returns the correct shape and status.

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

// Seed the test user so game_data FK (user_id → users.user_id) is satisfied.
// DatabaseFactory is a singleton initialized when server.js is required above.
beforeAll(async () => {
  // Allow async route initialization to finish
  await new Promise(resolve => setImmediate(resolve));
  const databaseFactory = require('../../../database/access/DatabaseFactory');
  const db = databaseFactory.getDatabase();
  await db.execute(
    `INSERT OR IGNORE INTO users (user_id) VALUES (?)`,
    { user_id: 'test@integration.test' }
  );
});

describe('Games routes — authenticated responses', () => {

  // ── GET / ─────────────────────────────────────────────────────────────────

  test('GET /api/games returns 200 with games array', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.games)).toBe(true);
  });

  test('GET /api/games includes the seeded Artikel-Spiel game', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(200);
    const game = res.body.games.find(g => g.name === 'Artikel-Spiel');
    expect(game).toBeDefined();
    expect(game.id).toBe(1);
  });

  // ── POST /data ────────────────────────────────────────────────────────────

  test('POST /api/games/data with missing gameId returns 400', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({ correct: 8, total: 10 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/games/data with valid data returns 200', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 8, total: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.entry).toBeDefined();
    expect(typeof res.body.score).toBe('number');
    expect(typeof res.body.bestScore).toBe('number');
    expect(typeof res.body.accuracy).toBe('number');
  });

  test('POST /api/games/data score formula: C*(C/G)*100', async () => {
    // correct=8, total=10 → 8 * (8/10) * 100 = 640
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 8, total: 10 });
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(640);
  });

  test('POST /api/games/data with total=0 returns score 0', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 0, total: 0 });
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
  });

  test('POST /api/games/data accuracy field is correct', async () => {
    // correct=7, total=10 → accuracy = 70
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 7, total: 10 });
    expect(res.status).toBe(200);
    expect(res.body.accuracy).toBe(70);
  });

  test('POST /api/games/data with level field stores level', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 5, total: 10, level: 'A1' });
    expect(res.status).toBe(200);
    expect(res.body.entry.level).toBe('A1');
  });

  test('POST /api/games/data with wordAnswers array accepted and returns 200', async () => {
    // Directly seed a word into the games repository's DB so the FK is satisfied.
    // All route repos share the same DatabaseFactory singleton after initialization.
    await new Promise(resolve => setTimeout(resolve, 100)); // let all inits settle
    const databaseFactory = require('../../../database/access/DatabaseFactory');
    const db = databaseFactory.getDatabase();
    const wordResult = await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word) VALUES (?, ?, ?)`,
      { word: 'Hund', group_alphabet_name: 'H', type_of_word: 'noun' }
    );
    const wordId = wordResult.lastInsertRowid || wordResult.lastInsertRowId;

    const res = await request(app)
      .post('/api/games/data')
      .send({
        gameId: 1,
        correct: 3,
        total: 4,
        wordAnswers: [
          { wordBaseId: wordId, correct: 2, wrong: 0 }
        ]
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/games/data wordAnswers without wordBaseId are skipped', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({
        gameId: 1,
        correct: 2,
        total: 5,
        wordAnswers: [
          { correct: 1, wrong: 0 } // no wordBaseId — should be skipped, not throw
        ]
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── GET /data ─────────────────────────────────────────────────────────────

  test('GET /api/games/data returns 200 with data array', async () => {
    const res = await request(app).get('/api/games/data');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/games/data?gameId=1 returns filtered history', async () => {
    const res = await request(app).get('/api/games/data?gameId=1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.bestScore).toBe('number');
    // All returned entries must belong to game 1
    res.body.data.forEach(entry => {
      expect(entry.gameId).toBe(1);
    });
  });

  test('GET /api/games/data bestScore reflects highest score for user', async () => {
    // Post a high-score session
    await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 10, total: 10 }); // score = 10*(10/10)*100 = 1000

    const res = await request(app).get('/api/games/data?gameId=1');
    expect(res.status).toBe(200);
    expect(res.body.bestScore).toBeGreaterThanOrEqual(1000);
  });

});
