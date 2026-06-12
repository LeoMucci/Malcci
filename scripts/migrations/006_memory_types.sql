-- Migração: adiciona novos tipos de memórias ('date', 'passeio', 'travel') no check constraint da tabela memories.
-- Rode no Supabase: SQL Editor > New query > cole > Run.
-- Esta migração localiza dinamicamente qualquer check constraint na coluna 'type' e o remove antes de aplicar a nova restrição.

do $$
declare
    r record;
begin
    for r in 
        select tc.constraint_name 
        from information_schema.table_constraints tc
        join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
        where tc.table_name = 'memories' 
          and ccu.column_name = 'type'
          and tc.constraint_type = 'CHECK'
    loop
        execute 'alter table public.memories drop constraint ' || quote_ident(r.constraint_name);
    end loop;
end $$;

alter table public.memories add constraint memories_type_check 
  check (type in ('restaurant', 'movie', 'place', 'special', 'shopping', 'date', 'passeio', 'travel', 'other'));

