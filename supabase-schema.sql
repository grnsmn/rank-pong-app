-- ============================================================
-- RankPong — Schema Supabase
-- Da eseguire nel SQL Editor del tuo progetto Supabase
-- ============================================================


-- ============================================================
-- 1. TABELLE
-- ============================================================

-- Profili giocatori (collegati ad auth.users)
create table public.profiles (
  id              uuid references auth.users on delete cascade not null primary key,
  username        text unique not null,
  display_name    text not null,
  avatar_url      text,
  age             integer,
  player_type     text not null default 'amateur'
                    check (player_type in ('amateur', 'competitive', 'student')),
  elo_rating      integer not null default 1000,
  created_at      timestamptz not null default now()
);

-- Partite
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid references public.profiles(id) on delete set null,
  player_1_id     uuid references public.profiles(id) on delete cascade not null,
  player_2_id     uuid references public.profiles(id) on delete cascade not null,
  best_of         integer not null check (best_of in (3, 5)),
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'disputed')),
  elo_change_p1   integer,
  elo_change_p2   integer,
  created_at      timestamptz not null default now()
);

-- Set di ogni partita
create table public.sets (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references public.matches(id) on delete cascade not null,
  set_number      integer not null,
  score_p1        integer not null,
  score_p2        integer not null,
  created_at      timestamptz not null default now(),
  unique (match_id, set_number)
);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.matches  enable row level security;
alter table public.sets     enable row level security;

-- Profiles: chiunque può leggere, solo il proprietario può modificare
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- Matches: tutti gli autenticati possono leggere e creare
create policy "Authenticated users can view matches"
  on public.matches for select
  to authenticated using (true);

create policy "Authenticated users can create matches"
  on public.matches for insert
  to authenticated
  with check ((select auth.uid()) = player_1_id);

create policy "Players can update their own matches"
  on public.matches for update
  to authenticated
  using (
    (select auth.uid()) = player_1_id
    or (select auth.uid()) = player_2_id
  );

-- Sets: tutti gli autenticati possono leggere, il creatore del match può inserire
create policy "Authenticated users can view sets"
  on public.sets for select
  to authenticated using (true);

create policy "Match creator can insert sets"
  on public.sets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      where id = match_id
        and player_1_id = (select auth.uid())
    )
  );


-- ============================================================
-- 3. TRIGGER: crea profilo automaticamente al signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, age, player_type)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name',
    'https://api.dicebear.com/7.x/bottts/svg?seed=' || (new.raw_user_meta_data->>'username'),
    (new.raw_user_meta_data->>'age')::integer,
    coalesce(new.raw_user_meta_data->>'player_type', 'amateur')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 4. TRIGGER: calcola ELO quando un match viene confermato
-- ============================================================

create or replace function public.calculate_elo_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p1_rating   integer;
  p2_rating   integer;
  sets_p1     integer;
  sets_p2     integer;
  e_a         float;
  e_b         float;
  change_a    integer;
  change_b    integer;
  k           integer := 32;
begin
  -- Esegui solo quando lo status passa a 'confirmed'
  if new.status = 'confirmed' and old.status <> 'confirmed' then

    -- Leggi i rating attuali
    select elo_rating into p1_rating from public.profiles where id = new.player_1_id;
    select elo_rating into p2_rating from public.profiles where id = new.player_2_id;

    -- Conta i set vinti da ciascuno
    select
      count(*) filter (where score_p1 > score_p2),
      count(*) filter (where score_p2 > score_p1)
    into sets_p1, sets_p2
    from public.sets
    where match_id = new.id;

    -- Formula Elo
    e_a := 1.0 / (1.0 + power(10.0, (p2_rating - p1_rating)::float / 400.0));
    e_b := 1.0 / (1.0 + power(10.0, (p1_rating - p2_rating)::float / 400.0));

    if sets_p1 > sets_p2 then
      change_a := round(k * (1.0 - e_a));
      change_b := round(k * (0.0 - e_b));
    else
      change_a := round(k * (0.0 - e_a));
      change_b := round(k * (1.0 - e_b));
    end if;

    -- Salva il delta sul match
    new.elo_change_p1 := change_a;
    new.elo_change_p2 := change_b;

    -- Aggiorna i rating dei giocatori (minimo 0)
    update public.profiles
      set elo_rating = greatest(0, elo_rating + change_a)
      where id = new.player_1_id;

    update public.profiles
      set elo_rating = greatest(0, elo_rating + change_b)
      where id = new.player_2_id;

  end if;

  return new;
end;
$$;

create trigger on_match_confirmed
  before update on public.matches
  for each row execute procedure public.calculate_elo_on_confirm();
