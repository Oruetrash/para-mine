-- ============================================================
--  TABLAS + SEGURIDAD P0
--  Pegá en Supabase → SQL Editor → Run.
--
--  Antes de correrlo:
--   1) Creá DOS cuentas Auth (ej. el@… y ella@…) en Authentication → Users.
--   2) Después de crear las cuentas, cargá el mapeo en `profiles`:
--        insert into public.profiles (id, who)
--        values ('<uid-de-el>', 'el'), ('<uid-de-ella>', 'ella');
--      (el uid está en Authentication → Users → cada usuario).
--   3) Verificá el huso horario en `hoy()` (America/Asuncion).
-- ============================================================

-- ---------- 1) Perfiles: mapea auth.uid() -> who ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  who text not null check (who in ('el','ella'))
);

-- ---------- 2) Helpers ----------
-- Quién es el usuario autenticado (no falsificable desde el cliente)
create or replace function public.me() returns text
language sql stable security definer set search_path = public
as $$ select who from public.profiles where id = auth.uid() $$;

-- Fecha actual del servidor en el huso de Asunción (ajustá si hace falta)
create or replace function public.hoy() returns date
language sql stable
as $$ select (now() at time zone 'America/Asuncion')::date $$;

-- ---------- Mensajes y quizzes diarios ----------
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
  ubicacion text,
  creado_en timestamptz default now()
);

-- Calendario de adviento (una puerta por día hasta el cumple)
create table if not exists public.adviento (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  titulo text,
  tipo text not null default 'texto',   -- 'texto' | 'foto' | 'cancion'
  texto text,
  url text,                              -- path de storage (foto) o spotify_id (cancion)
  creado_en timestamptz default now()
);

-- Canciones que se agregan entre los dos
create table if not exists public.canciones (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null,
  titulo text,
  de text not null,                      -- 'el' | 'ella'
  mensaje text,
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

-- ---------- 3) La propuesta (el cofre) ----------
-- La carta y la pregunta viven SOLO acá (servidor), no en config.js.
create table if not exists public.propuesta (
  id int primary key default 1,
  fecha date not null,
  pregunta text,
  carta text,
  final text,
  respuesta text,
  respondido_en timestamptz
);

insert into public.propuesta (id, fecha, pregunta, carta, final) values (
  1,
  '2026-11-21',
  '¿Querés volver a ser mi novia?',
  'Miñe… pasaron años desde aquella primavera en la que nos encontramos sin buscarnos. Tuvimos capítulos, pausas, vueltas… y sin embargo, acá estamos: de nuevo juntos, como siempre tenía que ser.

Porque te elijo. Te elegí el primer día, te elijo hoy y te voy a elegir todos los días.

Hoy, en tu cumple, te quiero pedir algo muy importante…',
  'Oficialmente… nuestros ❤'
) on conflict (id) do update set
  fecha = excluded.fecha,
  pregunta = excluded.pregunta,
  carta = excluded.carta,
  final = excluded.final;

-- ---------- 4) Seguridad (RLS) ----------

-- Tablas compartidas: ambos leen, la autoría se fija al insertar.
do $$
declare t text;
begin
  foreach t in array array['mensajes_diarios','razones','arte','te_quiero','diario','planes','capsula','cartas','lugares','reto','mood','canciones']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (true)', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end $$;

-- Autoría no falsificable: el `de`/`autor` debe coincidir con me().
drop policy if exists mensajes_insert on public.mensajes_diarios;
create policy mensajes_insert on public.mensajes_diarios for insert to authenticated with check (de = public.me());
drop policy if exists razones_insert on public.razones;
create policy razones_insert on public.razones for insert to authenticated with check (autor = public.me());
drop policy if exists tequiero_insert on public.te_quiero;
create policy tequiero_insert on public.te_quiero for insert to authenticated with check (autor = public.me());
drop policy if exists diario_insert on public.diario;
create policy diario_insert on public.diario for insert to authenticated with check (autor = public.me());
drop policy if exists capsula_insert on public.capsula;
create policy capsula_insert on public.capsula for insert to authenticated with check (autor = public.me());
drop policy if exists cartas_insert on public.cartas;
create policy cartas_insert on public.cartas for insert to authenticated with check (autor = public.me());
drop policy if exists mood_insert on public.mood;
create policy mood_insert on public.mood for insert to authenticated with check (autor = public.me());
drop policy if exists canciones_insert on public.canciones;
create policy canciones_insert on public.canciones for insert to authenticated with check (de = public.me());
-- Sin columna de autoría: cualquiera autenticado puede insertar.
drop policy if exists arte_insert on public.arte;
create policy arte_insert on public.arte for insert to authenticated with check (true);
drop policy if exists planes_insert on public.planes;
create policy planes_insert on public.planes for insert to authenticated with check (true);
drop policy if exists reto_insert on public.reto;
create policy reto_insert on public.reto for insert to authenticated with check (true);
drop policy if exists lugares_insert on public.lugares;
create policy lugares_insert on public.lugares for insert to authenticated with check (true);

