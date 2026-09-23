-- link_event_match accettava un risultato a prescindere dallo stato
-- dell'edizione: si poteva agganciare una partita a un'edizione conclusa o
-- annullata.
--
-- Il controllo lato UI non basta. L'app e' una SPA su Netlify: chi ha gia'
-- la schermata aperta continua a usare il bundle precedente anche dopo il
-- deploy. Se l'organizzatore annulla un'edizione mentre qualcuno ha il
-- dettaglio aperto, quel bundle mostra ancora i bottoni "Registra" e la
-- chiamata passerebbe. Il rifiuto deve arrivare dal database.
--
-- Unica differenza rispetto alla versione precedente: il blocco che legge
-- l'evento e pretende status = 'in_progress'. Tutto il resto e' invariato.

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
  ev public.events%rowtype;
begin
  select * into slot from public.event_matches where id = event_match_id_param;
  if not found then raise exception 'Slot non trovato'; end if;
  if slot.match_id is not null then raise exception 'Questa partita e'' gia'' stata registrata'; end if;

  select * into ev from public.events where id = slot.event_id;
  if not found then raise exception 'Evento non trovato'; end if;
  if ev.status <> 'in_progress' then
    raise exception 'Questa edizione non accetta risultati';
  end if;

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
