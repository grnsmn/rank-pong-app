-- La classifica pubblica mostra solo gli username: nome e cognome restano
-- visibili agli iscritti, ma la RPC letta da anon non li restituisce piu'.
--
-- Cambia il tipo di ritorno, quindi `create or replace` non basta: si
-- ricrea la funzione. Nessun frontend in produzione la usa ancora (arriva
-- con la stessa release della pagina /ranking).

drop function if exists public.get_public_ranking();

create function public.get_public_ranking()
returns table (
  id uuid,
  username text,
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
