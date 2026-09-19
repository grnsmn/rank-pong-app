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


-- ============================================================
-- 5. CORREZIONI MATCH
-- ============================================================

-- Aggiunge colonne per gestire le richieste di correzione
alter table public.matches
  add column if not exists correction_requested_by uuid references public.profiles(id),
  add column if not exists correction_sets         jsonb,
  add column if not exists correction_status       text
    check (correction_status in ('pending', 'approved', 'rejected'));

-- Policy per aggiornare i set (usata dal trigger di correzione, security definer bypassa RLS)
create policy "Players can update sets of their matches"
  on public.sets for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      where id = match_id
        and (
          (select auth.uid()) = player_1_id
          or (select auth.uid()) = player_2_id
        )
    )
  );

-- RPC: richiedi correzione su un match già confermato
create or replace function public.request_correction(
  match_id_param  uuid,
  new_sets        jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
    set correction_requested_by = (select auth.uid()),
        correction_sets         = new_sets,
        correction_status       = 'pending'
    where id = match_id_param
      and status = 'confirmed'
      and (player_1_id = (select auth.uid()) or player_2_id = (select auth.uid()))
      and (correction_status is null or correction_status in ('rejected', 'approved'));
end;
$$;

-- RPC: approva la correzione (ricalcola Elo con i nuovi punteggi)
create or replace function public.approve_correction(match_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m          record;
  p1_rating  integer;
  p2_rating  integer;
  set_item   jsonb;
  sets_p1    integer;
  sets_p2    integer;
  e_a        float;
  e_b        float;
  change_a   integer;
  change_b   integer;
  k          integer := 32;
begin
  select * into m from public.matches where id = match_id_param;

  if m.correction_status <> 'pending' then
    raise exception 'Nessuna correzione in attesa';
  end if;

  if m.correction_requested_by = (select auth.uid()) then
    raise exception 'Non puoi approvare la tua stessa richiesta';
  end if;

  if (select auth.uid()) <> m.player_1_id and (select auth.uid()) <> m.player_2_id then
    raise exception 'Non sei un giocatore di questo match';
  end if;

  -- Reversa le modifiche Elo precedenti
  update public.profiles
    set elo_rating = greatest(0, elo_rating - m.elo_change_p1)
    where id = m.player_1_id;

  update public.profiles
    set elo_rating = greatest(0, elo_rating - m.elo_change_p2)
    where id = m.player_2_id;

  -- Aggiorna i set con i nuovi punteggi proposti
  for set_item in select * from jsonb_array_elements(m.correction_sets)
  loop
    update public.sets
      set score_p1 = (set_item->>'score_p1')::integer,
          score_p2 = (set_item->>'score_p2')::integer
      where match_id = match_id_param
        and set_number = (set_item->>'set_number')::integer;
  end loop;

  -- Conta i nuovi set vinti
  select
    count(*) filter (where score_p1 > score_p2),
    count(*) filter (where score_p2 > score_p1)
  into sets_p1, sets_p2
  from public.sets
  where match_id = match_id_param;

  -- Leggi i rating aggiornati (dopo la reversa)
  select elo_rating into p1_rating from public.profiles where id = m.player_1_id;
  select elo_rating into p2_rating from public.profiles where id = m.player_2_id;

  -- Ricalcola Elo
  e_a := 1.0 / (1.0 + power(10.0, (p2_rating - p1_rating)::float / 400.0));
  e_b := 1.0 / (1.0 + power(10.0, (p1_rating - p2_rating)::float / 400.0));

  if sets_p1 > sets_p2 then
    change_a := round(k * (1.0 - e_a));
    change_b := round(k * (0.0 - e_b));
  else
    change_a := round(k * (0.0 - e_a));
    change_b := round(k * (1.0 - e_b));
  end if;

  -- Applica nuovi Elo
  update public.profiles
    set elo_rating = greatest(0, elo_rating + change_a)
    where id = m.player_1_id;

  update public.profiles
    set elo_rating = greatest(0, elo_rating + change_b)
    where id = m.player_2_id;

  -- Aggiorna il match con i nuovi delta e azzera la richiesta
  update public.matches
    set elo_change_p1           = change_a,
        elo_change_p2           = change_b,
        correction_status       = 'approved',
        correction_requested_by = null,
        correction_sets         = null
    where id = match_id_param;
end;
$$;

-- RPC: rifiuta la correzione
create or replace function public.reject_correction(match_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
    set correction_status       = 'rejected',
        correction_requested_by = null,
        correction_sets         = null
    where id = match_id_param
      and correction_status = 'pending'
      and (player_1_id = (select auth.uid()) or player_2_id = (select auth.uid()));
end;
$$;

-- ============================================================
-- 6. MODALITÀ ARBITRO
-- ============================================================

-- Nuove colonne per tracciare la doppia conferma
alter table public.matches
  add column if not exists player_1_confirmed boolean not null default false,
  add column if not exists player_2_confirmed boolean not null default false;

-- Backfill: i match esistenti creati normalmente (player_1_id = created_by) hanno già confermato come p1
update public.matches
  set player_1_confirmed = true
  where player_1_id = created_by;

-- Policy INSERT matches: permette all'arbitro di creare match dove non è player
drop policy if exists "Authenticated users can create matches" on public.matches;

create policy "Authenticated users can create matches"
  on public.matches for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
  );

-- Policy INSERT sets: allineata a created_by invece di player_1_id
drop policy if exists "Match creator can insert sets" on public.sets;

create policy "Match creator can insert sets"
  on public.sets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      where id = match_id
        and created_by = (select auth.uid())
    )
  );

