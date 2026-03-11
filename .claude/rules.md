# Claude Code Rules — DeepRemember

## General Constraints

- Never modify files in `node_modules/`, `production-v*/`, or `files/`
- Never auto-commit or push. Always ask before any git operation
- Backend does NOT hot-reload — remind the user to restart after backend changes
- Do not add docstrings, comments, or type annotations to code you didn't change
- Do not over-engineer: no extra abstractions, no future-proofing, no feature flags

## Architecture Rules

- **New services** must follow the Factory pattern: create an interface (`IXxx.js`), implementation(s), and a `XxxFactory.js`
- **New data access** must go through the Repository pattern — never query the DB directly from a route
- **Routes** are thin: validate input, call repository/service, return response. No business logic in routes
- **Config** lives in `backend/config/` — no hardcoded ports, credentials, or service names elsewhere
- Environment-specific behavior is controlled via `.env` variables, not code branches

## Security Rules

- All routes (except `/api/auth`) must go through `authMiddleware.js`
- Never log passwords, tokens, or session data
- Validate and sanitize all user input at route boundaries
- No hardcoded secrets or credentials anywhere in the codebase

## File Organization

- Backend route files go in `backend/routes/`
- New React components get their own folder with a `.jsx` + `.css` pair if they have styles
- Shared/reusable UI components go in `client/src/components/` root
- Context providers go alongside the component they serve

## What to Check Before Editing

1. Read the file first — understand existing code before changing it
2. Check if a factory/repository already handles the concern
3. Check `backend/config/app.js` before adding new config values
