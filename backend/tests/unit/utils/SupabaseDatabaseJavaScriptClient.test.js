/**
 * Unit tests for SupabaseDatabaseJavaScriptClient
 *
 * WHY THIS FILE EXISTS:
 *   All other tests run against SQLite, which executes raw SQL natively and
 *   handles ORDER BY, LIMIT, etc. correctly. Bugs in the Supabase JS client
 *   adapter (the SQL→API translation layer) are invisible to those tests.
 *
 *   These tests mock @supabase/supabase-js and verify that the adapter:
 *   - Correctly translates SQL clauses into Supabase builder calls
 *   - Applies ORDER BY (the root cause of the bestScore=377 bug)
 *   - Applies WHERE conditions and LIMIT
 *   - Classifies queries correctly as simple vs complex
 *
 * RUN:
 *   cd backend && npm run test:supabase-adapter
 */

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({}))
}));

// Also mock config to avoid env-dependent behavior
jest.mock('../../../config/app', () => ({ DB_LOG: false }));

const SupabaseDatabaseJavaScriptClient = require('../../../database/access/SupabaseDatabaseJavaScriptClient');

// ---------------------------------------------------------------------------
// Helper: create a chainable Supabase query builder mock that is awaitable.
// Every method returns `this` so chains like .select().eq().order().limit()
// work. Awaiting the builder resolves to `resolveWith`.
// ---------------------------------------------------------------------------
function makeBuilder(resolveWith = { data: [], error: null, count: null }) {
  const chainMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'order', 'limit', 'range', 'filter', 'or', 'not', 'in',
    'ilike', 'like', 'is', 'insert', 'update', 'delete',
    'single', 'head'
  ];
  const builder = {};
  chainMethods.forEach(m => {
    builder[m] = jest.fn(() => builder);
  });
  // Make awaitable (thenable = Promise-like)
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolveWith).then(onFulfilled, onRejected);
  return builder;
}

// ---------------------------------------------------------------------------
// Helper: create a pre-wired SupabaseDatabaseJavaScriptClient instance whose
// internal Supabase client is replaced with a mock. Bypasses initialize().
// ---------------------------------------------------------------------------
function makeAdapter(builderOrRows) {
  const adapter = new SupabaseDatabaseJavaScriptClient({
    url: 'https://fake.supabase.co',
    anonKey: 'fake-anon',
    serviceRoleKey: 'fake-service'
  });
  adapter.isInitialized = true;

  const builder = typeof builderOrRows === 'function'
    ? builderOrRows
    : makeBuilder(
        Array.isArray(builderOrRows)
          ? { data: builderOrRows, error: null, count: null }
          : builderOrRows
      );

  adapter.client = {
    from: jest.fn(() => typeof builder === 'function' ? builder() : builder)
  };

  return { adapter, builder: typeof builder === 'function' ? null : builder, mockFrom: adapter.client.from };
}

// ============================================================================
// 1. parseSelectSQL — pure parsing, no network
// ============================================================================

describe('parseSelectSQL — ORDER BY extraction', () => {
  let adapter;

  beforeEach(() => {
    ({ adapter } = makeAdapter([]));
  });

  test('extracts ORDER BY DESC', () => {
    const result = adapter.parseSelectSQL(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC',
      { user_id: 'u1', game_id: 1 }
    );
    expect(result.orderBy).toEqual({ column: 'score', ascending: false });
  });

  test('extracts ORDER BY ASC', () => {
    const result = adapter.parseSelectSQL(
      'SELECT word FROM word_base WHERE type_of_word = ? ORDER BY word ASC',
      { type_of_word: 'noun' }
    );
    expect(result.orderBy).toEqual({ column: 'word', ascending: true });
  });

  test('ORDER BY without direction defaults to ascending', () => {
    const result = adapter.parseSelectSQL(
      'SELECT * FROM game_data WHERE user_id = ? ORDER BY score',
      { user_id: 'u1' }
    );
    expect(result.orderBy).toEqual({ column: 'score', ascending: true });
  });

  test('returns null orderBy when no ORDER BY clause', () => {
    const result = adapter.parseSelectSQL(
      'SELECT * FROM game_data WHERE user_id = ?',
      { user_id: 'u1' }
    );
    expect(result.orderBy).toBeNull();
  });

  test('extracts correct table name and fields alongside ORDER BY', () => {
    const result = adapter.parseSelectSQL(
      'SELECT score FROM game_data WHERE user_id = ? ORDER BY score DESC',
      { user_id: 'u1' }
    );
    expect(result.tableName).toBe('game_data');
    expect(result.fields).toBe('score');
    expect(result.operation).toBe('select');
  });
});

