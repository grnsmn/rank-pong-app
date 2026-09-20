-- Rimuove public.get_email_by_username(text).
--
-- Funzione rimasta da un tentativo incompiuto di login tramite username.
-- Presente solo su DEV: su PROD non e' mai stata creata, quindi la' questa
-- migration e' un no-op. Nessun punto dell'app la chiama.
--
-- Perche' va rimossa: era SECURITY DEFINER con GRANT EXECUTE ad anon e PUBLIC,
-- e leggeva auth.users.email. Un chiamante non autenticato poteva quindi
-- convertire uno username (pubblico: la leaderboard li mostra) nell'indirizzo
-- email del proprietario.
--
-- Il login tramite username verra' reimplementato passando da una Edge Function
-- che risolve l'email lato server e restituisce solo la sessione, mai l'indirizzo.

drop function if exists public.get_email_by_username(text);
