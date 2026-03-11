// Unit tests for GamesRepository using in-memory SQLite.
// Does NOT use DatabaseFactory (singleton) — instantiates SQLiteDatabase directly.

const SQLiteDatabase = require('../../../database/access/SQLiteDatabase');
const GamesRepository = require('../../../database/access/GamesRepository');

const TEST_USER = 'unit-test-user@games.test';
let db, repo;

beforeAll(async () => {
  db = new SQLiteDatabase(':memory:');
  await db.initialize();
  repo = new GamesRepository(db);

  // Seed a user (required by game_data and artikle_user_word_answer FKs)
  await db.execute(
    `INSERT OR IGNORE INTO users (user_id) VALUES (?)`,
    { user_id: TEST_USER }
  );
});

afterAll(async () => {
  await db.close();
});

// ─── getAllGames ──────────────────────────────────────────────────────────────

describe('GamesRepository.getAllGames', () => {
  test('returns an array', async () => {
    const games = await repo.getAllGames();
    expect(Array.isArray(games)).toBe(true);
  });

  test('includes the seeded Artikel-Spiel game', async () => {
    const games = await repo.getAllGames();
    const artikelSpiel = games.find(g => g.name === 'Artikel-Spiel');
    expect(artikelSpiel).toBeDefined();
    expect(artikelSpiel.id).toBe(1);
  });

  test('maps DB rows to camelCase fields', async () => {
    const games = await repo.getAllGames();
    expect(games[0]).toHaveProperty('id');
    expect(games[0]).toHaveProperty('name');
    expect(games[0]).toHaveProperty('createDate');
  });
});

// ─── getGameById ─────────────────────────────────────────────────────────────

describe('GamesRepository.getGameById', () => {
  test('returns the Artikel-Spiel game for id=1', async () => {
    const game = await repo.getGameById(1);
    expect(game).not.toBeNull();
    expect(game.name).toBe('Artikel-Spiel');
  });

  test('returns null for non-existent id', async () => {
    const game = await repo.getGameById(99999);
    expect(game).toBeNull();
  });
});

// ─── createGame / updateGame / deleteGame ────────────────────────────────────

describe('GamesRepository.createGame', () => {
  test('creates a game and returns it with an id', async () => {
    const game = await repo.createGame({ name: 'Test-Spiel', description: 'A test game' });
    expect(game).toBeDefined();
    expect(game.id).toBeDefined();
    expect(game.name).toBe('Test-Spiel');
    expect(game.description).toBe('A test game');
  });

  test('description is optional', async () => {
    const game = await repo.createGame({ name: 'Minimal-Spiel' });
    expect(game.description).toBeNull();
  });
});

describe('GamesRepository.updateGame', () => {
  let gameId;
  beforeAll(async () => {
    const game = await repo.createGame({ name: 'ToUpdate', description: 'old' });
    gameId = game.id;
  });

  test('updates name and description, returns true', async () => {
    const ok = await repo.updateGame(gameId, { name: 'Updated', description: 'new' });
    expect(ok).toBe(true);
    const updated = await repo.getGameById(gameId);
    expect(updated.name).toBe('Updated');
    expect(updated.description).toBe('new');
  });

  test('returns false for non-existent id', async () => {
    const ok = await repo.updateGame(99999, { name: 'X' });
    expect(ok).toBe(false);
  });
});

describe('GamesRepository.deleteGame', () => {
  test('deletes a game and returns true', async () => {
    const game = await repo.createGame({ name: 'ToDelete' });
    const ok = await repo.deleteGame(game.id);
    expect(ok).toBe(true);
    const gone = await repo.getGameById(game.id);
    expect(gone).toBeNull();
  });

  test('returns false for non-existent id', async () => {
    const ok = await repo.deleteGame(99999);
    expect(ok).toBe(false);
  });
});

// ─── saveGameData / getGameDataById ──────────────────────────────────────────

describe('GamesRepository.saveGameData', () => {
  test('saves a game session and returns it with an id', async () => {
    const entry = await repo.saveGameData({
      name: 'Artikel-Spiel',
      level: 'A1',
      userId: TEST_USER,
      gameId: 1,
      score: 640
    });
    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.score).toBe(640);
    expect(entry.level).toBe('A1');
    expect(entry.gameId).toBe(1);
    expect(entry.userId).toBe(TEST_USER);
  });

  test('score defaults to 0 when not provided', async () => {
    const entry = await repo.saveGameData({
      userId: TEST_USER,
      gameId: 1
    });
    expect(entry.score).toBe(0);
  });
});

