---
name: supabase-migrations
description: Set up, write and apply Supabase database migrations for RankPong through the Supabase CLI. Use when asked to bootstrap the migration workflow (first-time setup), create a migration for a schema change, check whether local and remote schemas are in sync, apply pending migrations, or diagnose migration history problems. Also use whenever a task requires a schema change (new table, column, RLS policy, trigger, RPC function) so the change lands as a migration file instead of ad-hoc SQL.
---

# Supabase migrations — RankPong

## Context

RankPong's Postgres lives on Supabase. Historically every schema change was pasted by hand
into the dashboard SQL Editor, and `supabase-schema.sql` (sections 1-9) was kept as a manual
transcript of what had been pasted. That file is now a **frozen historical baseline**: it is
not extended any more.

From now on the repo is the source of truth. Every schema change is a timestamped file under
`supabase/migrations/`, applied with `supabase db push`.

The remote project serves **real users with real data**. Treat it accordingly.

---

## Hard safety rules

These are not negotiable. They exist because a single wrong command wipes user data.

1. **Never run `supabase db reset` against anything but the local Docker database.**
   `db reset --linked` or `db reset --db-url <remote>` drops the schemas and recreates them
   from scratch: total data loss, no undo, and `--yes` suppresses the confirmation. If a reset
   is needed, it is `supabase db reset --local` and nothing else. Never put a reset in a script,
   an npm script, or a CI workflow.

2. **Never run a command that writes to the remote database without the user explicitly
   approving that exact command in the conversation first.** The remote-writing commands are:
   `db push` (without `--dry-run`), `db pull`, `migration repair`, `migration up`.
   Default behaviour: print the command in its own bash block, say what it will do and what
   output to expect, and let the user run it. Only run it directly if the user has said, in
   this conversation, to go ahead with that specific command.

3. **Always run `supabase db push --dry-run` before the real push, and read the output.**
   If the dry run lists a migration you did not expect — in particular the baseline — stop and
   investigate the migration history instead of pushing.

4. **Never commit a database dump.** Dumps contain user data. They go outside the repo, or in a
   path matched by `.gitignore` (`backup_*.sql`, `*.dump.sql`).

5. **Never edit a migration file that has already been pushed.** It is already recorded in the
   remote history and will not re-run; editing it only makes repo and database diverge.
   Correct a mistake with a new migration.

---

## Task A — First-time setup (one-off bootstrap)

Run this once, in order. Stop and report at the first step that does not behave as described.

### A0. Preconditions

Check and report before touching anything:

```bash
supabase --version
```

Not installed → give the user this and wait:

```bash
brew install supabase/tap/supabase
```

Docker must be running for step A3 (`db pull` starts a temporary Postgres container to diff
the remote schema):

```bash
docker info --format '{{.ServerVersion}}'
```

Ask the user which Supabase project ref to link. The repo has more than one project configured
across `.env*` files — do not guess, and do not read secrets out of those files into the
conversation. If a non-production project is available, propose rehearsing the whole setup
there first.

### A1. Initialise and link

Neither command writes to the database, so both are safe before the backup. Link must come
first regardless: every later command — including the backup — resolves the project through it.

Claude-run, purely local:

```bash
supabase init
```

Creates `supabase/config.toml` and `supabase/.gitignore`. Both are committed.

Then link — user-run, needs credentials:

```bash
supabase link --project-ref <PROJECT_REF>
```

### A2. Backup — before the first command that writes

User-run, both of them. `--linked` resolves the project from A1, which is why linking precedes
this step. Check in the dashboard whether the project's plan includes automatic backups; do not
assume it does.

```bash
supabase db dump --linked -f ~/rankpong_backup_schema.sql
```

```bash
supabase db dump --linked --data-only -f ~/rankpong_backup_data.sql
```

**`db dump` reports success even when the file it wrote is unusable.** Both of these were
observed on a first run on a clean machine, where the command also had to pull the
`supabase/postgres` Docker image:

- a **0-byte file**, and
- a file containing the **same dump twice**, byte for byte.

A plain re-run onto an existing path truncates it normally, so this is not simple append
behaviour — the cause was not established. Treat the success message as unreliable and check
the result instead. Verify non-empty, and exactly one header:

```bash
wc -l ~/rankpong_backup_schema.sql && grep -c 'SET statement_timeout = 0;' ~/rankpong_backup_schema.sql
```

A count of `1` for the header means a single clean dump; anything else means the file is
malformed — delete it and re-run. Keep both files outside the repo. A3 is the first step that writes anything to the database.

### A3. Create the baseline

Preferred path, Docker available. User-run, writes one row to the migration history table and
nothing else:

```bash
supabase db pull
```

This reads the live schema, writes `supabase/migrations/<timestamp>_remote_schema.sql`, and
records that migration as already applied — so it will never be re-executed.

Fallback when Docker is unavailable: copy `supabase-schema.sql` to
`supabase/migrations/20240101000000_baseline.sql`, then have the user run

```bash
supabase migration repair --status applied 20240101000000
```

`migration repair` only writes to `supabase_migrations.schema_migrations`. It runs no SQL.

### A4. Verify, and report schema drift

```bash
supabase migration list
```

Expect one row present on both the LOCAL and REMOTE side. A row on one side only means the
history is out of sync — fix it with `migration repair` before any push.

Then diff the generated baseline against the frozen transcript:

```bash
diff <(grep -vE '^\s*--|^\s*$' supabase-schema.sql | sort) <(grep -vE '^\s*--|^\s*$' supabase/migrations/*_remote_schema.sql | sort) | head -60
```

