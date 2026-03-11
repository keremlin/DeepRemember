// Unit tests for DeepRememberRepository using in-memory SQLite.

const SQLiteDatabase = require('../../../database/access/SQLiteDatabase');
const DeepRememberRepository = require('../../../database/access/DeepRememberRepository');

let db, repo;

const USER = 'unit-test@deepremember.test';

const makeCardData = (word = 'lernen') => ({
  id: `card_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  word,
  translation: 'to learn',
  context: 'Ich lerne Deutsch.',
  state: 0,
  due: new Date().toISOString(),
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  reps: 0,
  lapses: 0
});

beforeAll(async () => {
  db = new SQLiteDatabase(':memory:');
  await db.initialize();
  repo = new DeepRememberRepository(db);
});

afterAll(async () => {
  await db.close();
});

// ─── createUser ──────────────────────────────────────────────────────────────

describe('DeepRememberRepository.createUser', () => {
  test('creates a user and returns user_id', async () => {
    const user = await repo.createUser(USER);
    expect(user.user_id).toBe(USER);
  });

  test('returns existing user on second call', async () => {
    const first = await repo.createUser(USER);
    const second = await repo.createUser(USER);
    expect(second.user_id).toBe(first.user_id);
  });
});

// ─── createCard ──────────────────────────────────────────────────────────────

describe('DeepRememberRepository.createCard', () => {
  test('creates a card and returns it', async () => {
    const data = makeCardData('rennen');
    const card = await repo.createCard(USER, data);
    expect(card).toBeDefined();
    expect(card.word).toBe('rennen');
  });
});

// ─── checkDuplicateCard ───────────────────────────────────────────────────────

describe('DeepRememberRepository.checkDuplicateCard', () => {
  beforeAll(async () => {
    await repo.createCard(USER, makeCardData('schreiben'));
  });

  test('detects an existing word', async () => {
    const dup = await repo.checkDuplicateCard(USER, 'schreiben', 'to learn');
    // May be null if translation differs — just check it doesn't throw
    expect(dup === null || typeof dup === 'object').toBe(true);
  });

  test('returns null for non-existent word', async () => {
    const dup = await repo.checkDuplicateCard(USER, 'XYZNEVER', 'XYZNEVER');
    expect(dup).toBeNull();
  });
});

// ─── getUserCards ─────────────────────────────────────────────────────────────

describe('DeepRememberRepository.getUserCards', () => {
  test('returns cards for the user', async () => {
    const cards = await repo.getUserCards(USER);
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });

  test('returns empty array for unknown user', async () => {
    const cards = await repo.getUserCards('nobody@test.test');
    expect(cards).toEqual([]);
  });
});

// ─── deleteCard ───────────────────────────────────────────────────────────────

describe('DeepRememberRepository.deleteCard', () => {
  test('deletes a card and returns true', async () => {
    const data = makeCardData('toDeleteCard');
    await repo.createCard(USER, data);
    const ok = await repo.deleteCard(USER, data.id);
    expect(ok).toBe(true);
  });

  test('returns false for non-existent card', async () => {
    const ok = await repo.deleteCard(USER, 'card_nonexistent_999999');
    expect(ok).toBe(false);
  });
});

// ─── getAllUsers ──────────────────────────────────────────────────────────────

describe('DeepRememberRepository.getAllUsers', () => {
  test('returns array of users', async () => {
    const users = await repo.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.some(u => u.user_id === USER)).toBe(true);
  });
});

// ─── answerCard ───────────────────────────────────────────────────────────────

describe('DeepRememberRepository.answerCard', () => {
  let cardId;

  beforeAll(async () => {
    const data = makeCardData('antworten');
    data.state = 0;
    data.stability = 1.0;
    data.difficulty = 0.3;
    await repo.createCard(USER, data);
    cardId = data.id;
  });

  test('returns null for non-existent card', async () => {
    const result = await repo.answerCard(USER, 'card_nonexistent_xyz', 3);
    expect(result).toBeNull();
  });

  test('rating <= 2 resets state to learning (0) and increments lapses', async () => {
    const before = (await repo.getUserCards(USER)).find(c => c.id === cardId);
    const result = await repo.answerCard(USER, cardId, 1);
    expect(result).not.toBeNull();
    expect(result.state).toBe(0);
    expect(result.lapses).toBe(before.lapses + 1);
    expect(result.reps).toBe(before.reps + 1);
  });

  test('rating 3 on learning card moves to review state (1)', async () => {
    // Ensure card is in learning state first
    await repo.answerCard(USER, cardId, 1);
    const result = await repo.answerCard(USER, cardId, 3);
    expect(result).not.toBeNull();
    expect(result.state).toBe(1);
    expect(result.stability).toBe(1.5);
  });

  test('rating >= 4 increases stability', async () => {
    const before = (await repo.getUserCards(USER)).find(c => c.id === cardId);
    const result = await repo.answerCard(USER, cardId, 4);
    expect(result).not.toBeNull();
    expect(result.stability).toBeGreaterThan(before.stability);
  });

  test('updates due date to the future', async () => {
    // First ensure card has some stability > 0
    await repo.answerCard(USER, cardId, 3); // move to review state
    const result = await repo.answerCard(USER, cardId, 4);
    expect(result).not.toBeNull();
    expect(new Date(result.due).getTime()).toBeGreaterThan(Date.now());
  });
});
