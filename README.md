# RankPong 🏓

ELO ranking system for amateur ping pong tournaments. Track matches set by set, calculate ratings automatically, and challenge your opponents.

---

## Features

- **ELO Rating** — calculated automatically after each confirmed match; rewards victories against stronger opponents. The K-factor varies by player type: Competitive K=24 (stable rating), Amateur K=32 (standard), Student K=48 (fast-developing rating)
- **Set by set match** — record scores with real-time validation (minimum 11 points, margin of 2)
- **Referee mode** — record a match between two other players without being one of the contenders
- **Score correction** — request a score correction; the opponent approves or rejects and the ELO is recalculated atomically
- **Leaderboard** — real-time leaderboard with top 3 podium and search by name or username
- **Personal statistics** — win rate, set ratio, and winning streak in each player's profile
- **Advanced filters** — filter matches by opponent, outcome (won/lost), period, and format (BO3/BO5)
- **Offline mode** — without Supabase the app works in mock mode on `localStorage` with the same logic

---

## Tech Stack

| Role         | Technology                                |
| ------------ | ----------------------------------------- |
| Frontend     | React 19 + Vite                           |
| Language     | TypeScript                                |
| Styling      | Tailwind CSS + DaisyUI (dark theme)       |
| Backend / DB | Supabase (Auth, Postgres, RLS, RPC)       |
| Global State | Zustand                                   |
| i18n         | react-i18next (Italian)                   |
| Deploy       | Netlify (SPA redirect via `netlify.toml`) |

---

## How it works — ELO calculation

The rating system uses the standard Elo formula with a **variable K-factor based on player type**:

| Player type | K-factor | Effect                                             |
| ----------- | -------- | -------------------------------------------------- |
| Student     | 48       | Rating adjusts rapidly — reaches true level faster |
| Amateur     | 32       | Standard, balanced                                 |
| Competitive | 24       | Stable rating — harder to gain or lose points      |

Each player uses their own K independently. Beating a Competitive player as an Amateur yields more points than the opponent loses — by design, as the upset carries more weight.

```
ELO change = K × (actual score − expected win probability)

Expected probability = 1 / (1 + 10^((opponent_rating − your_rating) / 400))
Actual score: 1.0 if won, 0.0 if lost
```

---

## How it works — score correction flow

```
Player A requests correction with new scores
        ↓
Player B receives notification with current / proposed comparison
        ↓
Approves → Supabase RPC reverses the previous ELO and recalculates
Rejects → status returns to confirmed, no changes
```

The RPC functions (`approve_correction`, `reject_correction`) use `SECURITY DEFINER` to bypass RLS and guarantee the atomicity of the operation.

---

## Local Setup

```bash
# Clone the repository
git clone https://github.com/.../rankpong.git
cd rankpong

# Install dependencies
npm install

# Environment variables (optional — without Supabase it works in mock mode)
cp .env.example .env.local
# → VITE_SUPABASE_URL=...
# → VITE_SUPABASE_ANON_KEY=...

# Dev server
npm run dev
```

