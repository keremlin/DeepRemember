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
