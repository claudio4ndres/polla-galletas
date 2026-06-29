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
  match_id   text primary key,                     -- "m0" ... "m71" (grupos), "k0" ... (eliminación)
  home       int  not null,                         -- marcador de los 90/120 min (lo que puntúa)
  away       int  not null,
  went_to_et boolean default false,                 -- eliminación: fue a alargue (informativo)
  pen_home   int,                                   -- eliminación: penales convertidos local
  pen_away   int,                                   -- eliminación: penales convertidos visita
  updated_at timestamptz not null default now()
);
-- Para bases ya creadas (idempotente): agrega las columnas de eliminación si faltan.
alter table public.results add column if not exists went_to_et boolean default false;
alter table public.results add column if not exists pen_home int;
alter table public.results add column if not exists pen_away int;
-- Tiempo real: los cambios en `results` (organizador o sync) llegan en vivo a todos por Supabase Realtime.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='results') then
    alter publication supabase_realtime add table public.results;
  end if;
end $$;

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

-- 2b) BITÁCORA DE RESULTADOS (audit log) ---------------------
-- Registra CADA cambio en `results`: el resultado que quedó, quién lo hizo y cuándo.
-- La llena sola un trigger (abajo); no se escribe desde el front ni por la API, así
-- la bitácora no se puede falsificar ni borrar. Cubre también el sync automático.
create table if not exists public.results_log (
  id           bigint generated always as identity primary key,
  match_id     text not null,                  -- "m0" ... "m71"
  home         int,                             -- resultado que quedó (null si fue un borrado)
  away         int,
  action       text not null,                   -- 'insert' | 'update' | 'delete'
  editor_id    uuid,                            -- quién lo hizo (null = sync automático sin sesión)
  editor_name  text,                            -- nombre legible del editor
  editor_email text,
  -- Se guarda en hora de Chile (America/Santiago, UTC-4 en junio) para leer la bitácora sin convertir.
  created_at   timestamp not null default (now() at time zone 'America/Santiago')
);

alter table public.results_log enable row level security;

-- Solo los organizadores LEEN la bitácora (para revisarla). Nadie la ESCRIBE por la API:
-- al no haber política de insert/update/delete, RLS las niega. Solo el trigger la llena.
drop policy if exists results_log_select on public.results_log;
create policy results_log_select on public.results_log
  for select to authenticated
  using (auth.email() in (select email from public.admins));

-- Función que registra el cambio. SECURITY DEFINER para poder escribir en la bitácora
-- aunque el usuario no tenga permiso directo de escritura sobre ella (así nadie la falsifica).
create or replace function public.log_result_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  em  text := auth.email();
  nm  text;
begin
  -- Nombre legible: el que el usuario eligió en `predictions`; si no, su correo; si no, "Sync automático".
  select name into nm from public.predictions where user_id = uid;
  nm := coalesce(nm, em, 'Sync automático');

  if (tg_op = 'DELETE') then
    insert into public.results_log(match_id, home, away, action, editor_id, editor_name, editor_email)
    values (old.match_id, old.home, old.away, 'delete', uid, nm, em);
    return old;
  else
    insert into public.results_log(match_id, home, away, action, editor_id, editor_name, editor_email)
    values (new.match_id, new.home, new.away, lower(tg_op), uid, nm, em);
    return new;
  end if;
end;
$$;

-- El trigger dispara después de cada insert/update/delete en `results`.
drop trigger if exists trg_log_result_change on public.results;
create trigger trg_log_result_change
  after insert or update or delete on public.results
  for each row execute function public.log_result_change();

-- 2c) BITÁCORA DE PRONÓSTICOS (audit log de picks) -----------
-- Registra CADA cambio en `predictions`: de quién es la predicción, qué picks quedaron,
-- QUIÉN hizo el cambio (editor) y CUÁNDO. Sirve para detectar manipulación: si editor_id
-- != user_id alguien tocó picks ajenos; si created_at es posterior al inicio de un partido,
-- alguien editó saltándose el cierre (la RLS no valida el plazo, solo el frontend).
create table if not exists public.predictions_log (
  id           bigint generated always as identity primary key,
  user_id      uuid,                            -- de quién es la predicción que cambió
  player_name  text,                            -- nombre del jugador (snapshot)
  picks        jsonb,                           -- picks que quedaron (snapshot completo)
  action       text not null,                   -- 'insert' | 'update' | 'delete'
  editor_id    uuid,                            -- quién hizo el cambio (auth.uid)
  editor_email text,                            -- correo de quién hizo el cambio
  created_at   timestamp not null default (now() at time zone 'America/Santiago')
);

alter table public.predictions_log enable row level security;

