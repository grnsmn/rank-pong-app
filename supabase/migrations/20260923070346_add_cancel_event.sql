-- Annullamento di un'edizione, a cura dell'organizzatore.
--
-- Lo stato 'cancelled' esiste gia' nella CHECK constraint di events.status
-- dalla sezione 9: qui si aggiunge soltanto chi lo scrive. Nessuna modifica
-- di tabella, nessun dato esistente toccato.
--
-- Non c'e' niente da stornare:
--   * le partite d'evento nascono con is_friendly = true, quindi non hanno
--     mai mosso profiles.elo_rating;
--   * event_results viene scritto solo da finalize_event nel passaggio
--     in_progress -> completed, che per un'edizione annullata non avviene.
-- Un'edizione annullata sparisce quindi dal ranking da sola, perche'
-- player_series_points filtra su status = 'completed'.
--
-- Le partite gia' giocate restano dove sono: sono partite realmente
-- disputate, sono ELO-neutre e restano consultabili dentro l'edizione.

create or replace function public.cancel_event(event_id_param uuid)
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

  if ev.created_by <> auth.uid() then
    raise exception 'Solo l''organizzatore puo'' annullare l''evento';
  end if;

  -- Gia' annullato: niente da fare. Rende la chiamata ripetibile senza errori
  -- se due schede della stessa persona premono il bottone.
  if ev.status = 'cancelled' then return; end if;

  -- Da 'completed' no: i punti sono gia' in classifica e toglierli e' un'altra
  -- operazione, che andrebbe pensata insieme alla difesa della serie.
  if ev.status = 'completed' then
    raise exception 'Un''edizione conclusa non si puo'' annullare: i punti sono gia'' assegnati';
  end if;

  update public.events set status = 'cancelled' where id = event_id_param;
end;
$$;
