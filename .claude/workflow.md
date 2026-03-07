# Development Workflow — DeepRemember

## Starting the Project

```bash
# Both servers (opens two terminals)
start-dev.bat

# Backend only (port 4004)
cd backend && npm start

# Client only (port 5173)
cd client && npm run dev
```

> Backend requires manual restart after any code change.

## Task Approach

1. **Understand first** — read relevant files before proposing changes
2. **Locate the layer** — is this a route, repository, service, or UI concern?
3. **Check existing patterns** — is there already a factory or repository that handles this?
4. **Make the minimal change** — no refactoring unrelated code
5. **Remind user to restart backend** if any backend file was changed

## Adding a New Feature Checklist

### Backend feature
- [ ] Route in `backend/routes/` (thin — no business logic)
- [ ] Registered in `backend/routes/index.js`
- [ ] Data access via existing or new Repository in `backend/database/access/`
- [ ] New service follows Factory pattern if pluggable
- [ ] Protected by `authMiddleware` if user-specific
- [ ] Config values added to `backend/config/app.js` if needed
- [ ] Unit test written for every new repository method (`tests/unit/repositories/`)
- [ ] Integration test written for every new route (`tests/integration/api/`)
- [ ] Full suite passes: `cd backend && npm test`

> **A feature is not done until all tests pass. If any test fails, fix the
> implementation — do not skip, comment out, or weaken the test to make it green.**

### Frontend feature
- [ ] Component in appropriate subfolder under `client/src/components/`
- [ ] API call goes through `client/src/config/api.js` base URL
- [ ] Shared state managed via Context if needed across components
- [ ] CSS co-located with the component

## Debugging Tips

- Enable DB query logging: `DB_LOG=true` in `backend/.env`
- Enable LLM prompt logging: `LOG_LLM_PROMPTS=true` in `backend/.env`
- Check `backend/testing/` for health check scripts
- Backend runs on `http://localhost:4004`, client on `http://localhost:5173`

## Environment Config (backend/.env)

| Variable       | Options                         |
|----------------|---------------------------------|
| `DB_TYPE`      | `sqlite` / `supabase`           |
| `LLM_PROVIDER` | `groq` / `ollama`               |
| `TTS_TYPE`     | `piper` / `elevenlabs` / `google` |
| `WHISPER_TYPE` | `LocalWhisper` / `Groq`         |
| `FS_TYPE`      | `node` / `googledrive`          |

## Build for Production

```bash
cd backend && npm run build
```

---

## Testing

Full testing procedures, patterns, and the new-feature test requirements are in
**[`.claude/testing.md`](.claude/testing.md)**.

Quick reference:

```bash
cd backend && npm run test:unit          # repository + utility tests (no server)
cd backend && npm run test:integration   # HTTP round-trip tests via supertest
cd backend && npm test                   # full suite
```

Every new feature must ship with tests — see the **New Feature — Required Tests**
section in `testing.md` for the step-by-step procedure (unit → integration → checklist).
