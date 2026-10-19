-- I profili (nome e cognome, eta') sono leggibili solo da chi ha fatto login.
--
-- Prima la policy di lettura era `to public`: con la sola chiave pubblica
-- dell'app chiunque poteva leggere via API tutti i profili, anche se la
-- classifica pubblica (/ranking) mostra di proposito solo gli username.
--
-- Nessun flusso da non loggati legge `profiles`:
--   - /ranking passa da get_public_ranking() (security definer);
--   - la registrazione crea il profilo con handle_new_user() (security
--     definer) e lo rilegge con la sessione gia' attiva (conferma email
--     disattivata);
--   - login e sessione leggono il profilo da autenticati.

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;

create policy "Profiles are viewable by authenticated users" on public.profiles
  for select
  to authenticated
  using (true);

-- anon non ha piu' alcun motivo di toccare la tabella: le scritture erano
-- gia' bloccate dalle policy (auth.uid() e' null), ora anche dai privilegi.
revoke all on table public.profiles from anon;