-- Solo los organizadores LEEN. Nadie la ESCRIBE por la API: la llena solo el trigger.
drop policy if exists predictions_log_select on public.predictions_log;
create policy predictions_log_select on public.predictions_log
  for select to authenticated
  using (auth.email() in (select email from public.admins));

create or replace function public.log_prediction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  em  text := auth.email();
begin
  if (tg_op = 'DELETE') then
    insert into public.predictions_log(user_id, player_name, picks, action, editor_id, editor_email)
    values (old.user_id, old.name, old.picks, 'delete', uid, em);
    return old;
  else
    insert into public.predictions_log(user_id, player_name, picks, action, editor_id, editor_email)
    values (new.user_id, new.name, new.picks, lower(tg_op), uid, em);
    return new;
  end if;
end;
$$;

-- El trigger dispara después de cada insert/update/delete en `predictions`.
drop trigger if exists trg_log_prediction_change on public.predictions;
create trigger trg_log_prediction_change
  after insert or update or delete on public.predictions
  for each row execute function public.log_prediction_change();

-- 2d) BLOQUEO DE PICKS FUERA DE PLAZO (enforcement server-side) ----
-- El cierre por partido (30 min antes del inicio) se valida también en la BASE, no solo en el front.
-- Si alguien (vía API/Postman) intenta cambiar el pick de un partido ya cerrado, ese pick se REVIERTE
-- (la trampa no se guarda) y el intento queda en `pick_violations` para que el organizador decida.

-- Horario de inicio de cada partido (copia de data.js). OJO: si cambias un horario en data.js,
-- re-corre este INSERT para mantenerlos sincronizados (el `on conflict` lo actualiza).
create table if not exists public.match_kickoffs (
  match_id text primary key,
  kickoff  timestamptz not null
);
alter table public.match_kickoffs enable row level security;
drop policy if exists match_kickoffs_select on public.match_kickoffs;
create policy match_kickoffs_select on public.match_kickoffs
  for select to authenticated using (true);

insert into public.match_kickoffs (match_id, kickoff) values
  ('m0','2026-06-11T19:00:00.000Z'),('m1','2026-06-12T02:00:00.000Z'),('m2','2026-06-18T16:00:00.000Z'),
  ('m3','2026-06-19T01:00:00.000Z'),('m4','2026-06-25T01:00:00.000Z'),('m5','2026-06-25T01:00:00.000Z'),
  ('m6','2026-06-12T19:00:00.000Z'),('m7','2026-06-13T19:00:00.000Z'),('m8','2026-06-18T19:00:00.000Z'),
  ('m9','2026-06-18T22:00:00.000Z'),('m10','2026-06-24T19:00:00.000Z'),('m11','2026-06-24T19:00:00.000Z'),
  ('m12','2026-06-13T22:00:00.000Z'),('m13','2026-06-14T01:00:00.000Z'),('m14','2026-06-19T22:00:00.000Z'),
  ('m15','2026-06-20T00:30:00.000Z'),('m16','2026-06-24T22:00:00.000Z'),('m17','2026-06-24T22:00:00.000Z'),
  ('m18','2026-06-13T01:00:00.000Z'),('m19','2026-06-14T04:00:00.000Z'),('m20','2026-06-20T03:00:00.000Z'),
  ('m21','2026-06-19T19:00:00.000Z'),('m22','2026-06-26T02:00:00.000Z'),('m23','2026-06-26T02:00:00.000Z'),
  ('m24','2026-06-14T17:00:00.000Z'),('m25','2026-06-14T23:00:00.000Z'),('m26','2026-06-20T20:00:00.000Z'),
  ('m27','2026-06-21T00:00:00.000Z'),('m28','2026-06-25T20:00:00.000Z'),('m29','2026-06-25T20:00:00.000Z'),
  ('m30','2026-06-14T20:00:00.000Z'),('m31','2026-06-15T02:00:00.000Z'),('m32','2026-06-20T17:00:00.000Z'),
  ('m33','2026-06-21T04:00:00.000Z'),('m34','2026-06-25T23:00:00.000Z'),('m35','2026-06-25T23:00:00.000Z'),
  ('m36','2026-06-16T01:00:00.000Z'),('m37','2026-06-15T19:00:00.000Z'),('m38','2026-06-21T19:00:00.000Z'),
  ('m39','2026-06-22T01:00:00.000Z'),('m40','2026-06-27T03:00:00.000Z'),('m41','2026-06-27T03:00:00.000Z'),
  ('m42','2026-06-15T16:00:00.000Z'),('m43','2026-06-15T22:00:00.000Z'),('m44','2026-06-21T16:00:00.000Z'),
  ('m45','2026-06-21T22:00:00.000Z'),('m46','2026-06-27T00:00:00.000Z'),('m47','2026-06-27T00:00:00.000Z'),
  ('m48','2026-06-16T19:00:00.000Z'),('m49','2026-06-16T22:00:00.000Z'),('m50','2026-06-22T21:00:00.000Z'),
  ('m51','2026-06-23T00:00:00.000Z'),('m52','2026-06-26T19:00:00.000Z'),('m53','2026-06-26T19:00:00.000Z'),
  ('m54','2026-06-17T01:00:00.000Z'),('m55','2026-06-17T04:00:00.000Z'),('m56','2026-06-22T17:00:00.000Z'),
  ('m57','2026-06-23T03:00:00.000Z'),('m58','2026-06-28T02:00:00.000Z'),('m59','2026-06-28T02:00:00.000Z'),
  ('m60','2026-06-17T17:00:00.000Z'),('m61','2026-06-18T02:00:00.000Z'),('m62','2026-06-23T17:00:00.000Z'),
  ('m63','2026-06-24T02:00:00.000Z'),('m64','2026-06-27T23:30:00.000Z'),('m65','2026-06-27T23:30:00.000Z'),
  ('m66','2026-06-17T20:00:00.000Z'),('m67','2026-06-17T23:00:00.000Z'),('m68','2026-06-23T20:00:00.000Z'),
  ('m69','2026-06-23T23:00:00.000Z'),('m70','2026-06-27T21:00:00.000Z'),('m71','2026-06-27T21:00:00.000Z')
