-- Migração: cria as tabelas de Enquetes (faltavam no banco).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Idempotente.

create table if not exists public.polls (
  id          bigint generated always as identity primary key,
  question    text   not null,
  created_by  bigint references public.users (id),
  created_at  timestamptz not null default now()
);

create table if not exists public.poll_options (
  id       bigint generated always as identity primary key,
  poll_id  bigint not null references public.polls (id) on delete cascade,
  option   text   not null
);

create table if not exists public.poll_votes (
  id         bigint generated always as identity primary key,
  poll_id    bigint not null references public.polls (id) on delete cascade,
  option_id  bigint not null references public.poll_options (id) on delete cascade,
  user_id    bigint references public.users (id),
  created_at timestamptz not null default now()
);

create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);
create index if not exists poll_votes_poll_id_idx   on public.poll_votes (poll_id);

-- O app acessa com a anon key (mesmo modelo das outras tabelas): RLS desligado.
alter table public.polls        disable row level security;
alter table public.poll_options disable row level security;
alter table public.poll_votes   disable row level security;

-- Liga o Realtime nessas tabelas.
do $$
begin
  alter publication supabase_realtime add table public.polls, public.poll_options, public.poll_votes;
exception when others then null;
end $$;