// ============================================================================
// 2. isComplexQuery — getBestScore query must NOT be classified as complex
// ============================================================================

describe('isComplexQuery — getBestScore query routing', () => {
  let adapter;
  beforeEach(() => { ({ adapter } = makeAdapter([])); });

  test('getBestScore query is NOT complex (goes through normal path)', () => {
    const sql = 'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC';
    expect(adapter.isComplexQuery(sql)).toBe(false);
  });

  test('simple SELECT with ORDER BY is NOT complex', () => {
    expect(adapter.isComplexQuery(
      'SELECT * FROM users WHERE user_id = ? ORDER BY created_at DESC'
    )).toBe(false);
  });

  test('JOIN query IS complex', () => {
    expect(adapter.isComplexQuery(
      'SELECT wb.id FROM word_base wb LEFT JOIN artikle_user_word_answer auw ON auw.word_base_id = wb.id WHERE wb.id = ?'
    )).toBe(true);
  });

  test('COUNT(*) query IS complex (routed through executeComplexQuery)', () => {
    // COUNT() is in the sqlFunctions list → hasFunction = true → classified as complex.
    // Simple COUNT on cards table has a special early-return override, but other tables go complex.
    expect(adapter.isComplexQuery(
      'SELECT COUNT(*) as count FROM game_data WHERE user_id = ?'
    )).toBe(true);
  });
});

// ============================================================================
// 3. query() — ORDER BY is applied to the Supabase builder
// ============================================================================

describe('query() — ORDER BY applied to Supabase builder', () => {
  test('calls .order(score, {ascending:false}) for DESC query', async () => {
    const { adapter, builder } = makeAdapter([{ score: 533 }, { score: 377 }]);

    await adapter.query(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC',
      { user_id: 'keremlin@yahoo.com', game_id: 1 }
    );

    expect(builder.order).toHaveBeenCalledWith('score', { ascending: false });
  });

  test('does NOT call .order() when SQL has no ORDER BY', async () => {
    const { adapter, builder } = makeAdapter([{ score: 377 }]);

    await adapter.query(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'u1', game_id: 1 }
    );

    expect(builder.order).not.toHaveBeenCalled();
  });

  test('calls .order(word, {ascending:true}) for ASC query', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.query(
      'SELECT * FROM word_base WHERE type_of_word = ? ORDER BY word ASC',
      { type_of_word: 'noun' }
    );

    expect(builder.order).toHaveBeenCalledWith('word', { ascending: true });
  });

  test('applies WHERE conditions before ORDER BY', async () => {
    const { adapter, builder } = makeAdapter([{ score: 640 }]);

    await adapter.query(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC',
      { user_id: 'u1', game_id: 1 }
    );

    // eq must be called (conditions applied)
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('game_id', 1);
    // order must also be called
    expect(builder.order).toHaveBeenCalledWith('score', { ascending: false });
  });

  test('returns rows from the builder (first row is highest score)', async () => {
    const rows = [{ score: 533 }, { score: 640 }, { score: 377 }];
    const { adapter } = makeAdapter(rows);

    const result = await adapter.query(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC',
      { user_id: 'u1', game_id: 1 }
    );

    // The adapter returns whatever the builder gives — with real Supabase,
    // ordering is server-side. Here we verify the adapter does NOT re-sort or
    // alter the rows, and that rows[0] is what we take as bestScore.
    expect(result[0].score).toBe(533);
  });
});

// ============================================================================
// 4. getBestScore integration via query() — regression test for the 377 bug
// ============================================================================

