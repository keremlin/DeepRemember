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

  // ── GET /artikel/words ────────────────────────────────────────────────────

  test('GET /api/games/artikel/words returns 200 with words array', async () => {
    const res = await request(app).get('/api/games/artikel/words');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.words)).toBe(true);
  });

  test('GET /api/games/artikel/words returns only words with valid articles', async () => {
    // Seed a noun with article so there is at least one result
    const databaseFactory = require('../../../database/access/DatabaseFactory');
    const db = databaseFactory.getDatabase();
    await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
      { word: 'Buch', group_alphabet_name: 'B', type_of_word: 'noun', article: 'das' }
    );

    const res = await request(app).get('/api/games/artikel/words');
    expect(res.status).toBe(200);
    const articles = ['der', 'die', 'das'];
    res.body.words.forEach(w => {
      expect(articles).toContain((w.article || '').toLowerCase().trim());
    });
  });

  test('GET /api/games/artikel/words?count=1 returns at most 1 word', async () => {
    const res = await request(app).get('/api/games/artikel/words?count=1');
    expect(res.status).toBe(200);
    expect(res.body.words.length).toBeLessThanOrEqual(1);
  });

  test('GET /api/games/artikel/words word shape includes required fields', async () => {
    const res = await request(app).get('/api/games/artikel/words?count=5');
    expect(res.status).toBe(200);
    if (res.body.words.length > 0) {
      const w = res.body.words[0];
      expect(w).toHaveProperty('id');
      expect(w).toHaveProperty('word');
      expect(w).toHaveProperty('article');
      expect(w).toHaveProperty('lastAnswer');
      expect(w).toHaveProperty('dateOfLastAnswer');
    }
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

  // ── bestScore — Bester Score invariant tests ───────────────────────────────

  test('POST /api/games/data response always includes bestScore as a number', async () => {
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 5, total: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bestScore');
    expect(typeof res.body.bestScore).toBe('number');
  });

  test('POST /api/games/data bestScore is >= current round score', async () => {
    // The all-time best can only be >= the score just earned
    const res = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 6, total: 10 }); // score = 6*(6/10)*100 = 360
    expect(res.status).toBe(200);
    expect(res.body.bestScore).toBeGreaterThanOrEqual(res.body.score);
  });

  test('bestScore does NOT decrease after a weaker round', async () => {
    // Record a strong session first
    const strong = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 10, total: 10 }); // score = 1000
    const peakBestScore = strong.body.bestScore;

    // Now record a much weaker session
    const weak = await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 1, total: 10 }); // score = 10

    // The all-time best must not have regressed
    expect(weak.body.bestScore).toBeGreaterThanOrEqual(peakBestScore);
  });

  test('GET /api/games/data?gameId=1 bestScore is the all-time high, not the latest score', async () => {
    // Post a perfect session, then a terrible one, then check bestScore via GET
    await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 10, total: 10 }); // score = 1000 (perfect)
    await request(app)
      .post('/api/games/data')
      .send({ gameId: 1, correct: 0, total: 10 }); // score = 0 (terrible)

    const res = await request(app).get('/api/games/data?gameId=1');
    expect(res.status).toBe(200);
    // bestScore must reflect the 1000, not the 0
    expect(res.body.bestScore).toBeGreaterThanOrEqual(1000);
  });

  test('GET /api/games/data without gameId returns null bestScore', async () => {
    const res = await request(app).get('/api/games/data');
    expect(res.status).toBe(200);
    expect(res.body.bestScore).toBeNull();
  });

  // ── artikle_user_word_answer upsert via POST /data ────────────────────────
  // These tests verify the insert-if-new / update-if-exists behaviour:
  //   • First POST with a wordId → one record created in artikle_user_word_answer
  //   • Second POST with same wordId → record UPDATED, NOT a second row
  //   • lastAnswer from the most recent call is reflected in GET /artikel/words

  describe('artikle_user_word_answer — insert-if-new / update-if-exists', () => {
    let upsertWordId;

    beforeAll(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      const databaseFactory = require('../../../database/access/DatabaseFactory');
      const db = databaseFactory.getDatabase();
      const r = await db.execute(
        `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
        { word: 'Katze', group_alphabet_name: 'K', type_of_word: 'noun', article: 'die' }
      );
      upsertWordId = r.lastInsertRowid || r.lastInsertRowId;
    });

    test('first POST with wordAnswer creates exactly one record', async () => {
      await request(app)
        .post('/api/games/data')
        .send({ gameId: 1, correct: 1, total: 1,
          wordAnswers: [{ wordBaseId: upsertWordId, correct: 1, wrong: 0 }] });

      const databaseFactory = require('../../../database/access/DatabaseFactory');
      const db = databaseFactory.getDatabase();
      const rows = await db.query(
        `SELECT * FROM artikle_user_word_answer WHERE word_base_id = ? AND user_id = ?`,
        { word_base_id: upsertWordId, user_id: 'test@integration.test' }
      );
      expect(rows.length).toBe(1);
      expect(rows[0].last_answer).toBe('correct');
    });

    test('second POST with same wordId updates the record — still exactly one row', async () => {
      await request(app)
        .post('/api/games/data')
        .send({ gameId: 1, correct: 0, total: 1,
          wordAnswers: [{ wordBaseId: upsertWordId, correct: 0, wrong: 1 }] });

      const databaseFactory = require('../../../database/access/DatabaseFactory');
      const db = databaseFactory.getDatabase();
      const rows = await db.query(
        `SELECT * FROM artikle_user_word_answer WHERE word_base_id = ? AND user_id = ?`,
        { word_base_id: upsertWordId, user_id: 'test@integration.test' }
      );
      expect(rows.length).toBe(1);                        // not two rows
      expect(rows[0].number_of_correct_answer).toBe(1);  // from first POST
      expect(rows[0].number_of_wrong_answer).toBe(1);    // from second POST
      expect(rows[0].last_answer).toBe('wrong');          // updated to latest
    });

    test('updated lastAnswer is visible in GET /artikel/words', async () => {
      const databaseFactory = require('../../../database/access/DatabaseFactory');
      const db = databaseFactory.getDatabase();
      const r = await db.execute(
        `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
        { word: 'Fenster', group_alphabet_name: 'F', type_of_word: 'noun', article: 'das' }
      );
      const fensterWordId = r.lastInsertRowid || r.lastInsertRowId;

      // Answer wrong once
      await request(app)
        .post('/api/games/data')
        .send({ gameId: 1, correct: 0, total: 1,
          wordAnswers: [{ wordBaseId: fensterWordId, correct: 0, wrong: 1 }] });

      const res = await request(app).get('/api/games/artikel/words?count=9999');
      expect(res.status).toBe(200);
      const fenster = res.body.words.find(w => w.id === fensterWordId);
      expect(fenster).toBeDefined();
      expect(fenster.lastAnswer).toBe('wrong');
    });

    test('counts accumulate across multiple rounds — no data is lost', async () => {
      const databaseFactory = require('../../../database/access/DatabaseFactory');
      const db = databaseFactory.getDatabase();
      const r = await db.execute(
        `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
        { word: 'Tür', group_alphabet_name: 'T', type_of_word: 'noun', article: 'die' }
      );
      const wordId = r.lastInsertRowid || r.lastInsertRowId;

      // Round 1: 2 correct
      await request(app)
        .post('/api/games/data')
        .send({ gameId: 1, correct: 2, total: 2,
          wordAnswers: [{ wordBaseId: wordId, correct: 2, wrong: 0 }] });

      // Round 2: 1 wrong
      await request(app)
        .post('/api/games/data')
        .send({ gameId: 1, correct: 0, total: 1,
          wordAnswers: [{ wordBaseId: wordId, correct: 0, wrong: 1 }] });

      const rows = await db.query(
        `SELECT * FROM artikle_user_word_answer WHERE word_base_id = ? AND user_id = ?`,
        { word_base_id: wordId, user_id: 'test@integration.test' }
      );
      expect(rows.length).toBe(1);
      expect(rows[0].number_of_correct_answer).toBe(2); // round 1
      expect(rows[0].number_of_wrong_answer).toBe(1);   // round 2
    });
  });

});