-- Adviento: ella solo ve las puertas ya abiertas; solo él lo edita.
alter table public.adviento enable row level security;
drop policy if exists adviento_select on public.adviento;
create policy adviento_select on public.adviento for select to authenticated
  using (public.me() = 'el' or fecha <= public.hoy());
drop policy if exists adviento_insert on public.adviento;
create policy adviento_insert on public.adviento for insert to authenticated with check (public.me() = 'el');
drop policy if exists adviento_update on public.adviento;
create policy adviento_update on public.adviento for update to authenticated using (public.me() = 'el');
drop policy if exists adviento_delete on public.adviento;
create policy adviento_delete on public.adviento for delete to authenticated using (public.me() = 'el');

-- Propuesta: él la ve siempre; ella solo el día del cumple y puede responder.
alter table public.propuesta enable row level security;
drop policy if exists p_sel on public.propuesta;
create policy p_sel on public.propuesta for select to authenticated using (public.me()='el' or fecha <= public.hoy());
drop policy if exists p_upd on public.propuesta;
create policy p_upd on public.propuesta for update to authenticated using (public.me()='ella' and fecha <= public.hoy()) with check (true);

-- ---------- 5) Storage: fotos de adviento/ con el mismo gating ----------
-- La policy de SELECT es la que decide si se puede firmar la URL (createSignedUrl).
-- NOTA: corré esta sección con un rol que posea storage.objects (p. ej. el editor de
-- policies de Storage en el dashboard). El endpoint SQL de la Management API corre
-- como `postgres` (no owner de storage.objects) y da "must be owner of table objects".
alter table storage.objects enable row level security;

-- Reemplazá la policy SELECT genérica (bucket 'fotos') por dos: fotos normales y adviento gated.
drop policy if exists fotos_bucket_select on storage.objects;
drop policy if exists fotos_select on storage.objects;
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] is distinct from 'adviento');

-- adviento/: solo él, o ella si ya pasó la fecha de esa puerta.
drop policy if exists adviento_storage_select on storage.objects;
create policy adviento_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = 'adviento'
    and (public.me() = 'el'
         or (regexp_match(name, 'adviento/([0-9]{4}-[0-9]{2}-[0-9]{2})'))[1]::date <= public.hoy())
  );

-- Subidas al bucket 'fotos' (la subida a adviento/ ya está limitada por la RLS de la tabla adviento).
drop policy if exists fotos_bucket_insert on storage.objects;
drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos');

-- ---------- 6) Realtime ----------
-- Activa actualizaciones en vivo (contador de "te quiero" y mensajes).
do $$
begin
  alter publication supabase_realtime add table public.te_quiero;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mensajes_diarios;
exception when duplicate_object then null;
end $$;

-- ---------- 7) Performance: thumbnail del álbum ----------
-- Columna para el thumb de la grilla (el full se firma solo al abrir el lightbox).
alter table public.fotos add column if not exists thumb text;

-- ---------- 8) Sanitización: constraints ----------
alter table public.canciones drop constraint if exists canciones_spotify_check;
alter table public.canciones add constraint canciones_spotify_check check (spotify_id ~ '^[A-Za-z0-9]{22}$');
alter table public.mood drop constraint if exists mood_check;
alter table public.mood add constraint mood_check check (mood in ('😍','😊','😐','😔','🥺'));

-- ---------- 9) Límites diarios ----------
-- "Para vos": una foto por persona por día.
alter table public.fotos_para_vos drop constraint if exists fotos_para_vos_uno_por_dia;
alter table public.fotos_para_vos add constraint fotos_para_vos_uno_por_dia unique (fecha, remitente);
-- Mensajes/quiz: una franja por persona por día (manana | mediodia | noche).
alter table public.mensajes_diarios add column if not exists franja text;
alter table public.mensajes_diarios drop constraint if exists mensajes_uno_por_franja;
alter table public.mensajes_diarios add constraint mensajes_uno_por_franja unique (fecha, de, franja);
