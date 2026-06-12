# Resultados automáticos

`sync-resultados.mjs` carga los **resultados finales** de los partidos del Mundial 2026 en la tabla
`results` de Supabase, sin que nadie los ingrese a mano. Corre solo en **GitHub Actions** cada 30 min
(workflow `.github/workflows/sync-resultados.yml`).

## Cómo funciona
- Baja el calendario con resultados de **OpenFootball** (datos abiertos, sin API key):
  `https://raw.githubusercontent.com/openfootball/worldcup.json`
- Toma los partidos **ya jugados** (los que tienen marcador final) y los mapea a los `m0…m71` de la app
  (traduce los nombres inglés→español usando el mismo fixture de `src/data.js`).
- **Solo escribe un resultado si ese partido aún no lo tiene.** Si corriges un marcador a mano desde
  el panel de Resultados, el sync **no lo pisa**.

## Setup (una sola vez) — lo haces tú
El script necesita la **`service_role` key** de Supabase para escribir (salta las reglas RLS). Es
secreta: nunca va al frontend ni al repo, solo a los secretos de GitHub.

1. **Copia la key:** Supabase → tu proyecto → **Project Settings → API** → sección **Project API keys**
   → copia la **`service_role`** (la "secret", no la `anon`).
2. **Pégala en GitHub:** repo `polla-galletas` → **Settings → Secrets and variables → Actions** →
   **New repository secret**:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Secret: (la key que copiaste)
3. Listo. El workflow ya corre cada 30 min. Para probarlo ahora: pestaña **Actions** →
   "Sincronizar resultados (Mundial 2026)" → **Run workflow**.

> Sin ese secreto, el workflow corre igual pero en **dry-run**: muestra en los logs qué cargaría,
> sin escribir nada. Así puedes ver que el mapeo funciona antes de pegar la key.

## Probar en local
```bash
node scripts/sync-resultados.mjs          # dry-run (no escribe; solo muestra)
SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/sync-resultados.mjs   # escribe de verdad
```

## Si una selección no mapea
Si OpenFootball cambia cómo escribe un nombre, el log avisa `⚠ Equipos sin mapear`. En ese caso se
agrega la equivalencia en el objeto `EN_TO_ES` dentro de `sync-resultados.mjs`.