To bring a fresh Supabase project up to the current schema, see [Database migrations](#database-migrations) below.

---

## Database migrations

Schema changes are **versioned files in this repo**, applied with the [Supabase CLI](https://supabase.com/docs/guides/cli) — not pasted into the dashboard SQL Editor.

`supabase-schema.sql` (sections 1-9) is the **frozen baseline**: the schema as it stood when migrations were adopted. It is no longer extended. Everything after it lives in `supabase/migrations/`.

### How it works

`supabase db push` reads the files in `supabase/migrations/`, compares them against the `supabase_migrations.schema_migrations` table on the remote database, and runs **only the ones not yet recorded there**, in timestamp order. Running it twice in a row is a no-op — which is what makes the workflow safe and automatable.

### Prerequisites

```bash
brew install supabase/tap/supabase
```

Docker must be running for `db pull` and for the local stack (`supabase start`).

### First-time setup

Run once per clone. Steps marked **(prod)** touch the remote project.

**1. Initialise and link.** Neither command writes to the database: `init` is local only, `link` stores credentials on your machine. Linking comes first because every later command resolves the project through it.

```bash
supabase init
```

```bash
supabase link --project-ref <PROJECT_REF>
```

**2. Back up — (prod), read-only.** Check in the dashboard whether your plan includes automatic backups; don't assume it does.

```bash
supabase db dump --linked -f ~/rankpong_backup_schema.sql
```

```bash
supabase db dump --linked --data-only -f ~/rankpong_backup_data.sql
```

Keep both **outside the repo** — they contain user data.

**`db dump` prints success even when the file it wrote is unusable.** On a first run on a clean machine — the one that also pulls the `supabase/postgres` Docker image — it has been seen producing both a 0-byte file and a file containing the same dump twice over. Don't trust the success message; check the result:

```bash
wc -l ~/rankpong_backup_schema.sql && grep -c 'SET statement_timeout = 0;' ~/rankpong_backup_schema.sql
```

A header count of `1` means one clean dump; anything else means it's malformed — delete the file and re-run. Step 3 is the first command that writes anything.

**3. Create the baseline — (prod).** Reads the live schema, writes `supabase/migrations/<timestamp>_remote_schema.sql`, and records it as already applied so it is never re-executed. The only thing it writes to the database is one row in the migration history table.

```bash
supabase db pull
```

Without Docker: copy `supabase-schema.sql` to `supabase/migrations/20240101000000_baseline.sql` and mark it applied without running it — `migration repair` only touches the history table, it executes no SQL.

```bash
supabase migration repair --status applied 20240101000000
```

**4. Verify.** Both sides must show the baseline.

```bash
supabase migration list
```

```bash
supabase db push --dry-run
```

The dry run must report nothing to apply. If it wants to apply the baseline, the history is not recorded correctly — repair it before pushing, or the push will try to recreate existing tables.

### Adding a schema change

```bash
supabase migration new add_events_table
```

Write the SQL in the generated file, then check what would happen before it happens:

```bash
supabase db push --dry-run
```

```bash
supabase db push
```

Commit the migration file in the same commit as the code that depends on it.

### Conventions

| Rule                                                                              | Why                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration files are immutable once pushed                                         | They're already in the remote history and won't re-run; editing them makes repo and database diverge. Fix forward with a new migration.                                                             |
| Write idempotent SQL (`if not exists`, `create or replace`, `drop ... if exists`) | A file is not guaranteed to be applied atomically — an idempotent one is safe to re-run after a partial failure.                                                                                    |
| One logical change per file, named for the change                                 | `add_events_table`, not `update3`. A table with its RLS policies and trigger is one change.                                                                                                         |
| Additive first, destructive much later                                            | The frontend is a SPA: users keep running the previously loaded bundle after a deploy. To rename a column, add the new one and ship the frontend first, then drop the old one in a later migration. |

### Checking and repairing state

```bash
supabase migration list
```

- **LOCAL only** — in the repo, not yet applied. Normal before a push. If it _was_ applied by hand through the SQL Editor, record it without re-running: `supabase migration repair --status applied <version>`.
- **REMOTE only** — applied but not described in the repo. Catch up with `supabase db pull`, or mark it reverted with `supabase migration repair --status reverted <version>`.

### Local stack

The full stack (Postgres, Auth, Studio) runs in Docker, so migrations can be verified without touching production:

```bash
supabase start
```

```bash
supabase db reset --local
```

`db reset --local` replays every migration from scratch against the local database — the only way to confirm the migration set is coherent end to end.

> ⚠️ **`supabase db reset` without `--local`** (i.e. `--linked` or `--db-url <remote>`) **drops the schemas and destroys all user data**, and `--yes` suppresses the confirmation prompt. Never run it against the remote project; never put it in a script or CI workflow.

---

## Project Structure

```
src/
├── screen/           # One screen per file
│   ├── LoginScreen.tsx
│   ├── MatchesScreen.tsx
│   ├── NewMatchScreen.tsx
│   ├── LeaderboardScreen.tsx
│   └── ProfileScreen.tsx
├── hooks/            # Reusable custom hooks
│   ├── useDataFetch.ts      # fetch + loading + refetchOnFocus
│   ├── useFormState.ts      # isSaving / formError / successMsg
│   ├── useModalState.ts     # open / close / modal error
│   ├── useSearch.ts         # search array with matcher
│   ├── useClickOutside.ts   # click-outside for dropdown
│   └── useMatchStats.ts     # ELO stats per player
├── services/
│   └── db.ts         # All DB methods (Supabase + localStorage mock)
├── store/
│   └── useAppStore.ts  # Zustand global state (auth + profile)
└── i18n/
    └── locales/it.ts   # All UI strings
```

---

## DB Schema (main)

```sql
profiles      -- users with ELO, username, player_type
matches       -- match with status, best_of, elo_change, correction_*
sets          -- set by set scores tied to the match
```

RLS policies ensure that every user can read everything but only modify their own rows. Sensitive multi-table operations (confirmation, correction) go through RPC functions with `SECURITY DEFINER`.

---

## Development Conventions

- Every visible UI string goes in `src/i18n/locales/it.ts` — no hardcoded text in components
- `db.ts` always maintains dual implementation: Supabase branch and localStorage mock branch
- Schema modifications are versioned migration files under `supabase/migrations/`, applied with `supabase db push` — `supabase-schema.sql` is a frozen baseline and is never extended
- Centered modals (`fixed inset-0`), never bottom sheets

---

_Side project by Simone Guarnuccio_
