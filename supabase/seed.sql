-- ============================================================
-- RankPong — seed for the LOCAL Supabase stack only
-- ============================================================
-- Loaded automatically by `supabase start` (first boot) and by
-- `supabase db reset --local`. Never run against a remote project.
--
-- Test accounts (all share the password `password123`):
--   alice@rankpong.test   alice   competitive
--   bob@rankpong.test     bob     amateur
--   carla@rankpong.test   carla   student
--   dario@rankpong.test   dario   amateur
-- ============================================================

-- 1. Auth users. The on_auth_user_created trigger creates the matching
--    public.profiles rows from raw_user_meta_data.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', u.username, 'display_name', u.display_name,
                     'age', u.age, 'player_type', u.player_type),
  now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alice@rankpong.test', 'alice', 'Alice Rossi',   29, 'competitive'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'bob@rankpong.test',   'bob',   'Bob Bianchi',   34, 'amateur'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'carla@rankpong.test', 'carla', 'Carla Verdi',   21, 'student'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'dario@rankpong.test', 'dario', 'Dario Neri',    41, 'amateur')
) as u(id, email, username, display_name, age, player_type);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@rankpong.test';

-- 2. Matches. Inserted as pending with their sets, then flipped to confirmed
--    so the real calculate_elo_on_confirm trigger computes the Elo changes.
insert into public.matches (id, created_by, player_1_id, player_2_id, best_of, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 3, now() - interval '6 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 5, now() - interval '4 days'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 3, now() - interval '2 days'),
  -- Left pending: alice must still confirm it (exercises the Matches badge).
  ('aaaaaaaa-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 3, now() - interval '1 hour');

insert into public.sets (match_id, set_number, score_p1, score_p2) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, 11, 7),
  ('aaaaaaaa-0000-0000-0000-000000000001', 2, 9, 11),
  ('aaaaaaaa-0000-0000-0000-000000000001', 3, 11, 8),
  ('aaaaaaaa-0000-0000-0000-000000000002', 1, 11, 5),
  ('aaaaaaaa-0000-0000-0000-000000000002', 2, 11, 9),
  ('aaaaaaaa-0000-0000-0000-000000000002', 3, 12, 10),
  ('aaaaaaaa-0000-0000-0000-000000000003', 1, 8, 11),
  ('aaaaaaaa-0000-0000-0000-000000000003', 2, 11, 6),
  ('aaaaaaaa-0000-0000-0000-000000000003', 3, 7, 11),
  ('aaaaaaaa-0000-0000-0000-000000000004', 1, 11, 9),
  ('aaaaaaaa-0000-0000-0000-000000000004', 2, 11, 4);

update public.matches
   set player_1_confirmed = true, player_2_confirmed = true, status = 'confirmed'
 where id in ('aaaaaaaa-0000-0000-0000-000000000001',
              'aaaaaaaa-0000-0000-0000-000000000002',
              'aaaaaaaa-0000-0000-0000-000000000003');

update public.matches
   set player_1_confirmed = true
 where id = 'aaaaaaaa-0000-0000-0000-000000000004';
