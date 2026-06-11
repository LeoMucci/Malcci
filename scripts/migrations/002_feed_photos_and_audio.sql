-- Migração: feed estilo Instagram (múltiplas fotos) + música tocável.
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole tudo > Run.
-- É idempotente — pode rodar mais de uma vez sem problema.

-- 1) Várias fotos por memória (carrossel). A primeira (menor position) é a capa
--    e continua espelhada em memories.photo_url para galeria/mapa/timeline.
create table if not exists public.memory_photos (
  id          bigint generated always as identity primary key,
  memory_id   bigint not null references public.memories (id) on delete cascade,
  photo_url   text   not null,
  photo_key   text,
  position    int    not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists memory_photos_memory_id_idx
  on public.memory_photos (memory_id, position);

-- IMPORTANTE: o Supabase liga RLS por padrão em tabela nova, o que bloqueia
-- insert/select com a anon key. As outras tabelas do app têm RLS desligado;
-- deixamos memory_photos igual para o app funcionar (mesmo modelo de acesso).
alter table public.memory_photos disable row level security;

-- 2) Guarda a prévia de áudio (30s) para tocar instantâneo sem refazer a busca.
--    (A capa do álbum já tem coluna: memory_spotify.album_url.)
alter table public.memory_spotify add column if not exists preview_url text;

-- 3) Corrige o default que faltava em memories.created_at (memórias sem data).
alter table public.memories alter column created_at set default now();

-- 4) (Opcional) Realtime: para o outro ver as fotos novas na hora.
--    Ignora o erro se a tabela já estiver na publication.
do $$
begin
  alter publication supabase_realtime add table public.memory_photos;
exception when duplicate_object then null;
end $$;
