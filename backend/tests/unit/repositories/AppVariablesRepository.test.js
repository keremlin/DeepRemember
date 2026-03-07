// Unit tests for AppVariablesRepository using in-memory SQLite.

const SQLiteDatabase = require('../../../database/access/SQLiteDatabase');
const AppVariablesRepository = require('../../../database/access/AppVariablesRepository');

let db, repo;

beforeAll(async () => {
  db = new SQLiteDatabase(':memory:');
  await db.initialize();
  repo = new AppVariablesRepository(db);
});

afterAll(async () => {
  await db.close();
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('AppVariablesRepository.create', () => {
  test('creates a text variable and returns it', async () => {
    const v = await repo.create({ keyname: 'site_name', value: 'DeepRemember', type: 'text' });
    expect(v.keyname).toBe('site_name');
    expect(v.value).toBe('DeepRemember');
    expect(v.type).toBe('text');
  });

  test('creates a number variable', async () => {
    const v = await repo.create({ keyname: 'max_cards', value: '100', type: 'number' });
    expect(v.keyname).toBe('max_cards');
    expect(v.type).toBe('number');
  });

  test('creates a json variable with valid JSON', async () => {
    const v = await repo.create({
      keyname: 'settings',
      value: JSON.stringify({ dark: true }),
      type: 'json'
    });
    expect(v.keyname).toBe('settings');
  });

  test('throws for invalid type', async () => {
    await expect(
      repo.create({ keyname: 'bad_type', value: 'x', type: 'invalid' })
    ).rejects.toThrow(/invalid type/i);
  });

  test('throws for non-numeric value when type is number', async () => {
    await expect(
      repo.create({ keyname: 'bad_number', value: 'not_a_number', type: 'number' })
    ).rejects.toThrow(/number/i);
  });

  test('throws for invalid JSON when type is json', async () => {
    await expect(
      repo.create({ keyname: 'bad_json', value: '{invalid}', type: 'json' })
    ).rejects.toThrow(/json/i);
  });
});

// ─── getAll ──────────────────────────────────────────────────────────────────

describe('AppVariablesRepository.getAll', () => {
  test('returns an array with created variables', async () => {
    const vars = await repo.getAll();
    expect(Array.isArray(vars)).toBe(true);
    expect(vars.length).toBeGreaterThan(0);
  });
});

// ─── getByKeyname ─────────────────────────────────────────────────────────────

describe('AppVariablesRepository.getByKeyname', () => {
  test('returns variable for existing keyname', async () => {
    const v = await repo.getByKeyname('site_name');
    expect(v).not.toBeNull();
    expect(v.keyname).toBe('site_name');
  });

  test('returns null for unknown keyname', async () => {
    const v = await repo.getByKeyname('DOES_NOT_EXIST_XYZ');
    expect(v).toBeNull();
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('AppVariablesRepository.getById', () => {
  test('returns variable for existing id', async () => {
    const created = await repo.getByKeyname('site_name');
    const v = await repo.getById(created.id);
    expect(v).not.toBeNull();
    expect(v.keyname).toBe('site_name');
  });

  test('returns null for unknown id', async () => {
    const v = await repo.getById(999999);
    expect(v).toBeNull();
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('AppVariablesRepository.update', () => {
  test('updates value and returns true', async () => {
    const ok = await repo.update('site_name', { value: 'NewName' });
    expect(ok).toBe(true);
    const v = await repo.getByKeyname('site_name');
    expect(v.value).toBe('NewName');
  });

  test('throws for unknown keyname', async () => {
    await expect(
      repo.update('NONEXISTENT_KEY', { value: 'x' })
    ).rejects.toThrow();
  });

  test('throws when updating to invalid type', async () => {
    await expect(
      repo.update('site_name', { type: 'bad_type' })
    ).rejects.toThrow(/invalid type/i);
  });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('AppVariablesRepository.delete', () => {
  test('deletes and returns true', async () => {
    await repo.create({ keyname: 'to_delete_var', value: 'x', type: 'text' });
    const ok = await repo.delete('to_delete_var');
    expect(ok).toBe(true);
    expect(await repo.getByKeyname('to_delete_var')).toBeNull();
  });

  test('returns false for unknown keyname', async () => {
    const ok = await repo.delete('NO_SUCH_KEY_999');
    expect(ok).toBe(false);
  });
});