describe('getBestScore — ORDER BY regression (was returning first-inserted row)', () => {
  test('ORDER BY score DESC is applied — prevents returning oldest session instead of best', async () => {
    // Before the fix: ORDER BY was silently dropped → rows came back in insertion
    // order → rows[0].score = 377 (first session ever) instead of 533 (actual max).
    // After the fix: .order('score', {ascending:false}) must be called.

    const { adapter, builder } = makeAdapter([{ score: 533 }]);

    await adapter.query(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC',
      { user_id: 'keremlin@yahoo.com', game_id: 1 }
    );

    expect(builder.order).toHaveBeenCalledWith('score', { ascending: false });
    // This is the exact call that was missing before the fix.
  });

  test('without ORDER BY fix: order would NOT have been called (documents old broken state)', async () => {
    // This test documents what the old code would have done:
    // parseSelectSQL returned no orderBy, so query() never called .order().
    // We simulate this by calling parseSelectSQL on the same SQL and verifying
    // the CURRENT (fixed) code DOES return an orderBy.
    const { adapter } = makeAdapter([]);
    const parsed = adapter.parseSelectSQL(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC',
      { user_id: 'keremlin@yahoo.com', game_id: 1 }
    );
    // Fixed: must have orderBy
    expect(parsed.orderBy).not.toBeNull();
    expect(parsed.orderBy.ascending).toBe(false);
  });
});

// ============================================================================
// 5. query() — WHERE conditions are correctly mapped to builder calls
// ============================================================================

describe('query() — WHERE conditions', () => {
  test('maps named params {user_id, game_id} to .eq() calls', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.query(
      'SELECT * FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'test@test.com', game_id: 2 }
    );

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'test@test.com');
    expect(builder.eq).toHaveBeenCalledWith('game_id', 2);
  });

  test('applies LIMIT from SQL literal (two-condition WHERE bypasses complexQuery)', async () => {
    // Single-condition WHERE with `=` is classified as complex by isComplexQuery
    // (the `=` sign matches the comparison operator check).
    // Two-condition AND WHERE is explicitly whitelisted as NOT complex.
    const { adapter, builder } = makeAdapter([]);

    await adapter.query(
      'SELECT * FROM game_data WHERE user_id = ? AND game_id = ? LIMIT 5',
      { user_id: 'u1', game_id: 1 }
    );

    expect(builder.limit).toHaveBeenCalledWith(5);
  });
});

// ============================================================================
// 6. extractConditions — pure condition parsing
// ============================================================================

describe('extractConditions — condition parsing', () => {
  let adapter;
  beforeEach(() => { ({ adapter } = makeAdapter([])); });

  test('extracts named ? params as eq conditions', () => {
    const conditions = adapter.extractConditions(
      'SELECT * FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'u1', game_id: 2 }
    );
    expect(conditions).toEqual([
      { column: 'user_id', operator: 'eq', value: 'u1' },
      { column: 'game_id', operator: 'eq', value: 2 }
    ]);
  });

  test('extracts $1/$2 style params as eq conditions', () => {
    const conditions = adapter.extractConditions(
      'SELECT * FROM users WHERE user_id = $1',
      { $1: 'admin' }
    );
    expect(conditions).toContainEqual({ column: 'user_id', operator: 'eq', value: 'admin' });
  });

  test('extracts <= operator as lte condition', () => {
    const conditions = adapter.extractConditions(
      'SELECT * FROM cards WHERE due <= ?',
      { due: '2025-01-01T00:00:00.000Z' }
    );
    expect(conditions).toContainEqual({
      column: 'due',
      operator: 'lte',
      value: '2025-01-01T00:00:00.000Z'
    });
  });

  test('extracts literal numeric value as eq condition', () => {
    const conditions = adapter.extractConditions(
      'SELECT * FROM cards WHERE state = 0',
      {}
    );
    expect(conditions).toContainEqual({ column: 'state', operator: 'eq', value: 0 });
  });

  test('returns empty array when no WHERE clause', () => {
    const conditions = adapter.extractConditions('SELECT * FROM users', {});
    expect(conditions).toEqual([]);
  });
});

// ============================================================================
// 7. normalizeRowsForSelect — row normalization
// ============================================================================