-- RPC: conferma match come giocatore (gestisce doppia conferma)
create or replace function public.confirm_match_player(match_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select * into m from public.matches where id = match_id_param;

  if m.status != 'pending' then
    raise exception 'Il match non è in stato pending';
  end if;

  if (select auth.uid()) = m.player_1_id then
    update public.matches set player_1_confirmed = true where id = match_id_param;
  elsif (select auth.uid()) = m.player_2_id then
    update public.matches set player_2_confirmed = true where id = match_id_param;
  else
    raise exception 'Non sei un giocatore di questo match';
  end if;

  -- Rileggo dopo l'update
  select * into m from public.matches where id = match_id_param;

  if m.player_1_confirmed and m.player_2_confirmed then
    update public.matches set status = 'confirmed' where id = match_id_param;
  end if;
end;
$$;


-- ============================================================
-- 7. K-FACTOR PER TIPO GIOCATORE
--    Studente K=48 (rating in evoluzione rapida)
--    Amatore  K=32 (standard)
--    Agonista K=24 (rating consolidato e stabile)
-- ============================================================

create or replace function public.k_for_type(ptype text)
returns integer
language plpgsql
immutable
as $$
begin
  if ptype = 'competitive' then return 24;
  elsif ptype = 'student'     then return 48;
  else                             return 32;
  end if;
end;
$$;

-- Aggiorna il trigger di conferma match per usare K per tipo giocatore
create or replace function public.calculate_elo_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p1_rating   integer;
  p2_rating   integer;
  p1_type     text;
  p2_type     text;
  sets_p1     integer;
  sets_p2     integer;
  e_a         float;
  e_b         float;
  change_a    integer;
  change_b    integer;
  k_a         integer;
  k_b         integer;
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then

    select elo_rating, player_type into p1_rating, p1_type
      from public.profiles where id = new.player_1_id;
    select elo_rating, player_type into p2_rating, p2_type
      from public.profiles where id = new.player_2_id;

    k_a := public.k_for_type(p1_type);
    k_b := public.k_for_type(p2_type);

    select
      count(*) filter (where score_p1 > score_p2),
      count(*) filter (where score_p2 > score_p1)
    into sets_p1, sets_p2
    from public.sets
    where match_id = new.id;

    e_a := 1.0 / (1.0 + power(10.0, (p2_rating - p1_rating)::float / 400.0));
    e_b := 1.0 / (1.0 + power(10.0, (p1_rating - p2_rating)::float / 400.0));

    if sets_p1 > sets_p2 then
      change_a := round(k_a * (1.0 - e_a));
      change_b := round(k_b * (0.0 - e_b));
    else
      change_a := round(k_a * (0.0 - e_a));
      change_b := round(k_b * (1.0 - e_b));
    end if;

    new.elo_change_p1 := change_a;
    new.elo_change_p2 := change_b;

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

-- Aggiorna approve_correction per usare K per tipo giocatore
create or replace function public.approve_correction(match_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m          record;
  p1_rating  integer;
  p2_rating  integer;
  p1_type    text;
  p2_type    text;
  set_item   jsonb;
  sets_p1    integer;
  sets_p2    integer;
  e_a        float;
  e_b        float;
  change_a   integer;
  change_b   integer;
  k_a        integer;
  k_b        integer;
begin
  select * into m from public.matches where id = match_id_param;

  if m.correction_status <> 'pending' then
    raise exception 'Nessuna correzione in attesa';
  end if;

  if m.correction_requested_by = (select auth.uid()) then
    raise exception 'Non puoi approvare la tua stessa richiesta';
  end if;

  if (select auth.uid()) <> m.player_1_id and (select auth.uid()) <> m.player_2_id then
    raise exception 'Non sei un giocatore di questo match';
  end if;

  select player_type into p1_type from public.profiles where id = m.player_1_id;
  select player_type into p2_type from public.profiles where id = m.player_2_id;

  k_a := public.k_for_type(p1_type);
  k_b := public.k_for_type(p2_type);

  update public.profiles
    set elo_rating = greatest(0, elo_rating - m.elo_change_p1)
    where id = m.player_1_id;

  update public.profiles
    set elo_rating = greatest(0, elo_rating - m.elo_change_p2)
    where id = m.player_2_id;

  for set_item in select * from jsonb_array_elements(m.correction_sets)
  loop
    update public.sets
      set score_p1 = (set_item->>'score_p1')::integer,
          score_p2 = (set_item->>'score_p2')::integer
      where match_id = match_id_param
        and set_number = (set_item->>'set_number')::integer;
  end loop;

  select
    count(*) filter (where score_p1 > score_p2),
    count(*) filter (where score_p2 > score_p1)
  into sets_p1, sets_p2
  from public.sets
  where match_id = match_id_param;

  select elo_rating into p1_rating from public.profiles where id = m.player_1_id;
  select elo_rating into p2_rating from public.profiles where id = m.player_2_id;

  e_a := 1.0 / (1.0 + power(10.0, (p2_rating - p1_rating)::float / 400.0));
  e_b := 1.0 / (1.0 + power(10.0, (p1_rating - p2_rating)::float / 400.0));

  if sets_p1 > sets_p2 then
    change_a := round(k_a * (1.0 - e_a));
    change_b := round(k_b * (0.0 - e_b));
  else
    change_a := round(k_a * (0.0 - e_a));
    change_b := round(k_b * (1.0 - e_b));
  end if;

  update public.profiles
    set elo_rating = greatest(0, elo_rating + change_a)
    where id = m.player_1_id;

  update public.profiles
    set elo_rating = greatest(0, elo_rating + change_b)
    where id = m.player_2_id;

  update public.matches
    set elo_change_p1           = change_a,
        elo_change_p2           = change_b,
        correction_status       = 'approved',
        correction_requested_by = null,
        correction_sets         = null
    where id = match_id_param;
end;
$$;

-- ============================================================
-- 8. PARTITE AMICHEVOLI (non influiscono sul ranking)
-- ============================================================

alter table public.matches
  add column if not exists is_friendly boolean not null default false;

-- Aggiorna il trigger di conferma: le amichevoli non calcolano/applicano Elo
create or replace function public.calculate_elo_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p1_rating   integer;
  p2_rating   integer;
  p1_type     text;
  p2_type     text;
  sets_p1     integer;
  sets_p2     integer;
  e_a         float;
  e_b         float;
  change_a    integer;
  change_b    integer;
  k_a         integer;
  k_b         integer;
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then

    if new.is_friendly then
      new.elo_change_p1 := null;
      new.elo_change_p2 := null;
      return new;
    end if;

    select elo_rating, player_type into p1_rating, p1_type
      from public.profiles where id = new.player_1_id;
    select elo_rating, player_type into p2_rating, p2_type
      from public.profiles where id = new.player_2_id;

    k_a := public.k_for_type(p1_type);
    k_b := public.k_for_type(p2_type);

    select
      count(*) filter (where score_p1 > score_p2),
      count(*) filter (where score_p2 > score_p1)
    into sets_p1, sets_p2
    from public.sets
    where match_id = new.id;

    e_a := 1.0 / (1.0 + power(10.0, (p2_rating - p1_rating)::float / 400.0));
    e_b := 1.0 / (1.0 + power(10.0, (p1_rating - p2_rating)::float / 400.0));

    if sets_p1 > sets_p2 then
      change_a := round(k_a * (1.0 - e_a));
      change_b := round(k_b * (0.0 - e_b));
    else
      change_a := round(k_a * (0.0 - e_a));
      change_b := round(k_b * (1.0 - e_b));
    end if;

    new.elo_change_p1 := change_a;
    new.elo_change_p2 := change_b;

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

-- Aggiorna approve_correction: le amichevoli aggiornano solo i punteggi, mai l'Elo
create or replace function public.approve_correction(match_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m          record;
  p1_rating  integer;
  p2_rating  integer;
  p1_type    text;
  p2_type    text;
  set_item   jsonb;
  sets_p1    integer;
  sets_p2    integer;
  e_a        float;
  e_b        float;
  change_a   integer;
  change_b   integer;
  k_a        integer;
  k_b        integer;
begin
  select * into m from public.matches where id = match_id_param;

  if m.correction_status <> 'pending' then
    raise exception 'Nessuna correzione in attesa';
  end if;

  if m.correction_requested_by = (select auth.uid()) then
    raise exception 'Non puoi approvare la tua stessa richiesta';
  end if;

  if (select auth.uid()) <> m.player_1_id and (select auth.uid()) <> m.player_2_id then
    raise exception 'Non sei un giocatore di questo match';
  end if;

  if m.is_friendly then
    for set_item in select * from jsonb_array_elements(m.correction_sets)
    loop
      update public.sets
        set score_p1 = (set_item->>'score_p1')::integer,
            score_p2 = (set_item->>'score_p2')::integer
        where match_id = match_id_param
          and set_number = (set_item->>'set_number')::integer;
    end loop;

    update public.matches
      set correction_status       = 'approved',
          correction_requested_by = null,
          correction_sets         = null
      where id = match_id_param;

    return;
  end if;

  select player_type into p1_type from public.profiles where id = m.player_1_id;
  select player_type into p2_type from public.profiles where id = m.player_2_id;

  k_a := public.k_for_type(p1_type);
  k_b := public.k_for_type(p2_type);

  update public.profiles
    set elo_rating = greatest(0, elo_rating - m.elo_change_p1)
    where id = m.player_1_id;

  update public.profiles
    set elo_rating = greatest(0, elo_rating - m.elo_change_p2)
    where id = m.player_2_id;

  for set_item in select * from jsonb_array_elements(m.correction_sets)
  loop
    update public.sets
      set score_p1 = (set_item->>'score_p1')::integer,
          score_p2 = (set_item->>'score_p2')::integer
      where match_id = match_id_param
        and set_number = (set_item->>'set_number')::integer;
  end loop;

  select
    count(*) filter (where score_p1 > score_p2),
    count(*) filter (where score_p2 > score_p1)
  into sets_p1, sets_p2
  from public.sets
  where match_id = match_id_param;

  select elo_rating into p1_rating from public.profiles where id = m.player_1_id;
  select elo_rating into p2_rating from public.profiles where id = m.player_2_id;

  e_a := 1.0 / (1.0 + power(10.0, (p2_rating - p1_rating)::float / 400.0));
  e_b := 1.0 / (1.0 + power(10.0, (p1_rating - p2_rating)::float / 400.0));

  if sets_p1 > sets_p2 then
    change_a := round(k_a * (1.0 - e_a));
    change_b := round(k_b * (0.0 - e_b));
  else
    change_a := round(k_a * (0.0 - e_a));
    change_b := round(k_b * (1.0 - e_b));
  end if;

  update public.profiles
    set elo_rating = greatest(0, elo_rating + change_a)
    where id = m.player_1_id;

  update public.profiles
    set elo_rating = greatest(0, elo_rating + change_b)
    where id = m.player_2_id;

  update public.matches
    set elo_change_p1           = change_a,
        elo_change_p2           = change_b,
        correction_status       = 'approved',
        correction_requested_by = null,
        correction_sets         = null
    where id = match_id_param;
end;
$$;

-- =========================================================
-- 9. EVENTI (Battle Royale a edizioni, punti nel ranking)
-- =========================================================
-- Una SERIE (es. "Battle Royale") si ripete in EDIZIONI (#1, #2, ...).
-- Ogni edizione e' un girone secco: N giocatori fissi, tutti contro tutti.
-- Il piazzamento finale assegna punti al ranking globale; all'edizione
-- successiva della stessa serie quei punti si DIFENDONO (il nuovo risultato
-- sostituisce il precedente).
--
-- REGOLA D'ORO: questa sezione non tocca mai matches/sets, il trigger ELO
-- o le RPC di correzione. I punti evento vivono separati da profiles.elo_rating
-- e vengono sommati solo nella view public.ranking.

-- --- 9.1 TABELLE ---

create table if not exists public.event_series (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null default 'round_robin' check (format in ('round_robin')),
  default_points jsonb not null default '{"1":180,"2":120,"3":80,"4":45,"5":20,"6":10}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.event_series(id) on delete cascade,
  edition_number integer not null,
  name text not null,
  status text not null default 'open'
    check (status in ('open','in_progress','completed','cancelled')),
  participants_count integer not null default 6
    check (participants_count between 4 and 8),
  best_of integer not null default 5 check (best_of in (3,5)),
  ranking_points jsonb not null,
  registration_deadline timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique (series_id, edition_number)
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','withdrawn')),
  joined_at timestamptz default now(),
  unique (event_id, player_id)
);

create table if not exists public.event_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  player_1_id uuid not null references public.profiles(id) on delete cascade,
  player_2_id uuid not null references public.profiles(id) on delete cascade,
  position integer not null,
  created_at timestamptz default now(),
  unique (event_id, position)
);

-- Storico immutabile: alimenta sia il ranking (via player_series_points)
-- sia il palmares. Una riga per giocatore per edizione, scritta da close_event.
create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  series_id uuid not null references public.event_series(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  final_rank integer not null,
  ranking_points integer not null,
  awarded_at timestamptz default now(),
  unique (event_id, player_id)
);

-- Puntatore denormalizzato per il badge "evento" su MatchCard senza join extra.
-- Scritto dalla stessa RPC che aggancia lo slot (link_event_match).
alter table public.matches add column if not exists event_id uuid references public.events(id) on delete set null;
-- Se la sezione 9 era gia' stata applicata con il flag: le partite d'evento
-- sono sempre neutre, la colonna non serve piu'.
alter table public.events drop column if exists counts_for_elo;

create index if not exists idx_event_matches_event on public.event_matches(event_id);
create index if not exists idx_event_results_series on public.event_results(series_id, player_id);
create index if not exists idx_matches_event on public.matches(event_id);

-- --- 9.2 ROW LEVEL SECURITY ---

alter table public.event_series enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_matches enable row level security;
alter table public.event_results enable row level security;

drop policy if exists "Serie visibili a tutti" on public.event_series;
create policy "Serie visibili a tutti" on public.event_series for select to authenticated using (true);

drop policy if exists "Serie create da autenticati" on public.event_series;
create policy "Serie create da autenticati" on public.event_series for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Eventi visibili a tutti" on public.events;
create policy "Eventi visibili a tutti" on public.events for select to authenticated using (true);

drop policy if exists "Eventi creati dall'organizzatore" on public.events;
create policy "Eventi creati dall'organizzatore" on public.events for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Partecipanti visibili a tutti" on public.event_participants;
create policy "Partecipanti visibili a tutti" on public.event_participants for select to authenticated using (true);

-- Ci si candida solo per se stessi. Ogni altra scrittura passa dalle RPC.
drop policy if exists "Candidatura solo per se stessi" on public.event_participants;
create policy "Candidatura solo per se stessi" on public.event_participants for insert to authenticated
  with check ((select auth.uid()) = player_id);

drop policy if exists "Calendario visibile a tutti" on public.event_matches;
create policy "Calendario visibile a tutti" on public.event_matches for select to authenticated using (true);

drop policy if exists "Risultati visibili a tutti" on public.event_results;
create policy "Risultati visibili a tutti" on public.event_results for select to authenticated using (true);

-- --- 9.3 VIEW ---

-- I punti CORRENTI di un giocatore in una serie sono quelli della sua edizione
-- piu' recente: la "difesa" emerge dall'ordinamento, non da un UPDATE.
-- Cambiare la regola su chi salta un'edizione = cambiare questa WHERE.
create or replace view public.player_series_points
with (security_invoker = true) as
select distinct on (r.series_id, r.player_id)
       r.series_id,
       r.player_id,
       r.ranking_points,
       r.final_rank,
       r.event_id,
       e.edition_number
from public.event_results r
join public.events e on e.id = r.event_id
where e.status = 'completed'
order by r.series_id, r.player_id, e.edition_number desc;

-- Il ranking unico mostrato in app: ELO delle partite + punti evento correnti.
create or replace view public.ranking
with (security_invoker = true) as
select p.id,
       p.username,
       p.display_name,
       p.avatar_url,
       p.age,
       p.player_type,
       p.created_at,
       p.elo_rating,
       coalesce(sum(sp.ranking_points), 0)::int                      as event_points,
       (p.elo_rating + coalesce(sum(sp.ranking_points), 0))::int     as total_points
from public.profiles p
left join public.player_series_points sp on sp.player_id = p.id
group by p.id;

-- I trofei non si sostituiscono mai: memoria lunga, indipendente dal ranking.
create or replace view public.player_palmares
with (security_invoker = true) as
select r.player_id,
       count(*) filter (where r.final_rank = 1)::int as titles,
       count(*) filter (where r.final_rank = 2)::int as seconds,
       count(*) filter (where r.final_rank = 3)::int as thirds,
       count(*)::int                                 as editions_played
from public.event_results r
group by r.player_id;

-- --- 9.4 FUNZIONI ---

-- Preset punti per numero di giocatori. Il valore viene congelato
-- sull'edizione alla creazione: cambiare i preset non riscrive il passato.
create or replace function public.default_event_points(n integer)
returns jsonb
language plpgsql
immutable
as $$
begin
  -- Sempre esattamente n posizioni. La curva decade fino all'ultimo posto,
  -- che prende comunque una quota proporzionata invece di zero.
  if n = 4 then
    return '{"1":120,"2":70,"3":40,"4":20}'::jsonb;
  elsif n = 5 then
    return '{"1":140,"2":90,"3":55,"4":32,"5":16}'::jsonb;
  elsif n = 7 then
    return '{"1":200,"2":135,"3":90,"4":58,"5":35,"6":20,"7":10}'::jsonb;
  elsif n = 8 then
    return '{"1":220,"2":150,"3":100,"4":66,"5":42,"6":26,"7":15,"8":8}'::jsonb;
  else
    return '{"1":180,"2":120,"3":80,"4":45,"5":20,"6":10}'::jsonb;
  end if;
end;
$$;

-- Classifica del girone.
-- Tie-break: vittorie -> scontro diretto fra pari vittorie (classifica avulsa)
-- -> differenza set -> differenza punti -> ELO.
create or replace function public.event_standings(event_id_param uuid)
returns table (
  player_id uuid,
  rank_position integer,
  played integer,
  wins integer,
  losses integer,
  sets_won integer,
  sets_lost integer,
  set_diff integer,
  point_diff integer
)
language sql
stable
as $$
with played_matches as (
  select em.match_id, m.player_1_id, m.player_2_id
  from public.event_matches em
  join public.matches m on m.id = em.match_id
  where em.event_id = event_id_param and m.status = 'confirmed'
),
per_match as (
  select pm.match_id, pm.player_1_id, pm.player_2_id,
         count(*) filter (where s.score_p1 > s.score_p2)::int as sets_p1,
         count(*) filter (where s.score_p2 > s.score_p1)::int as sets_p2,
         coalesce(sum(s.score_p1), 0)::int as pts_p1,
         coalesce(sum(s.score_p2), 0)::int as pts_p2
  from played_matches pm
  join public.sets s on s.match_id = pm.match_id
  group by pm.match_id, pm.player_1_id, pm.player_2_id
),
sides as (
  select player_1_id as pid, player_2_id as opp,
         (case when sets_p1 > sets_p2 then 1 else 0 end) as win,
         sets_p1 as sw, sets_p2 as sl, pts_p1 as pf, pts_p2 as pa
  from per_match
  union all
  select player_2_id, player_1_id,
         (case when sets_p2 > sets_p1 then 1 else 0 end),
         sets_p2, sets_p1, pts_p2, pts_p1
  from per_match
),
agg as (
  select ep.player_id as pid,
         count(s.pid)::int                   as played,
         coalesce(sum(s.win), 0)::int        as wins,
         (count(s.pid) - coalesce(sum(s.win), 0))::int as losses,
         coalesce(sum(s.sw), 0)::int         as sets_won,
         coalesce(sum(s.sl), 0)::int         as sets_lost,
         coalesce(sum(s.pf), 0)::int         as pts_for,
         coalesce(sum(s.pa), 0)::int         as pts_against
  from public.event_participants ep
  left join sides s on s.pid = ep.player_id
  where ep.event_id = event_id_param and ep.status = 'accepted'
  group by ep.player_id
),
h2h as (
  select s.pid, count(*)::int as h2h_wins
  from sides s
  join agg a_self on a_self.pid = s.pid
  join agg a_opp  on a_opp.pid = s.opp
  where s.win = 1 and a_self.wins = a_opp.wins
  group by s.pid
)
select a.pid,
       row_number() over (
         order by a.wins desc,
                  coalesce(h.h2h_wins, 0) desc,
                  (a.sets_won - a.sets_lost) desc,
                  (a.pts_for - a.pts_against) desc,
                  p.elo_rating desc
       )::int,
       a.played, a.wins, a.losses, a.sets_won, a.sets_lost,
       (a.sets_won - a.sets_lost)::int,
       (a.pts_for - a.pts_against)::int
from agg a
join public.profiles p on p.id = a.pid
left join h2h h on h.pid = a.pid;
$$;

-- Crea una serie se non esiste e ne restituisce l'id.
create or replace function public.ensure_event_series(series_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
begin
  select id into sid from public.event_series where name = series_name limit 1;
  if sid is null then
    insert into public.event_series (name, created_by)
    values (series_name, auth.uid())
    returning id into sid;
  end if;
  return sid;
end;
$$;

-- Crea una nuova edizione di una serie e iscrive l'organizzatore.
-- La firma e' cambiata (via counts_for_elo): il drop evita un overload.
drop function if exists public.create_event(text, text, integer, integer, boolean, jsonb, timestamptz);

create or replace function public.create_event(
  series_name text,
  event_name text,
  participants_count_param integer default 6,
  best_of_param integer default 5,
  points_param jsonb default null,
  deadline_param timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
  next_edition integer;
  new_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  sid := public.ensure_event_series(series_name);

  select coalesce(max(edition_number), 0) + 1 into next_edition
  from public.events where series_id = sid;

  insert into public.events (
    series_id, edition_number, name, status, participants_count,
    best_of, ranking_points, registration_deadline, created_by
  ) values (
    sid, next_edition, event_name, 'open', participants_count_param,
    best_of_param,
    coalesce(points_param, public.default_event_points(participants_count_param)),
    deadline_param, auth.uid()
  ) returning id into new_event_id;

  insert into public.event_participants (event_id, player_id, status)
  values (new_event_id, auth.uid(), 'accepted');

  return new_event_id;
end;
$$;

-- Le prime versioni di questa sezione inserivano le iscrizioni come 'pending',
-- in attesa dell'approvazione dell'organizzatore. Da quando l'iscrizione e'
-- diretta quello stato non esiste piu': chi era rimasto in mezzo va promosso,
-- altrimenti resta invisibile ai conteggi e non c'e' piu' modo di approvarlo.
update public.event_participants set status = 'accepted' where status = 'pending';

-- Iscrizione diretta: chi si iscrive entra subito, senza approvazione.
-- L'unico cancello sono i posti disponibili e lo stato dell'evento.
create or replace function public.apply_to_event(event_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events%rowtype;
  accepted_count integer;
begin
  select * into ev from public.events where id = event_id_param;
  if not found then raise exception 'Evento non trovato'; end if;
  if ev.status <> 'open' then raise exception 'Le iscrizioni sono chiuse'; end if;

  select count(*) into accepted_count
  from public.event_participants
  where event_id = event_id_param and status = 'accepted';

  if accepted_count >= ev.participants_count then
    raise exception 'Non ci sono piu'' posti disponibili';
  end if;

  insert into public.event_participants (event_id, player_id, status)
  values (event_id_param, auth.uid(), 'accepted')
  on conflict (event_id, player_id) do update set status = 'accepted';
end;
$$;

-- Disiscrizione. Solo a iscrizioni ancora aperte: dopo la generazione del
-- calendario uscire lascerebbe il girone con partite impossibili da giocare.
-- Lo stato 'withdrawn' tiene traccia del passaggio e l'upsert di apply_to_event
-- permette di rientrare senza intoppi.
create or replace function public.leave_event(event_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events%rowtype;
begin
  select * into ev from public.events where id = event_id_param;
  if not found then raise exception 'Evento non trovato'; end if;
  if ev.status <> 'open' then
    raise exception 'L''evento e'' gia'' partito: non puoi piu'' uscire';
  end if;

  update public.event_participants
     set status = 'withdrawn'
   where event_id = event_id_param
     and player_id = auth.uid()
     and status = 'accepted';

  if not found then raise exception 'Non sei iscritto a questo evento'; end if;
end;
$$;

-- L'approvazione delle candidature non esiste piu': l'iscrizione e' diretta.
-- Il drop serve a ripulire i database dove la sezione 9 era gia' stata applicata.
drop function if exists public.respond_to_application(uuid, boolean);

-- L'avvio automatico a rosa piena e' stato abbandonato: chiudere le iscrizioni
-- resta una decisione dell'organizzatore. I drop ripuliscono i database dove
-- quella versione era gia' stata applicata.
drop trigger if exists on_event_roster_full on public.event_participants;
drop function if exists public.auto_begin_event();
drop function if exists public.begin_event(uuid);

-- Chiude le iscrizioni e genera tutti gli accoppiamenti del girone.
-- La decide l'organizzatore, anche con una rosa incompleta (minimo 4).
create or replace function public.start_event(event_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events%rowtype;
  roster uuid[];
  n integer;
  i integer;
  j integer;
  pos integer := 1;
begin
  select * into ev from public.events where id = event_id_param;
  if not found then raise exception 'Evento non trovato'; end if;
  if ev.created_by <> auth.uid() then
    raise exception 'Solo l''organizzatore puo'' avviare l''evento';
  end if;
  if ev.status <> 'open' then raise exception 'L''evento e'' gia'' stato avviato'; end if;

  select array_agg(player_id order by joined_at) into roster
  from public.event_participants
  where event_id = event_id_param and status = 'accepted';

  n := coalesce(array_length(roster, 1), 0);
  if n < 4 then
    raise exception 'Servono almeno 4 giocatori per avviare l''evento';
  end if;

  -- Girone all'italiana: tutte le coppie, una sola volta.
  for i in 1..n - 1 loop
    for j in i + 1..n loop
      insert into public.event_matches (event_id, player_1_id, player_2_id, position)
      values (event_id_param, roster[i], roster[j], pos);
      pos := pos + 1;
    end loop;
  end loop;

  update public.events
     set status = 'in_progress',
         participants_count = n,
         started_at = now()
   where id = event_id_param;
end;
$$;

-- Aggancia una partita gia' registrata al suo slot di calendario.
create or replace function public.link_event_match(
  event_match_id_param uuid,
  match_id_param uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot public.event_matches%rowtype;
  m public.matches%rowtype;
begin
  select * into slot from public.event_matches where id = event_match_id_param;
  if not found then raise exception 'Slot non trovato'; end if;
  if slot.match_id is not null then raise exception 'Questa partita e'' gia'' stata registrata'; end if;

  select * into m from public.matches where id = match_id_param;
  if not found then raise exception 'Match non trovato'; end if;

  if not ((m.player_1_id = slot.player_1_id and m.player_2_id = slot.player_2_id)
       or (m.player_1_id = slot.player_2_id and m.player_2_id = slot.player_1_id)) then
    raise exception 'I giocatori non corrispondono allo slot';
  end if;

  update public.event_matches set match_id = match_id_param where id = event_match_id_param;
  update public.matches set event_id = slot.event_id where id = match_id_param;
end;
$$;

-- Rifiuto di una registrazione dentro un evento.
-- Dentro un girone "contestato" non puo' essere uno stato finale: bloccherebbe
-- per sempre la chiusura dell'edizione. Qui rifiutare significa annullare la
-- registrazione e liberare lo slot, cosi' il punteggio si puo' reinserire.
create or replace function public.reject_event_match(event_match_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot public.event_matches%rowtype;
  m public.matches%rowtype;
begin
  select * into slot from public.event_matches where id = event_match_id_param;
  if not found then raise exception 'Slot non trovato'; end if;
  if slot.match_id is null then raise exception 'Non c''e'' nessun risultato da rifiutare'; end if;

  select * into m from public.matches where id = slot.match_id;
  if not found then raise exception 'Match non trovato'; end if;
  if m.status <> 'pending' then
    raise exception 'Il risultato e'' gia'' stato confermato';
  end if;
  if auth.uid() <> m.player_1_id and auth.uid() <> m.player_2_id then
    raise exception 'Non sei un giocatore di questa partita';
  end if;

  update public.event_matches set match_id = null where id = event_match_id_param;
  -- i set spariscono in cascata con il match
  delete from public.matches where id = m.id;
end;
$$;

-- Congela la classifica finale e assegna i punti al ranking.
-- I punti NON vengono sommati a profiles.elo_rating: la sostituzione
-- (difesa) emerge dalla view player_series_points.
--
-- Non ha controlli di identita' perche' non la chiama una persona: scatta da
-- sola quando l'ultima partita del girone viene confermata (vedi il trigger
-- piu' sotto).
create or replace function public.finalize_event(event_id_param uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events%rowtype;
  total_slots integer;
  played_slots integer;
  row_rec record;
begin
  select * into ev from public.events where id = event_id_param;
  if not found then raise exception 'Evento non trovato'; end if;
  if ev.status <> 'in_progress' then return; end if;

  select count(*) into total_slots from public.event_matches where event_id = event_id_param;
  select count(*) into played_slots
  from public.event_matches em
  join public.matches m on m.id = em.match_id
  where em.event_id = event_id_param and m.status = 'confirmed';

  if total_slots = 0 or played_slots < total_slots then
    return;
  end if;

  for row_rec in select * from public.event_standings(event_id_param) loop
    insert into public.event_results (event_id, series_id, player_id, final_rank, ranking_points)
    values (
      event_id_param,
      ev.series_id,
      row_rec.player_id,
      row_rec.rank_position,
      coalesce((ev.ranking_points ->> row_rec.rank_position::text)::integer, 0)
    )
    on conflict (event_id, player_id) do update
      set final_rank = excluded.final_rank,
          ranking_points = excluded.ranking_points,
          awarded_at = now();
  end loop;

  update public.events
     set status = 'completed', completed_at = now()
   where id = event_id_param;
end;
$$;

-- La chiusura manuale non esiste piu': l'edizione si conclude da sola.
drop function if exists public.close_event(uuid);

-- Quando l'ultima partita del girone viene confermata, l'edizione si chiude
-- e i punti vengono assegnati. Deve essere AFTER UPDATE: finalize_event
-- riconta le partite confermate e questa riga deve gia' esserlo.
create or replace function public.auto_finalize_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_id is null then return null; end if;
  if new.status <> 'confirmed' or coalesce(old.status, '') = 'confirmed' then
    return null;
  end if;

  perform public.finalize_event(new.event_id);
  return null;
end;
$$;

drop trigger if exists on_event_match_confirmed on public.matches;
create trigger on_event_match_confirmed
  after update on public.matches
  for each row execute procedure public.auto_finalize_event();
