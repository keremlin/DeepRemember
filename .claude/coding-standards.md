# Coding Standards — DeepRemember

## JavaScript / Node.js (Backend)

- CommonJS (`require`/`module.exports`) — the entire backend uses CJS. Do not introduce ES Module syntax (`import`/`export`) in backend files
- `async/await` for all async operations — no raw `.then()` chains
- Error handling in routes: `try/catch` with `res.status(500).json({ error: ... })`
- Destructure config from `backend/config/app.js`, not `process.env` directly in routes
- Factory classes are static: `LlmFactory.create()`, `TtsFactory.create()`, etc.

```js
// Route pattern
router.post('/endpoint', authMiddleware, async (req, res) => {
  try {
    const { param } = req.body;
    const result = await repository.doSomething(param);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## React (Client)

- React 19 — use hooks, no class components
- Co-locate CSS with component: `MyComponent.jsx` + `MyComponent.css`
- API base URL always from `client/src/config/api.js` — never hardcode `localhost:4004`
- Use `AuthContext` for current user, `UserConfigContext` for user settings
- `WordBaseContext` for vocabulary state

```jsx
// API call pattern
import { API_BASE } from '../../config/api';

const res = await fetch(`${API_BASE}/api/endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(payload),
});
```

## Naming Conventions

| Context         | Convention         | Example                        |
|-----------------|--------------------|--------------------------------|
| Files (backend) | PascalCase         | `LlmFactory.js`, `IDatabase.js` |
| Files (routes)  | camelCase          | `wordBase.js`, `chatTemplates.js` |
| Files (React)   | PascalCase         | `ReviewSection.jsx`            |
| Variables/funcs | camelCase          | `getUserCards`, `isLoading`    |
| Constants       | UPPER_SNAKE_CASE   | `DB_TYPE`, `API_PORT`          |
| CSS classes     | kebab-case         | `.review-section`, `.card-item` |

## Database / Repository

- All DB calls through the `DeepRememberRepository` facade or a sub-repository
- Never write raw SQL in routes — always in a repository method
- Cache expensive queries via `CachedRepository` / `DbCache` if needed
- FSRS scheduling logic lives server-side in `backend/routes/srs.js` + repository

## What to Avoid

- Do NOT import from `node_modules` paths directly in source — use package names
- Do NOT put secrets in source files — use `backend/.env`
- Do NOT add `console.log` debug statements — use the logging flags in `.env`
- Do NOT duplicate API base URLs — always use `config/api.js`
- Do NOT write CSS inside JSX `style={{}}` unless it's truly dynamic
