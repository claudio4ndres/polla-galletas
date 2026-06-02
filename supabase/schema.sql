-- ============================================================
--  POLLA GALLETAS FC · Esquema de base de datos (Supabase / Postgres)
--  Pega TODO esto en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- 1) TABLAS ---------------------------------------------------

-- Pronósticos: una fila por jugador (identificado por su cuenta de Google).
create table if not exists public.predictions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  picks      jsonb not null default '{}'::jsonb,   -- { "m0": [2,1], "m1": [0,0], ... }
  updated_at timestamptz not null default now()
);

-- Resultados reales de cada partido (los carga el organizador).
create table if not exists public.results (
  match_id   text primary key,                     -- "m0" ... "m71"
  home       int  not null,
  away       int  not null,
  updated_at timestamptz not null default now()
);

-- Organizadores autorizados a cargar resultados (por correo de Google).
create table if not exists public.admins (
  email text primary key
);

-- Inscripciones: marca quién pagó la cuota de participación.
-- Una fila por jugador. Solo el organizador la escribe (igual que los resultados),
-- así nadie puede auto-activarse el "Premium".
create table if not exists public.payments (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  paid       boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 2) SEGURIDAD (Row Level Security) --------------------------
alter table public.predictions enable row level security;
alter table public.results     enable row level security;
alter table public.admins      enable row level security;
alter table public.payments    enable row level security;

-- Pronósticos: cualquier usuario logueado puede LEER todos (para armar la tabla),
-- pero cada uno solo puede CREAR/EDITAR el suyo.
drop policy if exists predictions_select on public.predictions;
create policy predictions_select on public.predictions
  for select to authenticated using (true);

drop policy if exists predictions_insert on public.predictions;
create policy predictions_insert on public.predictions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists predictions_update on public.predictions;
create policy predictions_update on public.predictions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Resultados: todos los logueados LEEN; solo los organizadores ESCRIBEN.
drop policy if exists results_select on public.results;
create policy results_select on public.results
  for select to authenticated using (true);

drop policy if exists results_write_admin on public.results;
create policy results_write_admin on public.results
  for all to authenticated
  using (auth.email() in (select email from public.admins))
  with check (auth.email() in (select email from public.admins));

-- Admins: los logueados pueden leer la lista (la app la consulta para saber si eres organizador).
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select to authenticated using (true);

-- Inscripciones: todos los logueados LEEN (para mostrar el distintivo Premium en la tabla);
-- solo los organizadores ESCRIBEN (marcan quién pagó la cuota).
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated using (true);

drop policy if exists payments_write_admin on public.payments;
create policy payments_write_admin on public.payments
  for all to authenticated
  using (auth.email() in (select email from public.admins))
  with check (auth.email() in (select email from public.admins));

-- 3) DEFINE AL ORGANIZADOR -----------------------------------
-- Reemplaza el correo por el de TU cuenta de Google (la que usarás para entrar).
-- Puedes agregar más de uno repitiendo la línea.
insert into public.admins (email) values ('TUCORREO@gmail.com')
  on conflict (email) do nothing;