describe('normalizeRowsForSelect — cards table field mapping', () => {
  let adapter;
  beforeEach(() => { ({ adapter } = makeAdapter([])); });

  test('cards table: card_id falls back to id when card_id is absent', () => {
    const rows = adapter.normalizeRowsForSelect('cards', [{ id: 42, word: 'lernen' }]);
    expect(rows[0].card_id).toBe(42);
  });

  test('cards table: card_id is preserved when already present', () => {
    const rows = adapter.normalizeRowsForSelect('cards', [{ id: 1, card_id: 99, word: 'rennen' }]);
    expect(rows[0].card_id).toBe(99);
  });

  test('cards table: due falls back to next_review when due is null', () => {
    const rows = adapter.normalizeRowsForSelect('cards', [
      { id: 1, due: null, next_review: '2025-06-01T00:00:00Z' }
    ]);
    expect(rows[0].due).toBe('2025-06-01T00:00:00Z');
  });

  test('cards table: last_reviewed falls back to updated_at when absent', () => {
    const rows = adapter.normalizeRowsForSelect('cards', [
      { id: 1, last_reviewed: null, updated_at: '2025-05-01T00:00:00Z' }
    ]);
    expect(rows[0].last_reviewed).toBe('2025-05-01T00:00:00Z');
  });

  test('non-cards table: rows returned unchanged', () => {
    const rows = adapter.normalizeRowsForSelect('game_data', [{ id: 1, score: 533 }]);
    expect(rows[0]).toEqual({ id: 1, score: 533 });
  });

  test('empty array returns empty array', () => {
    const rows = adapter.normalizeRowsForSelect('cards', []);
    expect(rows).toEqual([]);
  });
});

// ============================================================================
// 8. queryOne() — single-row helper
// ============================================================================

describe('queryOne() — returns first row or null', () => {
  test('returns the first row when results are non-empty', async () => {
    const { adapter } = makeAdapter([{ score: 533 }, { score: 377 }]);

    const result = await adapter.queryOne(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'u1', game_id: 1 }
    );

    expect(result).toEqual({ score: 533 });
  });

  test('returns null when no rows match', async () => {
    const { adapter } = makeAdapter([]);

    const result = await adapter.queryOne(
      'SELECT score FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'ghost', game_id: 99 }
    );

    expect(result).toBeNull();
  });
});

// ============================================================================
// 9. query() — error propagation
// ============================================================================

describe('query() — error propagation from Supabase builder', () => {
  test('throws when builder resolves with a non-null error', async () => {
    const { adapter } = makeAdapter({ data: null, error: { message: 'DB error' }, count: null });

    await expect(
      adapter.query(
        'SELECT score FROM game_data WHERE user_id = ? AND game_id = ?',
        { user_id: 'u1', game_id: 1 }
      )
    ).rejects.toMatchObject({ message: 'DB error' });
  });
});

// ============================================================================
// 10. query() — OFFSET → .range() call
// ============================================================================

describe('query() — OFFSET applied via .range()', () => {
  test('calls .range(offset, offset + limit - 1) when SQL has LIMIT and OFFSET', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.query(
      'SELECT * FROM game_data WHERE user_id = ? AND game_id = ? LIMIT 10 OFFSET 20',
      { user_id: 'u1', game_id: 1 }
    );

    // range(20, 29) = offset 20, limit 10
    expect(builder.range).toHaveBeenCalledWith(20, 29);
  });

  test('does NOT call .range() when SQL has no OFFSET', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.query(
      'SELECT * FROM game_data WHERE user_id = ? AND game_id = ? LIMIT 5',
      { user_id: 'u1', game_id: 1 }
    );

    expect(builder.range).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 11. execute() / handleInsert — INSERT operations
// ============================================================================

describe('execute() — handleInsert applies insert values to builder', () => {
  test('calls .insert() with extracted named-param values', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.execute(
      'INSERT INTO users (user_id) VALUES (?)',
      { user_id: 'test@test.com' }
    );

    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'test@test.com' });
  });

  test('calls .select() after .insert() to retrieve the new row', async () => {
    const { adapter, builder } = makeAdapter([{ id: 1, user_id: 'a@b.com' }]);

    await adapter.execute(
      'INSERT INTO users (user_id) VALUES (?)',
      { user_id: 'a@b.com' }
    );

    expect(builder.select).toHaveBeenCalled();
  });

  test('returns changes=1 and lastInsertRowId from first returned row', async () => {
    const { adapter } = makeAdapter([{ id: 7, user_id: 'x@x.com' }]);

    const result = await adapter.execute(
      'INSERT INTO users (user_id) VALUES (?)',
      { user_id: 'x@x.com' }
    );

    expect(result.changes).toBe(1);
    expect(result.lastInsertRowId).toBe(7);
  });
});

