# Database

There is no hosted/relational database in this project. The only persistent
store is a local SQLite file, used for one feature (memory).

## `~/.friday/memory.db` (Phase 7)

- Engine: Node's built-in `node:sqlite` (stable since Node 22+, zero external
  dependency, zero native build step). Lives outside the repo at
  `~/.friday/memory.db` — never committed, never synced anywhere.
- Accessed only from `apps/dashboard/src/lib/memory/db.ts` (server-only) and
  `app/api/memory/route.ts` — independently confirmed this session as the
  only files touching this database.

### Schema

```
memories(
  id          TEXT PRIMARY KEY,
  category    TEXT,   -- "preference" | "project" | "episodic"
  content     TEXT,
  created_at  TEXT     -- ISO timestamp
)
```

Inferred from `PROJECT_STATE.md`'s Phase 7 notes and the `remember`/`recall`
voice tool signatures in `friday-tools.ts` (`category`/`content` fields) —
not independently re-derived from a `CREATE TABLE` statement in this pass,
but consistent with everything else read this session. Confirm against
`lib/memory/db.ts` directly if exact column types/constraints matter.

### Access pattern

`app/api/memory` (Next.js route handler) is the only HTTP surface:

- `GET /api/memory` — list, or search via `?q=`
- `POST /api/memory` — add `{category, content}`
- `DELETE /api/memory?id=` or `?category=`/`all`

The `remember`/`recall` voice tools call these same routes — no separate
write path. The tools are only offered to the model when memory is enabled
in Settings, gating both visibility and capability, not just a UI element.

## `DATABASE_URL` (reserved, unused)

`.env.example` documents a `DATABASE_URL` variable "reserved for a future
hosted-DB need" (Phase 7 notes, spec §30's eventual Postgres/pgvector
target for multi-device sync or semantic search over memories). Nothing in
the codebase reads this variable today — confirmed by grep: no reference to
`DATABASE_URL` in `apps/dashboard/src` outside `.env.example` itself.

## Everything else is not a database

- Intelligence data (news, markets, weather) is fetched live per-request or
  served from an in-memory mock provider — nothing persisted.
- The geocoding cache (`lib/intelligence/sources/geocode.ts`) is an
  in-memory `Map` keyed by article URL, not a database — cleared on server
  restart.
- Tool audit log and permission settings live in a Zustand store
  (`tool-store.ts`), persisted to browser `localStorage`, not a server-side
  database.
