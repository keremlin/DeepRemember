# AI Tools Reference — Each new tool added to this folder MUST update this file automatically.

This file is the single source of truth for AI agents operating in this codebase.
When you create or modify a tool under `backend/AI/tools/`, append its entry here before finishing your task.

---

## tools/queryTable.js

**Purpose:** Standalone script to query any Supabase table directly. Used to verify data written to the database without starting the full server.

**Run from:** `backend/AI/tools/`

```bash
node queryTable.js <table> [options]
```

**Options:**

| Flag | Description | Example |
|---|---|---|
| `--limit <n>` | Max rows to return (default: 20) | `--limit 5` |
| `--filter <expr>` | PostgREST filter(s), comma-separated | `--filter "id=eq.1"` |
| `--columns <cols>` | Comma-separated column names | `--columns "id,name"` |
| `--order <col> [desc]` | Order results | `--order "created_at desc"` |
| `--count` | Show total row count alongside results | `--count` |
| `--raw` | Print raw JSON instead of table view | `--raw` |
| `--list-tables` | Probe and list all accessible tables | `--list-tables` |

**Filter operators** (PostgREST syntax `column=op.value`):
`eq` `neq` `gt` `gte` `lt` `lte` `like` `ilike` `is` `in`

**Examples:**

```bash
node queryTable.js games
node queryTable.js games --limit 5 --order "created_at desc"
node queryTable.js games --filter "id=eq.1" --columns "id,name"
node queryTable.js games --count --raw
node queryTable.js --list-tables
```

**Notes:**
- Reads credentials automatically from `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- Uses the service role key — bypasses Row Level Security, so results reflect actual DB state.
- No server needs to be running.

---
