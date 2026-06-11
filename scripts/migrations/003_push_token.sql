-- Migração: guarda o token de push de cada usuário (para notificações no celular).
-- Rode no Supabase: SQL Editor > New query > cole > Run. É idempotente.

alter table public.users add column if not exists push_token text;
