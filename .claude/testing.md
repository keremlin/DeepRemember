# Testing Guide — DeepRemember

## Setup (one-time)

```bash
cd backend
npm install --save-dev jest supertest
```

Add to `backend/package.json` scripts:
```json
"test":            "jest",
"test:unit":       "jest tests/unit",
"test:integration":"jest tests/integration"
```

Create the folder structure:
```
backend/
└── tests/
    ├── unit/
    │   ├── repositories/     # Repository method tests (no HTTP)
    │   └── utils/            # Pure function tests
    └── integration/
        ├── helpers/
        │   └── auth.js       # Shared token helper
        └── api/              # Full HTTP round-trip tests via supertest
```

---

## Unit Tests

Unit tests target **repository methods and pure functions** in isolation.
They use an in-memory SQLite DB — no running server required.

### Pattern

```js
// tests/unit/repositories/DeepRememberRepository.test.js
const DatabaseFactory = require('../../database/access/DatabaseFactory');
const DeepRememberRepository = require('../../database/access/DeepRememberRepository');

let db, repo;

beforeAll(async () => {
  db = await DatabaseFactory.initialize('sqlite', { dbPath: ':memory:' });
  repo = new DeepRememberRepository(db);
});

afterAll(async () => {
  await db.close?.();
});

test('createUser returns a user with user_id', async () => {
  const user = await repo.createUser('test@example.com');
  expect(user.user_id).toBe('test@example.com');
});

test('createCard adds a card for the user', async () => {
  const card = await repo.createCard('test@example.com', {
    word: 'lernen', translation: 'to learn', context: 'Ich lerne Deutsch.'
  });
  expect(card.word).toBe('lernen');
  expect(card.id).toBeDefined();
});

test('checkDuplicateCard detects an existing word', async () => {
  const duplicate = await repo.checkDuplicateCard('test@example.com', 'lernen', 'to learn');
  expect(duplicate).not.toBeNull();
});

test('deleteCard removes the card', async () => {
  const cards = await repo.getUserCards('test@example.com');
  const ok = await repo.deleteCard('test@example.com', cards[0].id);
  expect(ok).toBe(true);
});
```

### What to unit test

| Target | File |
|--------|------|
| `DeepRememberRepository` CRUD | `tests/unit/repositories/DeepRememberRepository.test.js` |
| `WordBaseRepository` | `tests/unit/repositories/WordBaseRepository.test.js` |
| `ChatTemplateRepository` | `tests/unit/repositories/ChatTemplateRepository.test.js` |
| `GamesRepository` | `tests/unit/repositories/GamesRepository.test.js` |
| `UserConfigRepository` | `tests/unit/repositories/UserConfigRepository.test.js` |
| Tools/utilities in `backend/tools/` | `tests/unit/utils/*.test.js` |

### Run

```bash
cd backend && npm run test:unit
```

---

## Integration Tests (API calls via supertest)

Integration tests boot the Express app in-process and fire real HTTP requests.
They use a dedicated in-memory SQLite DB so they never touch production data.

### Prerequisites — `backend/.env.test`

Create this file (never commit it):
```
DB_TYPE=sqlite
SQLITE_PATH=:memory:
NODE_ENV=test
JWT_SECRET=test-secret-do-not-use-in-prod
TEST_API=true
```

Load it in Jest by adding to `backend/package.json`:
```json
"jest": {
  "testEnvironment": "node",
  "setupFiles": ["dotenv/config"],
  "testPathPattern": "tests/"
}
```

### Shared auth helper

```js
// tests/integration/helpers/auth.js
const request = require('supertest');
const app = require('../../../server');

const TEST_USER = { email: 'jest@test.com', password: 'Test1234!' };

async function registerAndLogin() {
  await request(app).post('/api/auth/register').send(TEST_USER);
  const res = await request(app).post('/api/auth/login').send(TEST_USER);
  return res.body.token;
}

module.exports = { registerAndLogin, TEST_USER };
```

### Pattern — public routes

```js
// tests/integration/api/auth.test.js
const request = require('supertest');
const app = require('../../../server');

describe('POST /api/auth/register', () => {
  test('201 with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'Test1234!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Test1234!' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'new@test.com', password: 'Test1234!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'new@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
```

### Pattern — protected routes

```js
// tests/integration/api/games.test.js
const request = require('supertest');
const app = require('../../../server');
const { registerAndLogin } = require('../helpers/auth');

let token;
beforeAll(async () => { token = await registerAndLogin(); });

test('GET /api/games — 200 with token', async () => {
  const res = await request(app)
    .get('/api/games')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.games)).toBe(true);
});

test('GET /api/games — 401 without token', async () => {
  const res = await request(app).get('/api/games');
  expect(res.status).toBe(401);
});
```

