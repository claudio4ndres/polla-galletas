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
- `src/App.jsx` — auth (Google), vistas Pronósticos / Tabla / Premios / Resultados, lógica de guardado.
- `src/data.js` — `MATCHES` (72 partidos), `FLAGS`, `scorePick()`, `DEADLINE` + `isLocked()`, constantes de puntaje, `INSCRIPCION` (datos de transferencia bancaria + monto), `montoNumber` y `PREMIOS` (reparto del pozo).
- `src/styles.css` — tema oscuro "eléctrico" de Galletas FC.
- `src/supabaseClient.js` — cliente Supabase (lee variables de entorno).
- `supabase/schema.sql` — tablas `predictions`, `results`, `admins`, `payments` + reglas RLS. Correr en Supabase.
- `public/logo.jpg` — escudo oficial del equipo.
- `.env` — `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (no se sube a git).

## Modelo de datos (Supabase)
- `predictions(user_id uuid PK, name text, picks jsonb, updated_at)` — `picks` = `{ "m0":[2,1], ... }`.
- `results(match_id text PK, home int, away int, updated_at)`.
- `admins(email text PK)` — correos autorizados a cargar resultados.
- `payments(user_id uuid PK, paid boolean, updated_at)` — marca quién pagó la cuota (distintivo Premium).
- RLS: todos los logueados leen `predictions`, `results` y `payments`; cada uno escribe solo su
  predicción; solo `admins` escriben `results` y `payments` (nadie se auto-activa el Premium).

## Reglas de la polla (decisiones tomadas)
- **Puntaje estándar de 3 niveles** (`scorePick` en `data.js`):
  - Marcador exacto = **3**
  - Acertar ganador + diferencia de goles (no exacto, solo no-empates) = **2**
  - Acertar solo el signo 1-X-2 (quién gana, o que fue empate) = **1**
  - Errar el signo = **0**
- **Empate**: cuenta como un signo más; exacto vale 3, acertar que fue empate sin marcador vale 1.
- **Cierre único**: todas las predicciones se pueden editar hasta el cierre
  (`DEADLINE = 11-jun-2026 14:00` hora de Chile, UTC-4). Se define en UTC (`Date.UTC(2026,5,11,18,0,0)`)
  para que sea el mismo instante en cualquier zona horaria; el bloqueo lo decide `isLocked(now)` (`data.js`).
  Después, todo congelado. No hay bloqueo partido por partido.
- **Identidad**: login con Google (Supabase Auth); el nombre sale del perfil de Google.

## Interfaz y features (decisiones tomadas)
- **Inscripción / Premium**: en Pronósticos cada jugador ve los datos de transferencia bancaria
  (`INSCRIPCION.transferencia`: titular, RUT, banco, tipo de cuenta, número, correo) dentro de una
  tarjeta `.g-bank`, con un botón "Copiar datos de transferencia" (al portapapeles). Transfiere y le
  avisa al organizador, que desde Resultados → modo organizador → panel Inscripciones marca
  manualmente quién pagó. Al confirmarse aparece el distintivo **★ Premium** en su tarjeta y en la
  Tabla. Solo `admins` escriben `payments`, así nadie se auto-activa.
- **Premios (reparto del pozo)**: pestaña *Premios* (`PremiosView` en `App.jsx`) que muestra el
  **pozo** (`montoNumber` × inscritos confirmados) y cómo se reparte entre los primeros de la Tabla.
  Hoy **60% / 30% / 10%** para 1º/2º/3º, definido en `PREMIOS` (`data.js`) — editable, y la pantalla
  se adapta sola a la cantidad de premiados. Estilos `.g-pozo` y `.g-prize.t1/.t2/.t3` (oro/plata/
  bronce). Desempate: a igual puntaje, más marcadores exactos. Si no hay pagos confirmados, el pozo
  muestra $0 con el mensaje "crece con cada inscripción".
- **Reglas explicadas en la app**: la vista Pronósticos muestra "Cómo se ganan los puntos en cada
  partido" con un glosario que define **signo** (quién gana o empate, 1-X-2) y **diferencia** (por
  cuántos goles gana), más la lista de los 4 niveles (3/2/1/0) con ejemplos.
- **Cuenta regresiva del cierre** (`Countdown` en `App.jsx`): en Pronósticos, una tarjeta muestra un
  contador en vivo (DÍAS/HRS/MIN/SEG, tickea cada segundo) hasta `DEADLINE`, con la fecha y hora
  formateadas en hora de Chile (`Intl.DateTimeFormat` con `timeZone:"America/Santiago"`). Al cumplirse
  el plazo cambia solo a **"Pronósticos cerrados"** (en naranjo, sin íconos). CSS en `.g-count*`.
- **Identificador de aciertos (escala de calor)**: cuando hay resultado cargado, el marcador del
  jugador y el chip de puntos se tintan según el acierto: exacto = **verde** (`--green #26e08a`, con
  glow y etiqueta "Exacto"), +2 = **naranjo**, +1 = **dorado**, +0 = **gris**. CSS en `.g-match.won/.p2/.p1/.p0`.
