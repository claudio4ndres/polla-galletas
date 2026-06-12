#!/usr/bin/env node
/*
 * Sincroniza los resultados FINALES del Mundial 2026 desde OpenFootball (datos abiertos,
 * sin API key) hacia la tabla `results` de Supabase. Pensado para GitHub Actions cada ~30 min.
 *
 * - Solo carga partidos YA JUGADOS (los que tienen score.ft en OpenFootball).
 * - Solo escribe los que AÚN NO tienen resultado en la BD (no pisa correcciones manuales).
 * - Sin SUPABASE_SERVICE_ROLE_KEY corre en modo DRY-RUN (muestra qué haría, sin escribir).
 *
 * Variables de entorno (secretos de GitHub):
 *   SUPABASE_SERVICE_ROLE_KEY  (secreta, salta las reglas RLS) — requerida para escribir.
 *   SUPABASE_URL               (opcional; por defecto la URL del proyecto).
 */
import fs from "node:fs";

const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbswypxwpkcmjerrfoyw.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DRY_RUN = !SERVICE_KEY;

// Nombre OpenFootball (inglés) → nombre de la app (español). Cubre las 48 selecciones del fixture.
const EN_TO_ES = {
  "Mexico": "México", "South Africa": "Sudáfrica", "South Korea": "Corea del Sur",
  "Czech Republic": "Chequia", "Canada": "Canadá", "Bosnia & Herzegovina": "Bosnia",
  "Qatar": "Catar", "Switzerland": "Suiza", "Brazil": "Brasil", "Morocco": "Marruecos",
  "Haiti": "Haití", "Scotland": "Escocia", "USA": "Estados Unidos", "Paraguay": "Paraguay",
  "Australia": "Australia", "Turkey": "Turquía", "Germany": "Alemania", "Curaçao": "Curazao",
  "Ivory Coast": "Costa de Marfil", "Ecuador": "Ecuador", "Netherlands": "Países Bajos",
  "Japan": "Japón", "Sweden": "Suecia", "Tunisia": "Túnez", "Belgium": "Bélgica",
  "Egypt": "Egipto", "Iran": "Irán", "New Zealand": "Nueva Zelanda", "Spain": "España",
  "Cape Verde": "Cabo Verde", "Saudi Arabia": "Arabia Saudita", "Uruguay": "Uruguay",
  "France": "Francia", "Senegal": "Senegal", "Iraq": "Irak", "Norway": "Noruega",
  "Argentina": "Argentina", "Algeria": "Argelia", "Austria": "Austria", "Jordan": "Jordania",
  "Portugal": "Portugal", "DR Congo": "RD Congo", "Uzbekistan": "Uzbekistán",
  "Colombia": "Colombia", "England": "Inglaterra", "Croatia": "Croacia", "Ghana": "Ghana",
  "Panama": "Panamá",
};

const teamName = (t) => (typeof t === "string" ? t : t?.name) ?? "";

// Carga el fixture (m0..m71) desde src/data.js, que es ESM puro sin imports, para reusar el MISMO
// orden de IDs que usa la app. Lo importamos como módulo data: URL (no depende del package.json).
async function loadFixture() {
  const src = fs.readFileSync(new URL("../src/data.js", import.meta.url), "utf8");
  const mod = await import("data:text/javascript," + encodeURIComponent(src));
  return mod.MATCHES;
}

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase GET ${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbInsert(rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/results`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase POST results → ${r.status} ${await r.text()}`);
}

async function main() {
  const MATCHES = await loadFixture();
  // Índice por par de equipos (en español); guardamos si hay que invertir el marcador.
  const byPair = new Map();
  for (const m of MATCHES) {
    byPair.set(m.home + "||" + m.away, { id: m.id, swap: false });
    byPair.set(m.away + "||" + m.home, { id: m.id, swap: true });
  }

  const res = await fetch(OPENFOOTBALL_URL);
  if (!res.ok) throw new Error("OpenFootball respondió " + res.status);
  const data = await res.json();
  const ofMatches = data.matches || (data.rounds || []).flatMap((r) => r.matches || []);

  const mapped = [];
  const unmapped = new Set();
  let realPairs = 0, realPairsMatched = 0;
  for (const m of ofMatches) {
    const t1 = teamName(m.team1), t2 = teamName(m.team2);
    const es1 = EN_TO_ES[t1], es2 = EN_TO_ES[t2];
    if (!es1 && !es2) continue;          // ambos placeholders (eliminatorias sin definir) → ignorar
    if (!es1) { unmapped.add(t1); continue; }
    if (!es2) { unmapped.add(t2); continue; }
    realPairs++;
    const hit = byPair.get(es1 + "||" + es2);
    if (!hit) { console.warn("Par sin partido en el fixture:", es1, "vs", es2); continue; }
    realPairsMatched++;
    const ft = m.score?.ft;
    if (!Array.isArray(ft) || ft.length < 2) continue; // mapeado, pero aún sin resultado final
    mapped.push({
      match_id: hit.id,
      home: Number(hit.swap ? ft[1] : ft[0]),
      away: Number(hit.swap ? ft[0] : ft[1]),
    });
  }

  if (unmapped.size) console.warn("⚠ Equipos sin mapear (revisar EN_TO_ES):", [...unmapped].join(", "));
  console.log(`Cobertura del fixture: ${realPairsMatched}/${realPairs} pares de selecciones mapeados (esperado 72/72).`);
  console.log(`OpenFootball: ${ofMatches.length} partidos · ${mapped.length} con resultado final mapeados.`);

  let have = new Set();
  if (!DRY_RUN) {
    const existing = await sbGet("results?select=match_id");
    have = new Set(existing.map((r) => r.match_id));
  }
  const nuevos = mapped.filter((m) => !have.has(m.match_id));
  console.log(`Ya en la BD: ${have.size} · nuevos a cargar: ${nuevos.length}`);
  nuevos.forEach((m) => console.log(`  + ${m.match_id}: ${m.home}-${m.away}`));

  if (DRY_RUN) { console.log("[DRY-RUN] sin SUPABASE_SERVICE_ROLE_KEY: no se escribió nada."); return; }
  if (!nuevos.length) { console.log("Nada nuevo que cargar."); return; }

  await sbInsert(nuevos.map((m) => ({ ...m, updated_at: new Date().toISOString() })));
  console.log(`✓ Cargados ${nuevos.length} resultados nuevos en Supabase.`);
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