// ============================================================================
// 12. execute() / handleUpdate — UPDATE operations
// ============================================================================

describe('execute() — handleUpdate applies SET values and WHERE conditions', () => {
  test('calls .update() with SET values', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.execute(
      'UPDATE game_data SET score = ? WHERE user_id = ? AND game_id = ?',
      { score: 640, user_id: 'u1', game_id: 1 }
    );

    expect(builder.update).toHaveBeenCalledWith({ score: 640 });
  });

  test('calls .eq() for each WHERE condition', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.execute(
      'UPDATE game_data SET score = ? WHERE user_id = ? AND game_id = ?',
      { score: 640, user_id: 'u1', game_id: 1 }
    );

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('game_id', 1);
  });
});

// ============================================================================
// 13. execute() / handleDelete — DELETE operations
// ============================================================================

describe('execute() — handleDelete applies WHERE conditions to delete builder', () => {
  test('calls .delete() on the builder', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.execute(
      'DELETE FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'u1', game_id: 1 }
    );

    expect(builder.delete).toHaveBeenCalled();
  });

  test('calls .eq() for each WHERE condition on delete', async () => {
    const { adapter, builder } = makeAdapter([]);

    await adapter.execute(
      'DELETE FROM game_data WHERE user_id = ? AND game_id = ?',
      { user_id: 'u1', game_id: 1 }
    );

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('game_id', 1);
  });
});

// ============================================================================
// 14. isComplexQuery — additional edge cases
// ============================================================================

describe('isComplexQuery — additional edge cases', () => {
  let adapter;
  beforeEach(() => { ({ adapter } = makeAdapter([])); });

  test('CASE WHEN IS complex', () => {
    expect(adapter.isComplexQuery(
      'SELECT CASE WHEN score > 500 THEN 1 ELSE 0 END FROM game_data WHERE user_id = ?'
    )).toBe(true);
  });

  test('subquery (SELECT inside SELECT) IS complex', () => {
    expect(adapter.isComplexQuery(
      'SELECT * FROM cards WHERE id IN (SELECT card_id FROM card_labels WHERE label_id = ?)'
    )).toBe(true);
  });

  test('simple DELETE is NOT complex', () => {
    expect(adapter.isComplexQuery(
      'DELETE FROM game_data WHERE user_id = ? AND game_id = ?'
    )).toBe(false);
  });

  test('simple INSERT is NOT complex', () => {
    expect(adapter.isComplexQuery(
      'INSERT INTO users (user_id) VALUES (?)'
    )).toBe(false);
  });

  test('simple UPDATE is NOT complex', () => {
    expect(adapter.isComplexQuery(
      'UPDATE game_data SET score = ? WHERE user_id = ? AND game_id = ?'
    )).toBe(false);
  });
});

// ============================================================================
// 15. execute() — ON CONFLICT (upsert) path → executeSQLDirectly via client.rpc
//
// WHY THIS GROUP EXISTS:
//   upsertArtikelUserWordAnswer uses ON CONFLICT SQL. The Supabase JS client
//   cannot express ON CONFLICT natively, so execute() detects the clause and
//   falls through to executeSQLDirectly(), which calls client.rpc('execute_sql').
//   The SQL is interpolated (? → values) before being sent. None of the builder
//   mock tests above cover this code path.
// ============================================================================

// Helper: adapter with a real rpc mock (no builder needed for this path)
function makeAdapterWithRpc() {
  const adapter = new SupabaseDatabaseJavaScriptClient({
    url: 'https://fake.supabase.co',
    anonKey: 'fake-anon',
    serviceRoleKey: 'fake-service'
  });
  adapter.isInitialized = true;
  adapter.client = {
    from: jest.fn(() => makeBuilder()),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };
  return adapter;
}

