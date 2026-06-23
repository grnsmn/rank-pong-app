# RankPong — Istruzioni per Claude

## Stack tecnico

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + DaisyUI (tema dark, base `slate-900/950`)
- **Backend**: Supabase (Auth, Postgres, RLS, Triggers, RPC functions)
- **Stato globale**: Zustand (`src/store/useAppStore.ts`)
- **i18n**: react-i18next, lingua unica italiana (`src/i18n/locales/it.ts`)
- **Deploy**: Netlify (SPA redirect via `netlify.toml`)

## Struttura file principali

```
src/
  screen/           # Una schermata per file (MatchesScreen, NewMatchScreen, ...)
  services/db.ts    # Tutti i metodi DB (Supabase + mock localStorage)
  store/            # Zustand store
  i18n/locales/it.ts  # Tutte le stringhe UI
supabase-schema.sql # Schema completo + trigger + RPC functions
```

## Regole di sviluppo

### i18n — sempre

Ogni stringa visibile all'utente va in `src/i18n/locales/it.ts` e richiamata con `t('chiave')`.
Non hardcodare mai testo italiano direttamente nei componenti.

### UI — componenti e pattern

- **Modali**: usare modali centrati (`fixed inset-0 flex items-center justify-center`), **non** bottom sheet.
    - Struttura: Header (titolo + subtitle) / Corpo / Footer con bottoni.
    - Click fuori dalla card chiude il modale: `onClick` sull'overlay con `e.target === e.currentTarget`.
- **Bottoni CTA primari**: usare classi Tailwind esplicite quando il colore deve essere garantito (es. `bg-orange-500 hover:bg-orange-400 text-white border-none`), non affidarsi ciecamente alle varianti DaisyUI (`btn-warning`) che possono avere testo illeggibile a seconda del tema.
- **Bottoni secondari/cancel**: `btn btn-ghost border border-slate-700 text-slate-300`.
- **Spacing modale**: `px-6 pt-6 pb-4` header / `px-6 py-5` corpo / `px-6 pb-6` footer.
- **Sezioni card**: usare `overflow-hidden` sulla card e separare aree con `border-t border-slate-800/60` + background distinto per i footer di stato.

### Logica DB — doppio binario Supabase/mock

`db.ts` mantiene sempre due implementazioni per ogni metodo:

1. Ramo `if (isSupabaseConfigured && supabase)` → chiamate reali Supabase
2. Ramo `else` → mock su `localStorage` con la stessa logica replicata in TypeScript

Le RPC functions Supabase (security definer) bypassano RLS: usarle per operazioni multi-tabella atomiche (es. approvazione correzione con Elo recalc).

### Schema SQL

Le modifiche allo schema vanno sempre aggiunte in fondo a `supabase-schema.sql` con una sezione numerata e commentata. Non modificare le sezioni esistenti (1-4), aggiungere sezioni nuove (5, 6, ...).

## Feature: Correzione punteggi match

Flusso: giocatore richiede → avversario approva/rifiuta → Elo reversato e ricalcolato.

Campi su `matches`: `correction_requested_by`, `correction_sets` (jsonb), `correction_status` (pending/approved/rejected).

RPC functions: `request_correction`, `approve_correction`, `reject_correction`.

Il badge di notifica sul tab Partite include sia i match pending da confermare sia le correzioni in attesa di risposta dall'avversario.