This is deliberately coarse and **noisy in a specific way**: the two files use different
conventions — the transcript writes `create policy "x" on public.y` (often wrapped across
several lines) while the pulled baseline writes `CREATE POLICY "x" ON "public"."y"` on one.
Any line-based or single-line-regex comparison will therefore flag multi-line definitions,
especially policies, as missing from the transcript when they are present. Confirm each
apparent difference against the transcript with a direct `grep -i '<object name>'
supabase-schema.sql` before reporting it — most of them evaporate.

What survives that check is real drift: an object applied to the database but never recorded in
the transcript, or vice versa. Report each one explicitly, and say what it does — drift often
turns out to be an abandoned experiment left with live grants. Do not "fix" drift by editing
the baseline; the baseline must describe the database as it actually is. If something should
not be there, remove it with its own migration, flagged as destructive.

### A5. Prove the loop works

Before trusting the setup, push something harmless:

```bash
supabase db push --dry-run
```

It must report that there is nothing to apply. If it wants to apply the baseline, stop — the
history is not recorded correctly and pushing would try to recreate existing tables.

---

## Task A-bis — Add a SECOND environment to an existing setup

Use this when the repo already has migrations pulled from one project (DEV) and a second project
(PROD) is now being brought into the same workflow. It is **not** a repeat of Task A.

**Do not run `db pull` for the second project.** It would generate a second baseline file
describing the same schema, while each project's history table knows only its own. The other
project's baseline would then show as local-and-unapplied, and `db push` would try to run it —
recreating existing tables against live data. `supabase/migrations/` is a single shared
history: both projects must converge on the same files.

1. Link the second project (user-run). This replaces the previous link — from here on, every
   command targets the new project. Say so explicitly, and confirm with
   `cat supabase/.temp/project-ref` before anything else.

2. Back up the second project first — it is the one with real users. Same verification as A2.

3. Compare its schema against the existing baseline, using the dump from step 2 rather than a
   `db pull`. Normalise before diffing: the two files come from the same generator, but object
   ordering and grants can still differ harmlessly. Compare the **set of objects** — tables,
   columns, functions, policies, triggers, indexes — not the raw text.

4. **If the schemas are equivalent**, record the existing baseline as applied on the second
   project, creating no new file (user-run):

```bash
supabase migration repair --status applied <existing_baseline_version>
```

5. **If they diverge**, stop and report every difference. Divergence means the two projects
   drifted apart while changes were being pasted by hand, and reconciling them is the user's
   decision: bring one up to the other with a migration, or accept the difference and record it.
   Never paper over it by pulling a second baseline.

6. Verify exactly as in A4/A5: `migration list` must show the same single version on both LOCAL
   and REMOTE, and `db push --dry-run` must report nothing to apply.

From this point the two projects share one history. A new migration is written once, pushed to
DEV first, and pushed to PROD only once it has proven itself there.

## Task B — Write a new migration

Whenever a feature or fix needs a schema change.

1. Create the file:

```bash
supabase migration new <short_snake_case_name>
```

Name it after the change: `add_events_table`, `fix_elo_kfactor_student`. Never `update3`.

2. Write the SQL in the generated file, following the conventions below.

3. Dry run, read the output, confirm only the intended file is listed:

```bash
supabase db push --dry-run
```

4. Hand the real push to the user (rule 2):

```bash
supabase db push
```

5. Commit the migration file in the same commit as the code that depends on it.

### Migration writing conventions

- **Idempotent SQL.** Match the existing style in `supabase-schema.sql`: `create table if not
exists`, `create or replace function`, `drop trigger if exists` before `create trigger`,
  `drop policy if exists` before `create policy`, `alter table ... add column if not exists`.
  Do not assume `db push` wraps a file in a transaction — an idempotent file is safe to re-run
  after a partial failure, a non-idempotent one is not.
- **One logical change per file.** A table plus its RLS policies plus its trigger is one change.
  Two unrelated features are two files.
- **Additive first, destructive much later.** The frontend is a SPA on Netlify: users keep
  running the previously loaded bundle for a while after a deploy. To rename or remove a column,
  split it across releases — add the new column and backfill it, ship the frontend that uses it,
  and only in a _later_ migration drop the old one. Never drop or rename a column the currently
  deployed frontend still queries.
- **Functions stay `security definer` with `set search_path = ''`**, matching the existing RPCs.
- **Flag destructive statements.** If a migration contains `drop`, `truncate`, or an
  `alter column ... type`, say so explicitly when handing the push over, and state what data is
  at risk.

---

## Task C — Status and troubleshooting

Current state of both histories:

```bash
supabase migration list
```

- **Row on LOCAL only** → the migration exists in the repo but was never applied. Normal before
  a push. If it was in fact applied by hand through the SQL Editor, record it without re-running
  it: `supabase migration repair --status applied <version>` (user-run).
- **Row on REMOTE only** → something was applied that the repo does not describe. Recover it
  with `supabase db pull` so the repo catches up, or, if it should never have been applied,
  `supabase migration repair --status reverted <version>` (user-run).
- **`db push` wants to apply the baseline** → the baseline is not recorded as applied. Do not
  push. Repair the history first (A3 fallback).

For local experimentation without touching the remote at all, the full stack runs in Docker:
`supabase start`, then `supabase db reset --local` replays every migration from scratch
against the local database — the only safe way to verify that the migration set is coherent.

---

## Division of labour

| Claude runs                                   | User runs (credentials / writes production) |
| --------------------------------------------- | ------------------------------------------- |
| `supabase init`                               | `supabase link`                             |
| `supabase migration new`                      | `supabase db dump`                          |
| writing and editing migration SQL             | `supabase db pull`                          |
| `supabase migration list`                     | `supabase db push` (real)                   |
| `supabase db push --dry-run`                  | `supabase migration repair`                 |
| `supabase db reset --local`, `supabase start` |                                             |

When handing a command over: one command per bash block, say what it changes, and say what
output confirms success.