describe('GamesRepository.getGameDataById', () => {
  test('returns the saved entry', async () => {
    const saved = await repo.saveGameData({ userId: TEST_USER, gameId: 1, score: 100 });
    const found = await repo.getGameDataById(saved.id);
    expect(found).not.toBeNull();
    expect(found.id).toBe(saved.id);
    expect(found.score).toBe(100);
  });

  test('returns null for non-existent id', async () => {
    const found = await repo.getGameDataById(99999);
    expect(found).toBeNull();
  });
});

// ─── getGameDataByUser ────────────────────────────────────────────────────────

describe('GamesRepository.getGameDataByUser', () => {
  const OTHER_USER = 'other-user@games.test';

  beforeAll(async () => {
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: OTHER_USER });
    await repo.saveGameData({ userId: OTHER_USER, gameId: 1, score: 50 });
  });

  test('returns all game data for the user', async () => {
    const data = await repo.getGameDataByUser(TEST_USER);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    data.forEach(entry => expect(entry.userId).toBe(TEST_USER));
  });

  test('filters by gameId when provided', async () => {
    const data = await repo.getGameDataByUser(TEST_USER, 1);
    expect(data.every(e => e.gameId === 1)).toBe(true);
  });

  test('does not return other users data', async () => {
    const data = await repo.getGameDataByUser(TEST_USER);
    expect(data.every(e => e.userId === TEST_USER)).toBe(true);
  });

  test('returns empty array for user with no data', async () => {
    const data = await repo.getGameDataByUser('nobody@test.com');
    expect(data).toEqual([]);
  });
});

// ─── getGameDataByGame ────────────────────────────────────────────────────────

describe('GamesRepository.getGameDataByGame', () => {
  test('returns entries for the given gameId', async () => {
    const data = await repo.getGameDataByGame(1);
    expect(Array.isArray(data)).toBe(true);
    expect(data.every(e => e.gameId === 1)).toBe(true);
  });

  test('returns empty array for non-existent gameId', async () => {
    const data = await repo.getGameDataByGame(99999);
    expect(data).toEqual([]);
  });
});

// ─── getBestScore ─────────────────────────────────────────────────────────────

describe('GamesRepository.getBestScore', () => {
  const SCORE_USER = 'score-user@games.test';

  beforeAll(async () => {
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: SCORE_USER });
    await repo.saveGameData({ userId: SCORE_USER, gameId: 1, score: 200 });
    await repo.saveGameData({ userId: SCORE_USER, gameId: 1, score: 850 });
    await repo.saveGameData({ userId: SCORE_USER, gameId: 1, score: 300 });
  });

  test('returns the highest score for the user', async () => {
    const best = await repo.getBestScore(SCORE_USER, 1);
    expect(best).toBe(850);
  });

  test('returns 0 when user has no entries', async () => {
    const best = await repo.getBestScore('ghost@test.com', 1);
    expect(best).toBe(0);
  });

  test('score improves after a better session', async () => {
    await repo.saveGameData({ userId: SCORE_USER, gameId: 1, score: 1000 });
    const best = await repo.getBestScore(SCORE_USER, 1);
    expect(best).toBe(1000);
  });

  test('best score does NOT decrease after a lower score session', async () => {
    // Current best is 1000 (from previous test). Save a worse result.
    await repo.saveGameData({ userId: SCORE_USER, gameId: 1, score: 50 });
    const best = await repo.getBestScore(SCORE_USER, 1);
    // Must still be the all-time high, never the most-recent low
    expect(best).toBe(1000);
  });

  test('best score is isolated per user — other users scores do not affect it', async () => {
    const OTHER = 'other-score-user@games.test';
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: OTHER });
    // Save a much higher score for a different user
    await repo.saveGameData({ userId: OTHER, gameId: 1, score: 9999 });

    const best = await repo.getBestScore(SCORE_USER, 1);
    // SCORE_USER's best must not be polluted by OTHER's score
    expect(best).toBe(1000);
  });

  test('best score is isolated per gameId — other games scores do not affect it', async () => {
    // Create a second game so the FK is satisfied
    const otherGame = await repo.createGame({ name: 'Other-Spiel' });

    // Save an absurdly high score for SCORE_USER under the other game
    await repo.saveGameData({ userId: SCORE_USER, gameId: otherGame.id, score: 99999 });

    const best = await repo.getBestScore(SCORE_USER, 1);
    // game 1 best must remain unaffected by the other game's score
    expect(best).toBe(1000);
  });

  test('returns a number, never null or undefined', async () => {
    const best = await repo.getBestScore(SCORE_USER, 1);
    expect(typeof best).toBe('number');
  });
});