on conflict (match_id) do update set kickoff = excluded.kickoff;

-- Registro de intentos de editar picks cerrados (solo lo leen los organizadores).
create table if not exists public.pick_violations (
  id           bigint generated always as identity primary key,
  user_id      uuid,                            -- de quién es la predicción
  editor_id    uuid,                            -- quién intentó (auth.uid)
  editor_email text,
  matches      text[],                          -- partidos cerrados que intentó cambiar
  attempted    jsonb,                           -- { match_id: valor que intentó poner }
  created_at   timestamp not null default (now() at time zone 'America/Santiago')
);
alter table public.pick_violations enable row level security;
drop policy if exists pick_violations_select on public.pick_violations;
create policy pick_violations_select on public.pick_violations
  for select to authenticated
  using (auth.email() in (select email from public.admins));

-- Trigger BEFORE: revierte los picks de partidos ya cerrados y registra el intento.
-- (No lanza error: deja pasar los picks válidos de partidos abiertos y solo neutraliza la trampa.)
create or replace function public.enforce_pick_locks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text; oldv jsonb; newv jsonb; ko timestamptz;
  oldpicks jsonb;
  bloqueados text[] := '{}';
  intentos  jsonb  := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then oldpicks := '{}'::jsonb; else oldpicks := coalesce(old.picks,'{}'::jsonb); end if;
  for k in
    select x from (
      select jsonb_object_keys(coalesce(new.picks,'{}'::jsonb)) as x
      union
      select jsonb_object_keys(oldpicks)
    ) z
  loop
    oldv := oldpicks -> k;
    newv := new.picks -> k;
    if oldv is distinct from newv then
      select kickoff into ko from public.match_kickoffs where match_id = k;
      if ko is not null and now() >= ko - interval '30 minutes' then
        -- partido cerrado: revertir ese pick y anotar el intento
        bloqueados := array_append(bloqueados, k);
        intentos := jsonb_set(intentos, array[k], coalesce(newv,'null'::jsonb));
        if oldv is null then
          new.picks := coalesce(new.picks,'{}'::jsonb) - k;             -- quitar pick agregado ilegalmente
        else
          new.picks := jsonb_set(coalesce(new.picks,'{}'::jsonb), array[k], oldv); -- restaurar el viejo
        end if;
      end if;
    end if;
  end loop;
  if array_length(bloqueados,1) > 0 then
    insert into public.pick_violations(user_id, editor_id, editor_email, matches, attempted)
    values (new.user_id, auth.uid(), auth.email(), bloqueados, intentos);
    raise notice 'Picks de partidos cerrados revertidos: %', array_to_string(bloqueados, ', ');
  end if;
  return new;
end;
$$;

-- Solo BEFORE UPDATE: el upsert de la app dispara insert+update; si corriera también en insert,
-- la fase insert veria todos los picks como nuevos y marcaria todos los cerrados (falsos positivos).
drop trigger if exists trg_enforce_pick_locks on public.predictions;
create trigger trg_enforce_pick_locks
  before update on public.predictions
  for each row execute function public.enforce_pick_locks();

-- 3) DEFINE AL ORGANIZADOR -----------------------------------
-- Reemplaza el correo por el de TU cuenta de Google (la que usarás para entrar).
-- Puedes agregar más de uno repitiendo la línea.
insert into public.admins (email) values ('TUCORREO@gmail.com')
  on conflict (email) do nothing;