- **Botón "Prueba tu suerte"** (Pronósticos, solo con la polla abierta): autocompleta los 72
  marcadores al azar (goles ponderados a números bajos) sin guardar; el jugador revisa, ajusta y
  toca Guardar. Si ya había marcadores cargados pide confirmación antes de reemplazar. Estilo
  `g-btn ghost`, texto sin íconos. Función `fillRandom()` en `App.jsx`.

## Datos del torneo
- Fixture: fase de grupos del Mundial 2026 (sorteo 5-dic-2025), 12 grupos, 72 partidos, todos en junio.
- Las selecciones de repesca YA están definidas (play-offs 31-mar-2026) y reemplazadas en `data.js`:
  Chequia (Grupo A), Bosnia (B), Turquía (D), Suecia (F), RD Congo (K), Irak (I).
- Falta la **fase de eliminación** (de 16avos a la final): agregar cuando se conozcan los cruces.

## Branding
- Tema oscuro tipo esports sacado del logo real: cian eléctrico `#2ec9f0`, naranja fuego `#ff7d1f`,
  dorado galleta `#e3a948`, verde acierto `#26e08a`, fondo `#070e18`. Tipografías: Anton (display) + Archivo (texto).
- Club: fundado 10/04/2019 · Fútbol 7 & 11 · Santiago Centro, Maipú, Lo Prado, La Cisterna.

## Setup pendiente (lo hace el dueño, ver README.md)
1. Crear proyecto Supabase y correr `supabase/schema.sql` (poner su correo en `admins`).
2. Crear credenciales OAuth de Google en Google Cloud y pegarlas en Supabase.
3. Configurar `.env`, desplegar en Vercel y poner la URL de Vercel como Site URL en Supabase.

## Flujo de trabajo (deploy y pruebas)
- **Prod**: https://polla-galletas-eta.vercel.app/ — `git push` a `main` dispara build+deploy de Vercel solo (~30-60 s).
- **Gotcha de login local**: el Site URL de Supabase apunta a prod, así que el login con Google en
  `localhost` redirige a producción. Estando logueado **no se ven los cambios locales**: hay que
  desplegar para probarlos en vivo (o previsualizar con un mockup HTML estático que enlace
  `src/styles.css` servido por el dev server de Vite).
- **Verificar un deploy** sin loguearse: comparar el hash del bundle (`assets/index-[hash].js`) que
  sirve prod contra el del build local, y/o `curl` del JS y buscar un texto nuevo de la feature.
- **Commits**: en español, descriptivos del "por qué". **Sin firma de IA** (no `Co-Authored-By`).

## Ideas / TODO
- [ ] Fase de eliminación (round of 32 → final) cuando se definan los cruces.
- [x] Definir `INSCRIPCION.monto` (fijado en `$10.000` CLP; `montoNumber` lo deriva). Hecho.
- [x] Pantalla Premios con reparto del pozo entre los primeros (60/30/10), editable en `PREMIOS`. Hecho.
- [ ] Opcional: confirmación automática de la transferencia (hoy el organizador marca a mano quién pagó).
- [ ] Opcional: traer resultados automáticamente con una función serverless en Vercel
      (consultar un API de marcadores o la API de Anthropic con key del lado servidor).
- [ ] Opcional: estadística de "mejor pronosticador por jornada".
- [x] Reglas/ayuda explicadas dentro de la app (glosario de signo/diferencia + ejemplos). Hecho.

## Convenciones
- UI y nombres de selecciones en español.
- Mantener pocas dependencias. No exponer secretos en el frontend (la `anon key` es pública por diseño;
  la seguridad real vive en las políticas RLS del `schema.sql`).
