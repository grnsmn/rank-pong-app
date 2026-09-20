-- Allinea il default di event_series.default_points al valore di PROD.
--
-- I due ambienti erano divergenti sul punteggio del sesto posto:
--   DEV : {"1":180, "2":120, "3":80, "4":45, "5":20, "6":0}
--   PROD: {"1":180, "2":120, "3":80, "4":45, "5":20, "6":10}
-- PROD e' il comportamento corretto, quindi si allinea DEV.
--
-- Su PROD questa migration e' un no-op: il default e' gia' questo.
--
-- Cambia SOLO il default della colonna, che vale per le serie create da qui in
-- avanti. Le righe gia' esistenti conservano il proprio valore e non vengono
-- toccate: su PROD sono dati di gioco reali e non vanno riscritti da una
-- migration di schema.

alter table public.event_series
  alter column default_points
  set default '{"1": 180, "2": 120, "3": 80, "4": 45, "5": 20, "6": 10}'::jsonb;
