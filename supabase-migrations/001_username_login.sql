-- ============================================================
-- Migration 001: login tramite username
-- Esegui nel SQL Editor del progetto Supabase (dev e prod).
-- ============================================================

-- Restituisce l'email associata a un username.
-- Usata dal client per risolvere username → email prima del login.
-- SECURITY DEFINER: accede a auth.users senza esporlo come colonna pubblica.
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = ''
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;