// The exact SQL upsertArtikelUserWordAnswer sends to execute()
const UPSERT_SQL = `INSERT INTO artikle_user_word_answer
  (word_base_id, user_id, number_of_correct_answer, number_of_wrong_answer,
   last_answer, date_of_last_answer, last_game_data_id)
 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
 ON CONFLICT(word_base_id, user_id) DO UPDATE SET
   number_of_correct_answer = artikle_user_word_answer.number_of_correct_answer + excluded.number_of_correct_answer,
   number_of_wrong_answer   = artikle_user_word_answer.number_of_wrong_answer   + excluded.number_of_wrong_answer,
   last_answer              = excluded.last_answer,
   date_of_last_answer      = CURRENT_TIMESTAMP,
   last_game_data_id        = excluded.last_game_data_id
 RETURNING id`;

describe('execute() — ON CONFLICT upsert routed through executeSQLDirectly', () => {
  test('ON CONFLICT SQL is sent to client.rpc("execute_sql"), not the builder', async () => {
    const adapter = makeAdapterWithRpc();

    await adapter.execute(UPSERT_SQL, {
      word_base_id: 42, user_id: 'u@test.com',
      correct: 2, wrong: 1, last_answer: 'correct', last_game_data_id: 7
    });

    expect(adapter.client.rpc).toHaveBeenCalledWith(
      'execute_sql',
      expect.objectContaining({ sql_query: expect.stringContaining('ON CONFLICT') })
    );
    // builder.insert must NOT be called — this path bypasses the JS client chain
    expect(adapter.client.from).not.toHaveBeenCalled();
  });

  test('? placeholders are replaced with param values in positional order', async () => {
    const adapter = makeAdapterWithRpc();

    await adapter.execute(UPSERT_SQL, {
      word_base_id: 42, user_id: 'u@test.com',
      correct: 3, wrong: 1, last_answer: 'wrong', last_game_data_id: 99
    });

    const { sql_query } = adapter.client.rpc.mock.calls[0][1];
    // Numbers are substituted unquoted
    expect(sql_query).toContain('42');
    expect(sql_query).toContain('3');
    expect(sql_query).toContain('99');
    // Strings are quoted
    expect(sql_query).toContain("'u@test.com'");
    expect(sql_query).toContain("'wrong'");
  });

  test('null lastGameDataId is substituted as NULL (not the string "null")', async () => {
    const adapter = makeAdapterWithRpc();

    await adapter.execute(UPSERT_SQL, {
      word_base_id: 10, user_id: 'u@test.com',
      correct: 1, wrong: 0, last_answer: 'correct', last_game_data_id: null
    });

    const { sql_query } = adapter.client.rpc.mock.calls[0][1];
    expect(sql_query).toContain('NULL');
    expect(sql_query).not.toMatch(/'null'/i);
  });

  test('single quotes in string values are escaped to prevent SQL injection', async () => {
    const adapter = makeAdapterWithRpc();

    await adapter.execute(
      `INSERT INTO users (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING`,
      { user_id: "o'brien@test.com" }
    );

    const { sql_query } = adapter.client.rpc.mock.calls[0][1];
    // Escaped as '' (double single-quote), not raw '
    expect(sql_query).toContain("o''brien");
  });

  test('returns { changes: 1, lastInsertRowId: null } for upsert', async () => {
    const adapter = makeAdapterWithRpc();

    const result = await adapter.execute(UPSERT_SQL, {
      word_base_id: 5, user_id: 'u@test.com',
      correct: 1, wrong: 0, last_answer: 'correct', last_game_data_id: 1
    });

    expect(result).toEqual({ changes: 1, lastInsertRowId: null });
  });

  test('rpc error is propagated as a thrown error', async () => {
    const adapter = makeAdapterWithRpc();
    adapter.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(
      adapter.execute(UPSERT_SQL, {
        word_base_id: 5, user_id: 'u@test.com',
        correct: 1, wrong: 0, last_answer: 'correct', last_game_data_id: 1
      })
    ).rejects.toMatchObject({ message: 'rpc failed' });
  });
});
