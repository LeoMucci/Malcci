-- Migração: adiciona a coluna de url de foto de perfil (avatar) de cada usuário.
-- Rode no Supabase: SQL Editor > New query > cole > Run. É idempotente.

alter table public.users add column if not exists avatar_url text;
