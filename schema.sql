-- ============================================================
--  NUEVAS FUNCIONES (pegá esto en Supabase → SQL Editor → Run)
-- ============================================================

-- 1) Columna para "Mejores del mes" (destacar fotos)
alter table public.fotos add column if not exists destacada boolean not null default false;

-- 2) Foto juntos de cada día (con "por qué no subimos" en la nota)
create table if not exists public.fotos_dia (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  url text,
  nota text,
  autor text,
  subido_por text,
  creado_en timestamptz default now()
);
alter table public.fotos_dia enable row level security;
create policy "fotos_dia_select" on public.fotos_dia for select to authenticated using (true);
create policy "fotos_dia_insert" on public.fotos_dia for insert to authenticated with check (true);
create policy "fotos_dia_update" on public.fotos_dia for update to authenticated using (true);
create policy "fotos_dia_delete" on public.fotos_dia for delete to authenticated using (true);

-- 3) Intercambio "foto para vos" (él <-> ella)
create table if not exists public.fotos_para_vos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  remitente text not null,          -- 'el' | 'ella'
  url text not null,
  mensaje text,
  creado_en timestamptz default now()
);
alter table public.fotos_para_vos enable row level security;
create policy "fotos_para_vos_select" on public.fotos_para_vos for select to authenticated using (true);
create policy "fotos_para_vos_insert" on public.fotos_para_vos for insert to authenticated with check (true);
create policy "fotos_para_vos_update" on public.fotos_para_vos for update to authenticated using (true);
create policy "fotos_para_vos_delete" on public.fotos_para_vos for delete to authenticated using (true);
