# RankPong 🏓

ELO ranking system for amateur ping pong tournaments. Track matches set by set, calculate ratings automatically, and challenge your opponents.

---

## Features

- **ELO Rating** — calculated automatically after each confirmed match; rewards victories against stronger opponents
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

To apply the schema to your Supabase project, execute `supabase-schema.sql` in the SQL editor of the dashboard.

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
- Schema modifications are added at the bottom of `supabase-schema.sql` in numbered sections, without touching previous sections
- Centered modals (`fixed inset-0`), never bottom sheets

---

_Side project by Simone Guarnuccio_
