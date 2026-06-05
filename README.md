# Polla Mundial 2026 · Galletas FC

App web para la polla del Mundial 2026 del equipo **Galletas FC** (fútbol amateur, Santiago de Chile).
Cada integrante entra con su cuenta de Google, pronostica los 72 partidos de la fase de grupos y la
tabla de posiciones se calcula sola. Un organizador carga los resultados reales y administra las
inscripciones.

## Qué hace

- **Login con Google** (SSO vía Supabase): sin contraseñas nuevas; el nombre sale del perfil de Google.
- **Pronósticos** de los 72 partidos de la fase de grupos, editables hasta el cierre. Cada uno guarda
  los suyos con su nombre y aparece en la tabla del equipo.
- **Tabla de posiciones automática**: se recalcula a medida que el organizador carga resultados.
- **Puntaje estándar de 3 niveles**: marcador exacto = 3, ganador más diferencia de goles = 2,
  acertar solo el signo (quién gana o empate) = 1, errar = 0.
- **Escala de acierto por color**: con el resultado cargado, cada marcador se tiñe según cuánto
  acertaste (exacto en verde y degradado hacia los aciertos parciales).
- **Inscripción por transferencia bancaria**: cada jugador ve los datos de transferencia y un botón
  para copiarlos. El organizador confirma a mano quién pagó; al confirmarse aparece el distintivo
  Premium en su tarjeta y en la tabla.
- **Premios**: pantalla con el pozo (la cuota multiplicada por los inscritos confirmados) y cómo se
  reparte entre los primeros de la tabla (hoy 60/30/10 para el primero, segundo y tercero), editable.
- **Panel de organizador**: para cargar los resultados reales y marcar las inscripciones pagadas.
  Solo los correos autorizados pueden escribir resultados y pagos.
- **Cierre único** el 11 de junio de 2026: al arrancar el Mundial todas las predicciones quedan
  congeladas.
- **Reglas explicadas dentro de la app**, con un glosario de signo y diferencia, más un botón
  "Prueba tu suerte" que autocompleta marcadores al azar para revisar y ajustar antes de guardar.
- **Tema oscuro** propio del club y diseño responsive.

Stack: React + Vite (frontend) · Supabase (auth con Google y base de datos Postgres) · Vercel (hosting).

---

## Lo que necesitas crear tú

No puedo crear cuentas ni manejar tus llaves por ti, así que estos pasos los haces tú una sola vez.
Toma ~20 minutos. Todo es gratis.

### 1) Proyecto en Supabase
1. Entra a https://supabase.com → crea una cuenta → **New project**.
2. Elige nombre y contraseña de base de datos (guárdala). Región: la más cercana (ej. São Paulo).
3. Cuando termine de crearse, ve a **SQL Editor → New query**, pega TODO el contenido de
   `supabase/schema.sql` y presiona **Run**.
4. En ese mismo SQL, cambia `TUCORREO@gmail.com` por el correo de Google con el que TÚ entrarás
   (ese será el organizador que puede cargar resultados). Vuelve a correr esa línea si la editaste después.

### 2) Login con Google
Google necesita unas credenciales (esto es lo que hace que aparezca la ventana "elige tu cuenta").
1. Ve a https://console.cloud.google.com → crea un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth** → tipo **Externo** → completa lo básico
   (nombre de la app, tu correo) y guarda.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
4. En **URIs de redireccionamiento autorizados** agrega exactamente:
   ```
   https://TU_PROYECTO.supabase.co/auth/v1/callback
   ```
   (Reemplaza `TU_PROYECTO` por el de tu URL de Supabase, que ves en Project Settings → API.)
5. Copia el **Client ID** y el **Client Secret**.
6. En Supabase: **Authentication → Providers → Google** → pégalos y activa el proveedor.
7. En Supabase: **Authentication → URL Configuration** → en **Site URL** pon, por ahora,
   `http://localhost:5173` (lo cambiarás por la URL de Vercel cuando despliegues), y agrega también
   tu futura URL de Vercel en **Redirect URLs** cuando la tengas.

### 3) Variables de entorno
1. Copia `.env.example` a `.env`.
2. Rellena con los valores de **Supabase → Project Settings → API**:
   ```
   VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_public_key
   ```
   (La `anon public` key es segura para el frontend: las reglas de seguridad de la base ya están puestas en el SQL.)

---

## Probar en tu computador

```bash
npm install
npm run dev
```
Abre http://localhost:5173 y prueba el login con Google.

---

## Subir a Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En https://vercel.com → **Add New → Project** → importa el repo.
   Vercel detecta Vite solo (build: `npm run build`, salida: `dist`).
3. En **Settings → Environment Variables** agrega las mismas dos:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. **Deploy**. Te dará una URL tipo `https://galletas-fc-polla.vercel.app`.
5. Vuelve a **Supabase → Authentication → URL Configuration** y pon esa URL de Vercel como
   **Site URL**, y agrégala en **Redirect URLs**. (Si no, el login redirige mal.)
6. Comparte el link con las Galletas. Cada uno entra con su Google y a pronosticar.

> ¿Prefieres tu EcoHosting en vez de Vercel? Corre `npm run build` y sube el contenido de la
> carpeta `dist/` a `public_html`. Necesitarás un dominio (Google OAuth no funciona sobre una IP
> pelada) y, como es una SPA, agrega una regla en `.htaccess` que redirija todo a `index.html`.

---

## ¿Cómo se reparte el puntaje?

Por cada partido:
- **3 pts** — marcador exacto (ej: dijiste 2-1 y fue 2-1).
- **2 pts** — acertaste el ganador y la diferencia de goles, pero no el marcador (dijiste 2-0 y fue 3-1).
- **1 pt** — acertaste solo el signo: quién gana, o que fue empate (dijiste 2-0 y fue 1-0; o 1-1 y fue 2-2).
- **0 pts** — erraste el resultado.
