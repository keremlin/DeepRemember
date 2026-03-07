// Unit tests for ChatTemplateRepository using in-memory SQLite.

const SQLiteDatabase = require('../../../database/access/SQLiteDatabase');
const ChatTemplateRepository = require('../../../database/access/ChatTemplateRepository');

let db, repo;

const TEST_USER = 'test@unit.test';

beforeAll(async () => {
  db = new SQLiteDatabase(':memory:');
  await db.initialize();
  repo = new ChatTemplateRepository(db);
  // Pre-insert user so FK on user_chattemplates is satisfied
  await db.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', { user_id: TEST_USER });
});

afterAll(async () => {
  await db.close();
});

// ─── createTemplate ──────────────────────────────────────────────────────────

describe('ChatTemplateRepository.createTemplate', () => {
  test('creates a template and returns it with an id', async () => {
    const tpl = await repo.createTemplate({
      thema: 'Greetings',
      level: 'A1'
    });
    expect(tpl.id).toBeDefined();
    expect(tpl.thema).toBe('Greetings');
    expect(tpl.level).toBe('A1');
  });

  test('stores null for missing optional fields', async () => {
    const tpl = await repo.createTemplate({ thema: 'MinimalTest' });
    expect(tpl.id).toBeDefined();
    expect(tpl.level).toBeUndefined();  // Not set, repo returns templateData spread
  });
});

// ─── getTemplateById ─────────────────────────────────────────────────────────

describe('ChatTemplateRepository.getTemplateById', () => {
  let templateId;

  beforeAll(async () => {
    const tpl = await repo.createTemplate({ thema: 'Shopping', level: 'B1' });
    templateId = tpl.id;
  });

  test('returns the template for a valid id', async () => {
    const tpl = await repo.getTemplateById(templateId);
    expect(tpl).not.toBeNull();
    expect(tpl.thema).toBe('Shopping');
  });

  test('returns null for unknown id', async () => {
    const tpl = await repo.getTemplateById(999999);
    expect(tpl).toBeNull();
  });
});

// ─── createTemplateForUser ────────────────────────────────────────────────────

describe('ChatTemplateRepository.createTemplateForUser', () => {
  test('creates template and links it to a user', async () => {
    const tpl = await repo.createTemplateForUser(TEST_USER, {
      thema: 'Travel',
      level: 'B2'
    });
    expect(tpl.id).toBeDefined();
    expect(tpl.thema).toBe('Travel');
  });
});

// ─── getUserTemplates ─────────────────────────────────────────────────────────

describe('ChatTemplateRepository.getUserTemplates', () => {
  test('returns templates for the user', async () => {
    const templates = await repo.getUserTemplates(TEST_USER);
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  test('returns empty array for unknown user', async () => {
    const templates = await repo.getUserTemplates('nobody@nowhere.test');
    expect(templates).toEqual([]);
  });
});

// ─── updateTemplate ───────────────────────────────────────────────────────────

describe('ChatTemplateRepository.updateTemplate', () => {
  let templateId;

  beforeAll(async () => {
    const tpl = await repo.createTemplate({ thema: 'ToUpdate', level: 'A2' });
    templateId = tpl.id;
  });

  test('updates and returns true', async () => {
    const ok = await repo.updateTemplate(templateId, { thema: 'Updated', level: 'B1' });
    expect(ok).toBe(true);
    const tpl = await repo.getTemplateById(templateId);
    expect(tpl.thema).toBe('Updated');
  });

  test('returns false for unknown id', async () => {
    const ok = await repo.updateTemplate(999999, { thema: 'X' });
    expect(ok).toBe(false);
  });
});

// ─── deleteTemplate ───────────────────────────────────────────────────────────

describe('ChatTemplateRepository.deleteTemplate', () => {
  test('deletes and returns true', async () => {
    const tpl = await repo.createTemplate({ thema: 'ToDelete' });
    const ok = await repo.deleteTemplate(tpl.id);
    expect(ok).toBe(true);
    expect(await repo.getTemplateById(tpl.id)).toBeNull();
  });

  test('returns false for unknown id', async () => {
    const ok = await repo.deleteTemplate(999999);
    expect(ok).toBe(false);
  });
});
