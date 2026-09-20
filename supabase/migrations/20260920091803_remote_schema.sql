SET local check_function_bodies = off;

CREATE TABLE "public"."event_matches" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"    uuid                     NOT NULL,
  "match_id"    uuid,
  "player_1_id" uuid                     NOT NULL,
  "player_2_id" uuid                     NOT NULL,
  "position"    integer                  NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "event_matches_event_id_position_key" UNIQUE (event_id, "position"),
  CONSTRAINT "event_matches_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."event_matches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event_participants" (
  "id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"  uuid                     NOT NULL,
  "player_id" uuid                     NOT NULL,
  "status"    text                     NOT NULL DEFAULT 'pending'::text,
  "joined_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "event_participants_event_id_player_id_key" UNIQUE (event_id, player_id),
  CONSTRAINT "event_participants_pkey" PRIMARY KEY (id),
  CONSTRAINT "event_participants_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'withdrawn'::text])))
);

ALTER TABLE "public"."event_participants"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event_results" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"       uuid                     NOT NULL,
  "series_id"      uuid                     NOT NULL,
  "player_id"      uuid                     NOT NULL,
  "final_rank"     integer                  NOT NULL,
  "ranking_points" integer                  NOT NULL,
  "awarded_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "event_results_event_id_player_id_key" UNIQUE (event_id, player_id),
  CONSTRAINT "event_results_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."event_results"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event_series" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"           text                     NOT NULL,
  "format"         text                     NOT NULL DEFAULT 'round_robin'::text,
  "default_points" jsonb                    NOT NULL DEFAULT '{"1": 180, "2": 120, "3": 80, "4": 45, "5": 20, "6": 0}'::jsonb,
  "created_by"     uuid,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "event_series_format_check" CHECK ((format = 'round_robin'::text)),
  CONSTRAINT "event_series_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."event_series"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."events" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "series_id"             uuid                     NOT NULL,
  "edition_number"        integer                  NOT NULL,
  "name"                  text                     NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'open'::text,
  "participants_count"    integer                  NOT NULL DEFAULT 6,
  "best_of"               integer                  NOT NULL DEFAULT 5,
  "ranking_points"        jsonb                    NOT NULL,
  "registration_deadline" timestamp with time zone,
  "started_at"            timestamp with time zone,
  "completed_at"          timestamp with time zone,
  "created_by"            uuid,
  "created_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "events_best_of_check" CHECK ((best_of = ANY (ARRAY[3, 5]))),
  CONSTRAINT "events_participants_count_check" CHECK (((participants_count >= 4) AND (participants_count <= 8))),
  CONSTRAINT "events_pkey" PRIMARY KEY (id),
  CONSTRAINT "events_series_id_edition_number_key" UNIQUE (series_id, edition_number),
  CONSTRAINT "events_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."matches" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_by"              uuid,
  "player_1_id"             uuid                     NOT NULL,
  "player_2_id"             uuid                     NOT NULL,
  "best_of"                 integer                  NOT NULL,
  "status"                  text                     NOT NULL DEFAULT 'pending'::text,
  "elo_change_p1"           integer,
  "elo_change_p2"           integer,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "correction_requested_by" uuid,
  "correction_sets"         jsonb,
  "correction_status"       text,
  "player_1_confirmed"      boolean                  NOT NULL DEFAULT false,
  "player_2_confirmed"      boolean                  NOT NULL DEFAULT false,
  "is_friendly"             boolean                  NOT NULL DEFAULT false,
  "event_id"                uuid,
  CONSTRAINT "matches_best_of_check" CHECK ((best_of = ANY (ARRAY[3, 5]))),
  CONSTRAINT "matches_correction_status_check" CHECK ((correction_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT "matches_pkey" PRIMARY KEY (id),
  CONSTRAINT "matches_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'disputed'::text])))
);

ALTER TABLE "public"."matches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"           uuid                     NOT NULL,
  "username"     text                     NOT NULL,
  "display_name" text                     NOT NULL,
  "avatar_url"   text,
  "age"          integer,
  "player_type"  text                     NOT NULL DEFAULT 'amateur'::text,
  "elo_rating"   integer                  NOT NULL DEFAULT 1000,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_player_type_check" CHECK ((player_type = ANY (ARRAY['amateur'::text, 'competitive'::text, 'student'::text]))),
  CONSTRAINT "profiles_username_key" UNIQUE (username)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sets" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "match_id"   uuid                     NOT NULL,
  "set_number" integer                  NOT NULL,
  "score_p1"   integer                  NOT NULL,
  "score_p2"   integer                  NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sets_match_id_set_number_key" UNIQUE (match_id, set_number),
  CONSTRAINT "sets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."sets"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.apply_to_event (
  event_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.approve_correction (
  match_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.auto_finalize_event()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.event_id is null then return null; end if;
  if new.status <> 'confirmed' or coalesce(old.status, '') = 'confirmed' then
    return null;
  end if;

  perform public.finalize_event(new.event_id);
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_elo_on_confirm()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.confirm_match_player (
  match_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  DECLARE m record;
  BEGIN
    SELECT * INTO m FROM public.matches WHERE id = match_id_param;
    IF m.status != 'pending' THEN RAISE EXCEPTION 'Il match non è in stato pending'; END IF;
    IF (select auth.uid()) = m.player_1_id THEN
      UPDATE public.matches SET player_1_confirmed = true WHERE id = match_id_param;
    ELSIF (select auth.uid()) = m.player_2_id THEN
      UPDATE public.matches SET player_2_confirmed = true WHERE id = match_id_param;
    ELSE RAISE EXCEPTION 'Non sei un giocatore di questo match'; END IF;
    SELECT * INTO m FROM public.matches WHERE id = match_id_param;
    IF m.player_1_confirmed AND m.player_2_confirmed THEN
      UPDATE public.matches SET status = 'confirmed' WHERE id = match_id_param;
    END IF;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.create_event (
  series_name              text,
  event_name               text,
  participants_count_param integer                  DEFAULT 6,
  best_of_param            integer                  DEFAULT 5,
  points_param             jsonb                    DEFAULT NULL::jsonb,
  deadline_param           timestamp with time zone DEFAULT NULL::timestamp WITH time zone
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.default_event_points (
  n integer
)
  RETURNS jsonb
  LANGUAGE plpgsql
  IMMUTABLE
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.ensure_event_series (
  series_name text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.event_standings (
  event_id_param uuid
)
  RETURNS TABLE (
    player_id     uuid,
    rank_position integer,
    played        integer,
    wins          integer,
    losses        integer,
    sets_won      integer,
    sets_lost     integer,
    set_diff      integer,
    point_diff    integer
  )
  LANGUAGE sql
  STABLE
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.finalize_event (
  event_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_email_by_username (
  p_username text
)
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.k_for_type (
  ptype text
)
  RETURNS integer
  LANGUAGE plpgsql
  IMMUTABLE
  AS $function$
  begin
    if ptype = 'competitive' then return 24;
    elsif ptype = 'student'     then return 48;
    else                             return 32;
    end if;
  end;
  $function$;

CREATE OR REPLACE FUNCTION public.leave_event (
  event_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.link_event_match (
  event_match_id_param uuid,
  match_id_param       uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reject_correction (
  match_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.matches
    set correction_status       = 'rejected',
        correction_requested_by = null,
        correction_sets         = null
    where id = match_id_param
      and correction_status = 'pending'
      and (player_1_id = (select auth.uid()) or player_2_id = (select auth.uid()));
end;
$function$;

CREATE OR REPLACE FUNCTION public.reject_event_match (
  event_match_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.request_correction (
  match_id_param uuid,
  new_sets       jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.start_event (
  event_id_param uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

ALTER TABLE "public"."event_results"
  ADD CONSTRAINT "event_results_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_matches"
  ADD CONSTRAINT "event_matches_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_participants"
  ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_results"
  ADD CONSTRAINT "event_results_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE;

ALTER TABLE "public"."matches"
  ADD CONSTRAINT "matches_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE "public"."event_matches"
  ADD CONSTRAINT "event_matches_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_matches"
  ADD CONSTRAINT "event_matches_player_1_id_fkey" FOREIGN KEY (player_1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_matches"
  ADD CONSTRAINT "event_matches_player_2_id_fkey" FOREIGN KEY (player_2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_participants"
  ADD CONSTRAINT "event_participants_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_results"
  ADD CONSTRAINT "event_results_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_series"
  ADD CONSTRAINT "event_series_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."matches"
  ADD CONSTRAINT "matches_correction_requested_by_fkey" FOREIGN KEY (correction_requested_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."matches"
  ADD CONSTRAINT "matches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."matches"
  ADD CONSTRAINT "matches_player_1_id_fkey" FOREIGN KEY (player_1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."matches"
  ADD CONSTRAINT "matches_player_2_id_fkey" FOREIGN KEY (player_2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."sets"
  ADD CONSTRAINT "sets_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

CREATE VIEW "public"."player_palmares" WITH (security_invoker=true) AS  SELECT player_id,
    (count(*) FILTER (WHERE (final_rank = 1)))::integer AS titles,
    (count(*) FILTER (WHERE (final_rank = 2)))::integer AS seconds,
    (count(*) FILTER (WHERE (final_rank = 3)))::integer AS thirds,
    (count(*))::integer AS editions_played
   FROM public.event_results r
  GROUP BY player_id;

CREATE VIEW "public"."player_series_points" WITH (security_invoker=true) AS  SELECT DISTINCT ON (r.series_id, r.player_id) r.series_id,
    r.player_id,
    r.ranking_points,
    r.final_rank,
    r.event_id,
    e.edition_number
   FROM (public.event_results r
     JOIN public.events e ON ((e.id = r.event_id)))
  WHERE (e.status = 'completed'::text)
  ORDER BY r.series_id, r.player_id, e.edition_number DESC;

CREATE VIEW "public"."ranking" WITH (security_invoker=true) AS  SELECT p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.age,
    p.player_type,
    p.created_at,
    p.elo_rating,
    (COALESCE(sum(sp.ranking_points), (0)::bigint))::integer AS event_points,
    ((p.elo_rating + COALESCE(sum(sp.ranking_points), (0)::bigint)))::integer AS total_points
   FROM (public.profiles p
     LEFT JOIN public.player_series_points sp ON ((sp.player_id = p.id)))
  GROUP BY p.id;

CREATE INDEX idx_event_matches_event ON public.event_matches USING btree (event_id);

CREATE INDEX idx_event_results_series ON public.event_results USING btree (series_id, player_id);

CREATE INDEX idx_matches_event ON public.matches USING btree (event_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_event_match_confirmed
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_finalize_event();

CREATE TRIGGER on_match_confirmed
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_elo_on_confirm();

CREATE POLICY "Calendario visibile a tutti" ON "public"."event_matches"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Candidatura solo per se stessi" ON "public"."event_participants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = player_id));

CREATE POLICY "Partecipanti visibili a tutti" ON "public"."event_participants"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Risultati visibili a tutti" ON "public"."event_results"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Serie create da autenticati" ON "public"."event_series"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = created_by));

CREATE POLICY "Serie visibili a tutti" ON "public"."event_series"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Eventi creati dall'organizzatore" ON "public"."events"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = created_by));

CREATE POLICY "Eventi visibili a tutti" ON "public"."events"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can create matches" ON "public"."matches"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = created_by));

CREATE POLICY "Authenticated users can view matches" ON "public"."matches"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Players can update their own matches" ON "public"."matches"
  FOR UPDATE
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = player_1_id) OR (( SELECT auth.uid() AS uid) = player_2_id)));

CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can insert their own profile" ON "public"."profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Users can update their own profile" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Authenticated users can view sets" ON "public"."sets"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Match creator can insert sets" ON "public"."sets"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = sets.match_id) AND (matches.created_by = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Players can update sets of their matches" ON "public"."sets"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = sets.match_id) AND ((( SELECT auth.uid() AS uid) = matches.player_1_id) OR (( SELECT auth.uid() AS uid) = matches.player_2_id))))));

GRANT EXECUTE ON FUNCTION "public"."apply_to_event"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."approve_correction"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."auto_finalize_event"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."calculate_elo_on_confirm"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."confirm_match_player"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."create_event"(text, text, integer, integer, jsonb, timestamp WITH time zone) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."default_event_points"(integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."ensure_event_series"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."event_standings"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."finalize_event"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_email_by_username"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."k_for_type"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."leave_event"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."link_event_match"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reject_correction"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reject_event_match"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."request_correction"(uuid, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."start_event"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_matches" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_participants" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_results" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_series" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."matches" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."player_palmares" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."player_series_points" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ranking" TO "anon", "authenticated", "postgres", "service_role";

