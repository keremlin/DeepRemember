// Unit tests for WordBaseRepository using in-memory SQLite.
// Does NOT use DatabaseFactory (singleton) — instantiates SQLiteDatabase directly.

const SQLiteDatabase = require('../../../database/access/SQLiteDatabase');
const WordBaseRepository = require('../../../database/access/WordBaseRepository');

let db, repo;

beforeAll(async () => {
  db = new SQLiteDatabase(':memory:');
  await db.initialize();
  repo = new WordBaseRepository(db);
});

afterAll(async () => {
  await db.close();
});

// ─── createWord ─────────────────────────────────────────────────────────────

describe('WordBaseRepository.createWord', () => {
  test('creates a word and returns it with an id', async () => {
    const word = await repo.createWord({
      word: 'laufen',
      groupAlphabetName: 'L',
      type_of_word: 'verb'
    });
    expect(word).toBeDefined();
    expect(word.id).toBeDefined();
    expect(word.word).toBe('laufen');
  });

  test('stores optional fields', async () => {
    const word = await repo.createWord({
      word: 'Haus',
      groupAlphabetName: 'H',
      type_of_word: 'noun',
      article: 'das',
      translate: 'house',
      plural_sign: 'Häuser'
    });
    expect(word.article).toBe('das');
    expect(word.translate).toBe('house');
  });
});

// ─── getAllWords ─────────────────────────────────────────────────────────────

describe('WordBaseRepository.getAllWords', () => {
  test('returns an array', async () => {
    const words = await repo.getAllWords();
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThan(0);
  });

  test('filters by group_alphabet_name', async () => {
    // Repository maps DB column `group_alphabet_name` -> `groupAlphabetName` in the returned object
    const words = await repo.getAllWords({ group_alphabet_name: 'L' });
    expect(words.every(w => w.groupAlphabetName === 'L')).toBe(true);
  });

  test('filters by type_of_word', async () => {
    const words = await repo.getAllWords({ type_of_word: 'verb' });
    expect(words.every(w => w.type_of_word === 'verb')).toBe(true);
  });

  test('returns empty array for non-existent group', async () => {
    const words = await repo.getAllWords({ group_alphabet_name: 'ZZZ_NONEXISTENT' });
    expect(words).toEqual([]);
  });

  test('respects limit and offset', async () => {
    const all = await repo.getAllWords();
    const paged = await repo.getAllWords({ limit: 1, offset: 0 });
    expect(paged.length).toBe(1);
  });
});

// ─── getWordById ─────────────────────────────────────────────────────────────

describe('WordBaseRepository.getWordById', () => {
  let wordId;

  beforeAll(async () => {
    const w = await repo.createWord({
      word: 'rennen',
      groupAlphabetName: 'R',
      type_of_word: 'verb'
    });
    wordId = w.id;
  });

  test('returns the word for a valid id', async () => {
    const word = await repo.getWordById(wordId);
    expect(word).not.toBeNull();
    expect(word.word).toBe('rennen');
  });

  test('returns null for unknown id', async () => {
    const word = await repo.getWordById(999999);
    expect(word).toBeNull();
  });
});

// ─── updateWord ──────────────────────────────────────────────────────────────

describe('WordBaseRepository.updateWord', () => {
  let wordId;

  beforeAll(async () => {
    const w = await repo.createWord({
      word: 'schreiben',
      groupAlphabetName: 'S',
      type_of_word: 'verb'
    });
    wordId = w.id;
  });

  test('updates and returns true', async () => {
    // updateWord returns boolean (result.changes > 0), not the updated object
    const ok = await repo.updateWord(wordId, {
      word: 'schreiben',
      groupAlphabetName: 'S',
      type_of_word: 'verb',
      translate: 'to write'
    });
    expect(ok).toBe(true);
    // Verify via getWordById
    const updated = await repo.getWordById(wordId);
    expect(updated.translate).toBe('to write');
  });

  test('returns false for unknown id', async () => {
    const result = await repo.updateWord(999999, {
      word: 'x',
      groupAlphabetName: 'X',
      type_of_word: 'verb'
    });
    expect(result).toBe(false);
  });
});

// ─── searchWords ─────────────────────────────────────────────────────────────

describe('WordBaseRepository.searchWords', () => {
  test('finds words matching the search term', async () => {
    const results = await repo.searchWords('lauf');
    expect(Array.isArray(results)).toBe(true);
    expect(results.some(w => w.word.toLowerCase().includes('lauf'))).toBe(true);
  });

  test('returns empty array for no matches', async () => {
    const results = await repo.searchWords('XYZNOEXIST999');
    expect(results).toEqual([]);
  });
});

// ─── getWordCount ────────────────────────────────────────────────────────────

describe('WordBaseRepository.getWordCount', () => {
  test('returns a positive number', async () => {
    const count = await repo.getWordCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });
});

// ─── deleteWord ──────────────────────────────────────────────────────────────

describe('WordBaseRepository.deleteWord', () => {
  test('deletes the word and returns true', async () => {
    const w = await repo.createWord({
      word: 'toDelete',
      groupAlphabetName: 'T',
      type_of_word: 'verb'
    });
    const ok = await repo.deleteWord(w.id);
    expect(ok).toBe(true);
    expect(await repo.getWordById(w.id)).toBeNull();
  });

  test('returns false for unknown id', async () => {
    const ok = await repo.deleteWord(999999);
    expect(ok).toBe(false);
  });
});

// ─── bulkInsertWords ─────────────────────────────────────────────────────────

describe('WordBaseRepository.bulkInsertWords', () => {
  test('inserts multiple words and returns count', async () => {
    // bulkInsertWords returns a plain number (insertedCount), not an object
    const words = [
      { word: 'bulk1', groupAlphabetName: 'B', type_of_word: 'noun' },
      { word: 'bulk2', groupAlphabetName: 'B', type_of_word: 'noun' }
    ];
    const result = await repo.bulkInsertWords(words);
    expect(result).toBe(2);
  });

  test('returns 0 for empty array', async () => {
    const result = await repo.bulkInsertWords([]);
    expect(result).toBe(0);
  });
});