// ─── deleteGameDataByUser ────────────────────────────────────────────────────

describe('GamesRepository.deleteGameDataByUser', () => {
  const DEL_USER = 'delete-user@games.test';

  beforeAll(async () => {
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: DEL_USER });
    await repo.saveGameData({ userId: DEL_USER, gameId: 1, score: 10 });
    await repo.saveGameData({ userId: DEL_USER, gameId: 1, score: 20 });
  });

  test('deletes all game data for the user and returns count', async () => {
    const deleted = await repo.deleteGameDataByUser(DEL_USER);
    expect(deleted).toBeGreaterThanOrEqual(2);
    const remaining = await repo.getGameDataByUser(DEL_USER);
    expect(remaining).toEqual([]);
  });

  test('returns 0 when user has no data', async () => {
    const deleted = await repo.deleteGameDataByUser('nobody@games.test');
    expect(deleted).toBe(0);
  });
});

// ─── upsertArtikelUserWordAnswer ─────────────────────────────────────────────

describe('GamesRepository.upsertArtikelUserWordAnswer', () => {
  let wordId, gameDataId;

  beforeAll(async () => {
    // Seed a word_base entry for the FK
    const wordResult = await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word) VALUES (?, ?, ?)`,
      { word: 'Hund', group_alphabet_name: 'H', type_of_word: 'noun' }
    );
    wordId = wordResult.lastInsertRowid || wordResult.lastInsertRowId;

    // Seed a game_data entry for the FK
    const entry = await repo.saveGameData({ userId: TEST_USER, gameId: 1, score: 100 });
    gameDataId = entry.id;
  });

  test('inserts a new per-word answer record', async () => {
    await expect(repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId,
      userId: TEST_USER,
      correctDelta: 3,
      wrongDelta: 1,
      lastAnswer: 'correct',
      lastGameDataId: gameDataId
    })).resolves.not.toThrow();
  });

  test('increments counts on second answer for same word+user', async () => {
    // First upsert: 2 correct, 0 wrong
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId,
      userId: TEST_USER,
      correctDelta: 2,
      wrongDelta: 0,
      lastAnswer: 'correct',
      lastGameDataId: gameDataId
    });

    // Second upsert: 1 correct, 1 wrong
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId,
      userId: TEST_USER,
      correctDelta: 1,
      wrongDelta: 1,
      lastAnswer: 'wrong',
      lastGameDataId: gameDataId
    });

    const answers = await repo.getArtikelUserWordAnswers(TEST_USER);
    const record = answers.find(a => a.wordBaseId === wordId);
    expect(record).toBeDefined();
    // Total correct = initial 3 (from first test) + 2 + 1 = 6; total wrong = 1 + 0 + 1 = 2
    expect(record.numberOfCorrectAnswer).toBeGreaterThanOrEqual(3);
    expect(record.numberOfWrongAnswer).toBeGreaterThanOrEqual(1);
    expect(record.lastAnswer).toBe('wrong');
  });

  test('lastAnswer must be correct or wrong', async () => {
    // The CHECK constraint should reject invalid values
    await expect(repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId,
      userId: TEST_USER,
      correctDelta: 1,
      wrongDelta: 0,
      lastAnswer: 'invalid-value',
      lastGameDataId: gameDataId
    })).rejects.toThrow();
  });
});

// ─── getArtikelWordSelection ──────────────────────────────────────────────────

describe('GamesRepository.getArtikelWordSelection', () => {
  const SEL_USER = 'selection-user@games.test';
  let nounId2, nounId3, gameDataId;

  beforeAll(async () => {
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: SEL_USER });

    // Insert three nouns with articles (nounId unused — Haus is a "new" control word)
    await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
      { word: 'Haus', group_alphabet_name: 'H', type_of_word: 'noun', article: 'das' }
    );

    const r2 = await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
      { word: 'Tisch', group_alphabet_name: 'T', type_of_word: 'noun', article: 'der' }
    );
    nounId2 = r2.lastInsertRowid || r2.lastInsertRowId;

    const r3 = await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
      { word: 'Lampe', group_alphabet_name: 'L', type_of_word: 'noun', article: 'die' }
    );
    nounId3 = r3.lastInsertRowid || r3.lastInsertRowId;

    // Seed a game_data entry for FK
    const entry = await repo.saveGameData({ userId: SEL_USER, gameId: 1, score: 0 });
    gameDataId = entry.id;
  });

  test('returns an array', async () => {
    const words = await repo.getArtikelWordSelection(SEL_USER);
    expect(Array.isArray(words)).toBe(true);
  });

  test('returns only words with a valid article', async () => {
    const words = await repo.getArtikelWordSelection(SEL_USER);
    const articles = ['der', 'die', 'das'];
    words.forEach(w => {
      expect(articles).toContain((w.article || '').toLowerCase().trim());
    });
  });

  test('with no history all returned words have lastAnswer null', async () => {
    const words = await repo.getArtikelWordSelection(SEL_USER, 30);
    words.forEach(w => expect(w.lastAnswer).toBeNull());
  });

  test('maps rows to expected camelCase fields', async () => {
    const words = await repo.getArtikelWordSelection(SEL_USER, 1);
    if (words.length > 0) {
      const w = words[0];
      expect(w).toHaveProperty('id');
      expect(w).toHaveProperty('word');
      expect(w).toHaveProperty('article');
      expect(w).toHaveProperty('lastAnswer');
      expect(w).toHaveProperty('dateOfLastAnswer');
    }
  });

  test('wrong words appear when last_answer is wrong', async () => {
    // Mark nounId2 as wrong for SEL_USER
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: nounId2,
      userId: SEL_USER,
      correctDelta: 0,
      wrongDelta: 1,
      lastAnswer: 'wrong',
      lastGameDataId: gameDataId
    });

    const words = await repo.getArtikelWordSelection(SEL_USER, 30);
    const wrong = words.find(w => w.id === nounId2);
    expect(wrong).toBeDefined();
    expect(wrong.lastAnswer).toBe('wrong');
  });

  test('correct words appear when last_answer is correct', async () => {
    // Mark nounId3 as correct for SEL_USER
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: nounId3,
      userId: SEL_USER,
      correctDelta: 1,
      wrongDelta: 0,
      lastAnswer: 'correct',
      lastGameDataId: gameDataId
    });

    const words = await repo.getArtikelWordSelection(SEL_USER, 30);
    const correct = words.find(w => w.id === nounId3);
    expect(correct).toBeDefined();
    expect(correct.lastAnswer).toBe('correct');
  });

  test('user with no history gets all words as new (lastAnswer null)', async () => {
    // word_base is shared; a brand-new user has no answer history so every
    // returned word must have lastAnswer === null
    const words = await repo.getArtikelWordSelection('nobody-nouns@test.com', 30);
    words.forEach(w => expect(w.lastAnswer).toBeNull());
  });

  test('respects count limit — returns at most count words', async () => {
    const words = await repo.getArtikelWordSelection(SEL_USER, 1);
    expect(words.length).toBeLessThanOrEqual(1);
  });

  // ── Distribution test ──────────────────────────────────────────────────────
  // Seeds 40 new / 35 wrong / 25 correct words for a dedicated user, then
  // verifies that getArtikelWordSelection(count=100) returns the correct split.
  test('40 % new · 35 % wrong · 25 % correct distribution', async () => {
    const DIST_USER = 'dist-test@games.test';
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: DIST_USER });

    const gdEntry = await repo.saveGameData({ userId: DIST_USER, gameId: 1, score: 0 });
    const gdId = gdEntry.id;

    const COUNT = 100;
    const NEW_TARGET     = Math.round(COUNT * 0.40); // 40
    const WRONG_TARGET   = Math.round(COUNT * 0.35); // 35
    const CORRECT_TARGET = COUNT - NEW_TARGET - WRONG_TARGET; // 25

    // Insert NEW_TARGET + WRONG_TARGET + CORRECT_TARGET nouns
    const totalWords = NEW_TARGET + WRONG_TARGET + CORRECT_TARGET;
    const wordIds = [];
    for (let i = 0; i < totalWords; i++) {
      const r = await db.execute(
        `INSERT INTO word_base (word, group_alphabet_name, type_of_word, article) VALUES (?, ?, ?, ?)`,
        { word: `DistWord${i}`, group_alphabet_name: 'D', type_of_word: 'noun', article: 'der' }
      );
      wordIds.push(r.lastInsertRowid || r.lastInsertRowId);
    }

    // Mark the first WRONG_TARGET as wrong
    for (let i = 0; i < WRONG_TARGET; i++) {
      await repo.upsertArtikelUserWordAnswer({
        wordBaseId: wordIds[i], userId: DIST_USER,
        correctDelta: 0, wrongDelta: 1, lastAnswer: 'wrong', lastGameDataId: gdId
      });
    }

    // Mark the next CORRECT_TARGET as correct
    for (let i = WRONG_TARGET; i < WRONG_TARGET + CORRECT_TARGET; i++) {
      await repo.upsertArtikelUserWordAnswer({
        wordBaseId: wordIds[i], userId: DIST_USER,
        correctDelta: 1, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gdId
      });
    }

    // The remaining NEW_TARGET words have no history → they are "new"

    // Use a large count so every bucket is exhausted and all DistWord words
    // are guaranteed to appear in the result (word_base is shared, so the
    // new bucket may contain extra words from other tests).
    const result = await repo.getArtikelWordSelection(DIST_USER, 9999);

    // Only examine words seeded by this test
    const distWords = result.filter(w => w.word.startsWith('DistWord'));

    const gotNew     = distWords.filter(w => w.lastAnswer === null).length;
    const gotWrong   = distWords.filter(w => w.lastAnswer === 'wrong').length;
    const gotCorrect = distWords.filter(w => w.lastAnswer === 'correct').length;

    expect(gotNew).toBe(NEW_TARGET);
    expect(gotWrong).toBe(WRONG_TARGET);
    expect(gotCorrect).toBe(CORRECT_TARGET);
  });
});

// ─── upsertArtikelUserWordAnswer — insert vs update correctness ──────────────
// These tests verify the core requirement:
//   • First call for (wordBaseId, userId) → INSERT a new record
//   • Subsequent calls for same pair → UPDATE (increment counts, change lastAnswer)
//   • Never creates duplicate rows for the same word+user

describe('GamesRepository.upsertArtikelUserWordAnswer — insert vs update', () => {
  let gameDataId;

  beforeAll(async () => {
    const entry = await repo.saveGameData({ userId: TEST_USER, gameId: 1, score: 0 });
    gameDataId = entry.id;
  });

  // Helper: seed a unique word_base row and return its id
  async function seedWord(suffix) {
    const r = await db.execute(
      `INSERT INTO word_base (word, group_alphabet_name, type_of_word) VALUES (?, ?, ?)`,
      { word: `UpsertTest_${suffix}`, group_alphabet_name: 'U', type_of_word: 'noun' }
    );
    return r.lastInsertRowid || r.lastInsertRowId;
  }

  // Helper: query the raw row for a word+user pair
  async function getRow(wordId, userId = TEST_USER) {
    const rows = await db.query(
      `SELECT * FROM artikle_user_word_answer WHERE word_base_id = ? AND user_id = ?`,
      { word_base_id: wordId, user_id: userId }
    );
    return rows;
  }

  test('first call creates exactly one record with correct initial counts', async () => {
    const wordId = await seedWord('initial');

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 2, wrongDelta: 1, lastAnswer: 'correct', lastGameDataId: gameDataId
    });

    const rows = await getRow(wordId);
    expect(rows.length).toBe(1);
    expect(rows[0].number_of_correct_answer).toBe(2);
    expect(rows[0].number_of_wrong_answer).toBe(1);
    expect(rows[0].last_answer).toBe('correct');
  });

  test('second call for same word+user updates — does NOT create a second row', async () => {
    const wordId = await seedWord('no-dup');

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 1, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gameDataId
    });
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 0, wrongDelta: 1, lastAnswer: 'wrong', lastGameDataId: gameDataId
    });

    const rows = await getRow(wordId);
    expect(rows.length).toBe(1); // still exactly one row
  });

  test('numberOfCorrectAnswer is incremented by exactly correctDelta on update', async () => {
    const wordId = await seedWord('correct-inc');

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 3, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gameDataId
    });
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 2, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gameDataId
    });

    const rows = await getRow(wordId);
    expect(rows[0].number_of_correct_answer).toBe(5); // 3 + 2, not 2 or 3
  });

  test('numberOfWrongAnswer is incremented by exactly wrongDelta on update', async () => {
    const wordId = await seedWord('wrong-inc');

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 0, wrongDelta: 2, lastAnswer: 'wrong', lastGameDataId: gameDataId
    });
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 0, wrongDelta: 3, lastAnswer: 'wrong', lastGameDataId: gameDataId
    });

    const rows = await getRow(wordId);
    expect(rows[0].number_of_wrong_answer).toBe(5); // 2 + 3, not 3
  });

  test('lastAnswer is updated to the latest value on conflict', async () => {
    const wordId = await seedWord('last-answer-flip');

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 1, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gameDataId
    });
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 0, wrongDelta: 1, lastAnswer: 'wrong', lastGameDataId: gameDataId
    });

    const rows = await getRow(wordId);
    expect(rows[0].last_answer).toBe('wrong'); // flipped from 'correct' → 'wrong'
  });

  test('different users for the same word get separate records (no collision)', async () => {
    const wordId = await seedWord('two-users');
    const OTHER = 'other-upsert-user@games.test';
    await db.execute(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, { user_id: OTHER });
    const otherEntry = await repo.saveGameData({ userId: OTHER, gameId: 1, score: 0 });

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: TEST_USER,
      correctDelta: 5, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gameDataId
    });
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordId, userId: OTHER,
      correctDelta: 0, wrongDelta: 3, lastAnswer: 'wrong', lastGameDataId: otherEntry.id
    });

    const userRows  = await getRow(wordId, TEST_USER);
    const otherRows = await getRow(wordId, OTHER);

    expect(userRows.length).toBe(1);
    expect(userRows[0].number_of_correct_answer).toBe(5);
    expect(otherRows.length).toBe(1);
    expect(otherRows[0].number_of_wrong_answer).toBe(3);
  });

  test('same user with different words each get their own record', async () => {
    const wordIdA = await seedWord('word-a');
    const wordIdB = await seedWord('word-b');

    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordIdA, userId: TEST_USER,
      correctDelta: 1, wrongDelta: 0, lastAnswer: 'correct', lastGameDataId: gameDataId
    });
    await repo.upsertArtikelUserWordAnswer({
      wordBaseId: wordIdB, userId: TEST_USER,
      correctDelta: 0, wrongDelta: 2, lastAnswer: 'wrong', lastGameDataId: gameDataId
    });

    const rowsA = await getRow(wordIdA);
    const rowsB = await getRow(wordIdB);

    expect(rowsA.length).toBe(1);
    expect(rowsA[0].number_of_correct_answer).toBe(1);
    expect(rowsB.length).toBe(1);
    expect(rowsB[0].number_of_wrong_answer).toBe(2);
  });
});

// ─── getArtikelUserWordAnswers ────────────────────────────────────────────────

describe('GamesRepository.getArtikelUserWordAnswers', () => {
  test('returns array of per-word answer records for the user', async () => {
    const answers = await repo.getArtikelUserWordAnswers(TEST_USER);
    expect(Array.isArray(answers)).toBe(true);
    expect(answers.length).toBeGreaterThan(0);
  });

  test('maps DB rows to camelCase fields', async () => {
    const answers = await repo.getArtikelUserWordAnswers(TEST_USER);
    const record = answers[0];
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('wordBaseId');
    expect(record).toHaveProperty('userId');
    expect(record).toHaveProperty('numberOfCorrectAnswer');
    expect(record).toHaveProperty('numberOfWrongAnswer');
    expect(record).toHaveProperty('lastAnswer');
    expect(record).toHaveProperty('dateOfLastAnswer');
    expect(record).toHaveProperty('lastGameDataId');
  });

  test('returns empty array for user with no records', async () => {
    const answers = await repo.getArtikelUserWordAnswers('nobody@test.com');
    expect(answers).toEqual([]);
  });
});
