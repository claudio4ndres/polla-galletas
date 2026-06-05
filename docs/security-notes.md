# Notas de seguridad — Polla Galletas FC

## Superficie de ataque

### Check de admin solo en el cliente

`isAdmin` se determina consultando la tabla `admins` al iniciar sesión y se
almacena en estado React. Cualquier usuario puede forzar `isAdmin=true` usando
React DevTools o manipulando el JS en consola.

**Consecuencia directa:** los controles de edición de resultados y de pagos
serán visibles en el navegador del atacante.

**Por qué el riesgo es aceptable:** el componente solo renderiza controles UI.
La escritura real a la base de datos pasa por Supabase, que aplica Row Level
Security (RLS) **en el servidor**, independientemente de lo que diga el cliente.
Un usuario no-admin que llame a `supabase.from("results").upsert(...)` recibirá
un error `42501 insufficient_privilege`.

---

## Políticas RLS que deben existir

Las siguientes políticas están en `supabase/schema.sql` y deben estar activas
en producción. Verificarlas periódicamente es parte del mantenimiento.

| Tabla         | Operación       | Condición                                          |
|---------------|-----------------|----------------------------------------------------|
| `predictions` | SELECT          | `authenticated` (cualquier usuario logueado)       |
| `predictions` | INSERT / UPDATE | `user_id = auth.uid()` (solo el propio registro)   |
| `results`     | SELECT          | `authenticated`                                    |
| `results`     | INSERT / UPDATE / DELETE | `auth.email() in (select email from admins)` |
| `admins`      | SELECT          | `authenticated`                                    |
| `payments`    | SELECT          | `authenticated`                                    |
| `payments`    | INSERT / UPDATE / DELETE | `auth.email() in (select email from admins)` |

**RLS debe estar habilitado en todas las tablas.** Si se desactiva por error,
cualquier usuario autenticado puede escribir resultados o marcar pagos.

---

## Queries SQL para verificar que las RLS existen

Ejecutar en **Supabase → SQL Editor**:

```sql
-- 1) Confirmar que RLS está habilitado en las 4 tablas
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('predictions', 'results', 'admins', 'payments');
-- rowsecurity debe ser true en todas.

-- 2) Listar todas las políticas activas
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3) Verificar específicamente las políticas de escritura en results
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'results'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');
-- Debe aparecer results_write_admin con la condición auth.email() in (select email from admins)

-- 4) Verificar que la tabla admins tiene al menos un registro
select count(*) from public.admins;
-- Si es 0, nadie puede escribir resultados.

-- 5) Test directo: intentar upsert como usuario no-admin (ejecutar con un JWT no-admin)
-- insert into public.results (match_id, home, away, updated_at)
-- values ('m0', 1, 0, now());
-- Debe retornar: ERROR 42501 new row violates row-level security policy
```

---

## Ejemplo de RLS para `results` (ya en schema.sql)

```sql
-- Solo usuarios cuyo email esté en la tabla admins pueden escribir resultados.
create policy results_write_admin on public.results
  for all to authenticated
  using     (auth.email() in (select email from public.admins))
  with check(auth.email() in (select email from public.admins));
```

La cláusula `using` controla UPDATE y DELETE (qué filas puede tocar).
La cláusula `with check` controla INSERT y UPDATE (qué valores puede escribir).
Ambas deben apuntar a la misma condición para evitar brechas.

---

## Plan de tests de integración (pendiente de ejecución)

Estos tests no están automatizados todavía. Ejecutar manualmente con dos
cuentas de Google reales antes de abrir la app al grupo.

### Setup necesario
- Cuenta A: email registrado en `public.admins` (el organizador).
- Cuenta B: email **no** registrado en `public.admins` (usuario normal).
- Ambas cuentas deben haber hecho login al menos una vez para tener `auth.uid()`.

### TC-01 — Usuario normal no puede escribir resultados
```js
// Ejecutar en consola del navegador logueado como Cuenta B
const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { error } = await client
  .from("results")
  .upsert({ match_id: "m0", home: 9, away: 0, updated_at: new Date().toISOString() });
console.log(error); // Esperado: { code: "42501", message: "new row violates row-level security policy" }
```
**Resultado esperado:** error 42501. Si no hay error, la RLS está mal configurada.

### TC-02 — Usuario normal no puede escribir pagos
```js
// Ejecutar como Cuenta B
const { error } = await client
  .from("payments")
  .upsert({ user_id: "<uid-de-cuenta-b>", paid: true, updated_at: new Date().toISOString() });
console.log(error); // Esperado: error 42501
```

### TC-03 — Admin sí puede escribir resultados
```js
// Ejecutar como Cuenta A (organizador)
const { error } = await client
  .from("results")
  .upsert({ match_id: "m0", home: 2, away: 1, updated_at: new Date().toISOString() });
console.log(error); // Esperado: null
```

### TC-04 — Usuario normal no puede modificar el pronóstico de otro
```js
// Ejecutar como Cuenta B, intentando pisar el user_id de Cuenta A
const { error } = await client
  .from("predictions")
  .upsert({ user_id: "<uid-de-cuenta-a>", name: "Hack", picks: {} });
console.log(error); // Esperado: error 42501
```

### Criterio de paso
Todos los TCs de usuario normal deben retornar error. TC-03 debe retornar null.
Si algún TC de usuario normal pasa sin error, revisar y corregir la política
correspondiente en `supabase/schema.sql` y volver a ejecutar el schema completo.
