# CLAUDE.md — Polla Mundialera · Galletas FC 🍪⚽

Memoria del proyecto. Documenta qué es, cómo está armado y todas las decisiones tomadas,
para retomar el trabajo sin perder contexto. (Claude Code carga este archivo automáticamente.)

## Qué es
App web para la polla del Mundial 2026 del equipo **Galletas FC** (fútbol amateur, Santiago de Chile).
Cada integrante entra con su Google, pronostica los 72 partidos de la fase de grupos y la tabla de
posiciones se calcula sola. Un organizador carga los resultados reales.

## Stack
- **Frontend:** React 18 + Vite.
- **Backend/datos:** Supabase (Auth con Google + Postgres).
- **Hosting:** Vercel (alternativa: EcoHosting subiendo `dist/`). Requiere un dominio para el login de Google.

## Comandos
- `npm install` — instalar dependencias
- `npm run dev` — servidor local (http://localhost:5173)
- `npm run build` — build de producción (carpeta `dist/`)

## Estructura
- `src/App.jsx` — auth (Google), vistas Pronósticos / Tabla / Resultados, lógica de guardado.
- `src/data.js` — `MATCHES` (72 partidos), `FLAGS`, `scorePick()`, `DEADLINE`, constantes de puntaje.
- `src/styles.css` — tema oscuro "eléctrico" de Galletas FC.
- `src/supabaseClient.js` — cliente Supabase (lee variables de entorno).
- `supabase/schema.sql` — tablas `predictions`, `results`, `admins` + reglas RLS. Correr en Supabase.
- `public/logo.jpg` — escudo oficial del equipo.
- `.env` — `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (no se sube a git).

## Modelo de datos (Supabase)
- `predictions(user_id uuid PK, name text, picks jsonb, updated_at)` — `picks` = `{ "m0":[2,1], ... }`.
- `results(match_id text PK, home int, away int, updated_at)`.
- `admins(email text PK)` — correos autorizados a cargar resultados.
- RLS: todos los logueados leen `predictions` y `results`; cada uno escribe solo su predicción;
  solo `admins` escriben `results`.

## Reglas de la polla (decisiones tomadas)
- **Puntaje estándar de 3 niveles** (`scorePick` en `data.js`):
  - Marcador exacto = **3**
  - Acertar ganador + diferencia de goles (no exacto, solo no-empates) = **2**
  - Acertar solo el signo 1-X-2 (quién gana, o que fue empate) = **1**
  - Errar el signo = **0**
- **Empate**: cuenta como un signo más; exacto vale 3, acertar que fue empate sin marcador vale 1.
- **Cierre único**: todas las predicciones se pueden editar hasta el inicio del Mundial
  (`DEADLINE = 11-jun-2026 00:00` local). Después, todo congelado. No hay bloqueo partido por partido.
- **Identidad**: login con Google (Supabase Auth); el nombre sale del perfil de Google.

## Datos del torneo
- Fixture: fase de grupos del Mundial 2026 (sorteo 5-dic-2025), 12 grupos, 72 partidos, todos en junio.
- Las selecciones de repesca YA están definidas (play-offs 31-mar-2026) y reemplazadas en `data.js`:
  Chequia (Grupo A), Bosnia (B), Turquía (D), Suecia (F), RD Congo (K), Irak (I).
- Falta la **fase de eliminación** (de 16avos a la final): agregar cuando se conozcan los cruces.

## Branding
- Tema oscuro tipo esports sacado del logo real: cian eléctrico `#2ec9f0`, naranja fuego `#ff7d1f`,
  dorado galleta `#e3a948`, fondo `#070e18`. Tipografías: Anton (display) + Archivo (texto).
- Club: fundado 10/04/2019 · Fútbol 7 & 11 · Santiago Centro, Maipú, Lo Prado, La Cisterna.

## Setup pendiente (lo hace el dueño, ver README.md)
1. Crear proyecto Supabase y correr `supabase/schema.sql` (poner su correo en `admins`).
2. Crear credenciales OAuth de Google en Google Cloud y pegarlas en Supabase.
3. Configurar `.env`, desplegar en Vercel y poner la URL de Vercel como Site URL en Supabase.

## Ideas / TODO
- [ ] Fase de eliminación (round of 32 → final) cuando se definan los cruces.
- [ ] Opcional: traer resultados automáticamente con una función serverless en Vercel
      (consultar un API de marcadores o la API de Anthropic con key del lado servidor).
- [ ] Opcional: pantalla de reglas / ayuda; estadística de "mejor pronosticador por jornada".

## Convenciones
- UI y nombres de selecciones en español.
- Mantener pocas dependencias. No exponer secretos en el frontend (la `anon key` es pública por diseño;
  la seguridad real vive en las políticas RLS del `schema.sql`).
