-- Classifica pubblica: leggibile anche da chi non ha fatto login (pagina
-- /ranking, incorporabile nella bacheca della community).
--
-- La vista `ranking` e' security_invoker e `event_results` e' visibile solo
-- agli autenticati: letta da anon darebbe punti evento sempre a 0. Questa
-- funzione gira come owner, calcola il ranking completo e restituisce solo
-- le colonne da mostrare (niente eta', niente data di iscrizione).
--
-- Ogni giocatore puo' toglersi dalla classifica pubblica dal proprio profilo:
-- resta comunque visibile nella classifica interna agli iscritti.

alter table public.profiles
  add column if not exists show_in_public_ranking boolean not null default true;

create or replace function public.get_public_ranking()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  player_type text,
  elo_rating integer,
  event_points integer,
  total_points integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.player_type,
    p.elo_rating,
    coalesce(sum(sp.ranking_points), 0)::integer as event_points,
    (p.elo_rating + coalesce(sum(sp.ranking_points), 0))::integer as total_points
  from public.profiles p
  left join public.player_series_points sp on sp.player_id = p.id
  where p.show_in_public_ranking
  group by p.id
  order by total_points desc, p.elo_rating desc;
$$;

revoke execute on function public.get_public_ranking() from public;
grant execute on function public.get_public_ranking() to anon, authenticated;
