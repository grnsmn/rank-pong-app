# RankPong — Instructions for Claude

## Tech stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + DaisyUI (dark theme, `slate-900/950` base)
- **Backend**: Supabase (Auth, Postgres, RLS, Triggers, RPC functions)
- **Global state**: Zustand (`src/store/useAppStore.ts`)
- **i18n**: react-i18next, single locale Italian (`src/i18n/locales/it.ts`)
- **Deploy**: Netlify (SPA redirect via `netlify.toml`)

## Main file structure

```
src/
  screen/           # One screen per file (MatchesScreen, NewMatchScreen, ...)
  services/db.ts    # All DB methods (Supabase + localStorage mock)
  store/            # Zustand store
  i18n/locales/it.ts  # All UI strings
supabase-schema.sql # Full schema + triggers + RPC functions
```

## Development rules

### i18n — always

Every user-visible string goes in `src/i18n/locales/it.ts` and is called with `t('key')`.
Never hardcode Italian text directly in components.

### UI — components and patterns

- **Modals**: use centered modals (`fixed inset-0 flex items-center justify-center`), **not** bottom sheets.
    - Structure: Header (title + subtitle) / Body / Footer with buttons.
    - Clicking outside the card closes the modal: `onClick` on the overlay with `e.target === e.currentTarget`.
- **Primary CTA buttons**: use explicit Tailwind classes when the color must be guaranteed (e.g. `bg-orange-500 hover:bg-orange-400 text-white border-none`), don't blindly rely on DaisyUI variants (`btn-warning`) which can have unreadable text depending on the theme.
- **Secondary/cancel buttons**: `btn btn-ghost border border-slate-700 text-slate-300`.
- **Modal spacing**: `px-6 pt-6 pb-4` header / `px-6 py-5` body / `px-6 pb-6` footer.
- **Card sections**: use `overflow-hidden` on the card and separate areas with `border-t border-slate-800/60` + a distinct background for status footers.

### DB logic — Supabase/mock dual track

`db.ts` always keeps two implementations for every method:

1. `if (isSupabaseConfigured && supabase)` branch → real Supabase calls
2. `else` branch → `localStorage` mock with the same logic replicated in TypeScript

Supabase RPC functions (security definer) bypass RLS: use them for atomic multi-table operations (e.g. approving a correction with Elo recalculation).

### SQL schema

Schema changes always get appended to the bottom of `supabase-schema.sql` as a new numbered, commented section. Don't modify existing sections (1-4), add new ones (5, 6, ...).

## Component architecture — progressive decomposition

Screens currently live as single, large files under `src/screen/` (e.g. `MatchesScreen.tsx`, `NewMatchScreen.tsx` are each several hundred lines mixing data fetching, filtering logic, and inline JSX for every card/section/modal). This isn't being refactored in one pass — instead, **whenever you're already touching a screen for a feature or fix**, look for pieces that are ready to be pulled out into their own subcomponent, and extract them as part of that same change.

Signals that a chunk is ready to become its own component:

- **Repetition**: near-identical JSX blocks for different states (e.g. a match card rendered slightly differently across "pending", "confirmed", "disputed" sections).
- **Size**: a self-contained visual unit (a card, a modal, a filter bar/toolbar) whose JSX runs past ~100-150 lines on its own.
- **Self-contained state/logic**: a piece that manages its own local state or handlers and doesn't need much from the parent beyond a few props/callbacks (a correction modal, a search+filters panel).

Conventions when extracting:

- Place screen-specific subcomponents next to the screen, e.g. `src/screen/Matches/MatchCard.tsx`, `src/screen/Matches/CorrectionModal.tsx` (co-locate rather than dumping everything into a generic `src/components/`), and keep the screen file (`MatchesScreen.tsx`) as the orchestrator: data fetching, filters, and composition of the subcomponents.
- Only promote a component to a shared `src/components/` location once it's actually reused across 2+ screens — don't do this preemptively.
- Keep props explicit and typed; don't reach into global store from a leaf subcomponent if the data can be passed down instead — makes it easier to see what a component actually depends on.
- Extract incrementally, scoped to what the current task touches. Don't turn an unrelated bug fix into a full-screen refactor — pull out only what's in your way or what you're already rewriting.

## Feature: Match score correction

Flow: player requests → opponent approves/rejects → Elo reversed and recalculated.

Fields on `matches`: `correction_requested_by`, `correction_sets` (jsonb), `correction_status` (pending/approved/rejected).

RPC functions: `request_correction`, `approve_correction`, `reject_correction`.

The notification badge on the Matches tab includes both pending matches to confirm and corrections awaiting a response from the opponent.