### Existing endpoints — integration test priority

| Priority | Endpoint | File |
|----------|----------|------|
| 1 | `POST /api/auth/register`, `POST /api/auth/login` | `api/auth.test.js` |
| 2 | `POST /deepRemember/create-card`, `GET /deepRemember/all-cards/:userId` | `api/deepRemember.test.js` |
| 3 | `POST /api/srs/create-card`, `GET /api/srs/review-cards/:userId`, `POST /api/srs/answer-card` | `api/srs.test.js` |
| 4 | `GET /api/word-base`, `POST /api/word-base` | `api/wordBase.test.js` |
| 5 | `GET /api/games`, `POST /api/games/data` | `api/games.test.js` |

### Run

```bash
cd backend && npm run test:integration
```

---

## Manual API Smoke Testing (no setup required)

For quick checks against the live running backend:

```bash
# Enable health endpoint in backend/.env
TEST_API=true

# Full server status (DB health, service status, all endpoints listed)
curl http://localhost:4004/api/test/local112358
```

One-off curl workflow:
```bash
# 1. Register
curl -X POST http://localhost:4004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!"}'

# 2. Login and capture token
TOKEN=$(curl -s -X POST http://localhost:4004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

# 3. Hit a protected route
curl http://localhost:4004/api/games \
  -H "Authorization: Bearer $TOKEN"
```

---

## New Feature — Required Tests

**Every new feature must ship with tests before it is considered done.**
Follow this procedure each time a new route, repository method, or service is added.

### Step 1 — Define what changes

| Change type | Unit test required | Integration test required |
|-------------|-------------------|--------------------------|
| New repository method | Yes | No (covered by integration via route) |
| New route (public) | No | Yes — happy path + 400 for bad input |
| New route (protected) | No | Yes — happy path + 401 without token |
| New factory/service | Yes (mock dependencies) | No |
| Pure utility function | Yes | No |

### Step 2 — Write unit tests first (repository layer)

For each new repository method, add cases to the matching file in `tests/unit/repositories/`.

Minimum cases per method:
- Happy path (correct input → expected output)
- Not found / empty result (returns `null` or `[]`, not throws)
- Duplicate / constraint violation (throws or returns falsy)

```js
// Example: new WordBaseRepository.addSampleSentence()
test('addSampleSentence stores the sentence', async () => {
  const word = await repo.createWord({ word: 'rennen', groupAlphabetName: 'R', type_of_word: 'verb' });
  const updated = await repo.addSampleSentence(word.id, 'Ich renne schnell.');
  expect(updated.sample_sentence).toBe('Ich renne schnell.');
});

test('addSampleSentence returns null for unknown id', async () => {
  const result = await repo.addSampleSentence(999999, 'test');
  expect(result).toBeNull();
});
```

### Step 3 — Write integration tests (route layer)

For each new route, add a `describe` block to the matching file in `tests/integration/api/`.
Create a new file if the route group doesn't have one yet (name it after the route prefix).

Minimum cases per route:
- **Happy path** — correct request returns expected status + shape
- **Auth guard** — request without token returns `401` (skip for truly public routes)
- **Validation** — missing required field returns `400`

```js
// Example: POST /api/word-base (new protected route)
describe('POST /api/word-base', () => {
  test('201 creates a word', async () => {
    const res = await request(app)
      .post('/api/word-base')
      .set('Authorization', `Bearer ${token}`)
      .send({ word: 'laufen', groupAlphabetName: 'L', type_of_word: 'verb' });
    expect(res.status).toBe(201);
    expect(res.body.word.word).toBe('laufen');
  });

  test('401 without token', async () => {
    const res = await request(app)
      .post('/api/word-base')
      .send({ word: 'laufen', groupAlphabetName: 'L', type_of_word: 'verb' });
    expect(res.status).toBe(401);
  });

  test('400 when required field missing', async () => {
    const res = await request(app)
      .post('/api/word-base')
      .set('Authorization', `Bearer ${token}`)
      .send({ word: 'laufen' }); // missing groupAlphabetName and type_of_word
    expect(res.status).toBe(400);
  });
});
```

### Step 4 — Pre-commit checklist

Before marking a feature as done:

- [ ] Unit test written for every new repository method
- [ ] Integration test written for every new route (happy path + 401 + 400)
- [ ] All existing tests still pass: `npm test`
- [ ] No `process.env` accessed directly in the new route (use `config/app.js`)
- [ ] Auth middleware applied to the new route if it is user-specific
- [ ] Backend restarted and manual smoke-test confirms the endpoint works

### Step 5 — Run the full suite

```bash
cd backend && npm test
```

All tests must be green before the feature is considered complete.
