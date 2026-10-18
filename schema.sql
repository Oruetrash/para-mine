-- ============================================================
--  NUEVAS TABLAS (pegá en Supabase → SQL Editor → Run)
--  (las de fotos_dia / fotos_para_vos / destacada ya están)
-- ============================================================

-- Mensajes y quizzes diarios
create table if not exists public.mensajes_diarios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  tipo text not null,             -- 'mensaje' | 'quiz'
  texto text not null,
  de text not null,               -- 'el' | 'ella'
  respuesta text,
  creado_en timestamptz default now()
);

-- Razones por las que te amo
create table if not exists public.razones (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  autor text,
  creado_en timestamptz default now()
);

-- Su arte (dibujos / planos)
create table if not exists public.arte (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  titulo text,
  creado_en timestamptz default now()
);

-- Caja de "te quiero"
create table if not exists public.te_quiero (
  id uuid primary key default gen_random_uuid(),
  autor text,
  creado_en timestamptz default now()
);

-- Diario compartido
create table if not exists public.diario (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  autor text,
  fecha date default current_date,
  creado_en timestamptz default now()
);

-- Lista de planes
create table if not exists public.planes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  hecho boolean not null default false,
  creado_en timestamptz default now()
);

-- Cápsula del tiempo
create table if not exists public.capsula (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  autor text,
  abre_en date,
  creado_en timestamptz default now()
);

-- Cartas
create table if not exists public.cartas (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  texto text not null,
  autor text,
  creado_en timestamptz default now()
);

-- Lugares importantes
create table if not exists public.lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  descripcion text,
  creado_en timestamptz default now()
);

-- Reto de la semana
create table if not exists public.reto (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  hecho boolean not null default false,
  creado_en timestamptz default now()
);

-- Mood del día
create table if not exists public.mood (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  mood text not null,
  autor text,
  creado_en timestamptz default now()
);

-- ---------- Seguridad (RLS) ----------
do $$
declare t text;
begin
  foreach t in array array['mensajes_diarios','razones','arte','te_quiero','diario','planes','capsula','cartas','lugares','reto','mood']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (true)', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end $$;
