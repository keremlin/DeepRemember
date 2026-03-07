// Unit tests for UserConfigRepository using in-memory SQLite.

const SQLiteDatabase = require('../../../database/access/SQLiteDatabase');
const UserConfigRepository = require('../../../database/access/UserConfigRepository');

let db, repo;

const USER_A = 'user-a@unit.test';
const USER_B = 'user-b@unit.test';

beforeAll(async () => {
  db = new SQLiteDatabase(':memory:');
  await db.initialize();
  repo = new UserConfigRepository(db);
  // Pre-insert users so FK constraint on user_configs is satisfied
  await db.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', { user_id: USER_A });
  await db.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', { user_id: USER_B });
});

afterAll(async () => {
  await db.close();
});

// ─── createConfig ────────────────────────────────────────────────────────────

describe('UserConfigRepository.createConfig', () => {
  test('creates a config and returns it with an id', async () => {
    const cfg = await repo.createConfig(USER_A, {
      name: 'theme',
      label: 'UI Theme',
      value_type: 'string',
      value: 'dark'
    });
    expect(cfg.id).toBeDefined();
    expect(cfg.name).toBe('theme');
    expect(cfg.value).toBe('dark');
    expect(cfg.user_id).toBe(USER_A);
  });

  test('defaults value_type to string', async () => {
    const cfg = await repo.createConfig(USER_A, {
      name: 'lang',
      value: 'de'
    });
    expect(cfg.value_type).toBe('string');
  });
});

// ─── getUserConfigs ───────────────────────────────────────────────────────────

describe('UserConfigRepository.getUserConfigs', () => {
  test('returns configs for the user', async () => {
    const configs = await repo.getUserConfigs(USER_A);
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
    expect(configs.every(c => c.user_id === USER_A)).toBe(true);
  });

  test('returns empty array for unknown user', async () => {
    const configs = await repo.getUserConfigs('nobody@nowhere.test');
    expect(configs).toEqual([]);
  });

  test('does not return configs of other users', async () => {
    await repo.createConfig(USER_B, { name: 'font', value: 'sans' });
    const configs = await repo.getUserConfigs(USER_A);
    expect(configs.every(c => c.user_id === USER_A)).toBe(true);
  });
});

// ─── getConfigById ────────────────────────────────────────────────────────────

describe('UserConfigRepository.getConfigById', () => {
  let configId;

  beforeAll(async () => {
    const cfg = await repo.createConfig(USER_A, { name: 'speed', value: '1.5' });
    configId = cfg.id;
  });

  test('returns config for owner', async () => {
    const cfg = await repo.getConfigById(USER_A, configId);
    expect(cfg).not.toBeNull();
    expect(cfg.name).toBe('speed');
  });

  test('returns null for different user', async () => {
    const cfg = await repo.getConfigById(USER_B, configId);
    expect(cfg).toBeNull();
  });

  test('returns null for unknown id', async () => {
    const cfg = await repo.getConfigById(USER_A, 999999);
    expect(cfg).toBeNull();
  });
});

// ─── getConfigsByName ─────────────────────────────────────────────────────────

describe('UserConfigRepository.getConfigsByName', () => {
  test('returns all configs with the given name for user', async () => {
    await repo.createConfig(USER_A, { name: 'notif', value: 'on' });
    await repo.createConfig(USER_A, { name: 'notif', value: 'off' });
    const configs = await repo.getConfigsByName(USER_A, 'notif');
    expect(configs.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── updateConfig ─────────────────────────────────────────────────────────────

describe('UserConfigRepository.updateConfig', () => {
  let configId;

  beforeAll(async () => {
    const cfg = await repo.createConfig(USER_A, { name: 'volume', value: '50' });
    configId = cfg.id;
  });

  test('updates value and returns true', async () => {
    const ok = await repo.updateConfig(USER_A, configId, {
      name: 'volume',
      label: 'Volume',
      value_type: 'number',
      value: '80'
    });
    expect(ok).toBe(true);
    const cfg = await repo.getConfigById(USER_A, configId);
    expect(cfg.value).toBe('80');
  });

  test('returns false for unknown id', async () => {
    const ok = await repo.updateConfig(USER_A, 999999, {
      name: 'x', label: 'x', value_type: 'string', value: ''
    });
    expect(ok).toBe(false);
  });
});

// ─── deleteConfig ─────────────────────────────────────────────────────────────

describe('UserConfigRepository.deleteConfig', () => {
  test('deletes config and returns true', async () => {
    const cfg = await repo.createConfig(USER_A, { name: 'toDelete', value: 'x' });
    const ok = await repo.deleteConfig(USER_A, cfg.id);
    expect(ok).toBe(true);
    expect(await repo.getConfigById(USER_A, cfg.id)).toBeNull();
  });

  test('returns false for unknown id', async () => {
    const ok = await repo.deleteConfig(USER_A, 999999);
    expect(ok).toBe(false);
  });
});

// ─── deleteConfigsByName ──────────────────────────────────────────────────────

describe('UserConfigRepository.deleteConfigsByName', () => {
  test('deletes all configs with a name and returns count', async () => {
    await repo.createConfig(USER_A, { name: 'tempCfg', value: '1' });
    await repo.createConfig(USER_A, { name: 'tempCfg', value: '2' });
    const count = await repo.deleteConfigsByName(USER_A, 'tempCfg');
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('returns 0 when no matching configs exist', async () => {
    const count = await repo.deleteConfigsByName(USER_A, 'doesNotExist999');
    expect(count).toBe(0);
  });
});
