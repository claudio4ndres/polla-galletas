// ===================== PROBABILIDAD POR GOLES (modelo Poisson) =====================
// Estima el marcador probable de un partido próximo en base a los resultados ya cargados.
// Idea: fuerza de ataque y de defensa de cada equipo respecto al promedio del torneo;
// con eso se calculan los goles esperados de cada lado y, vía Poisson, la probabilidad de
// cada marcador. Es una ESTIMACIÓN orientativa (con pocos partidos jugados, es ruidosa).

import { MATCHES } from "./data.js";

const BY_ID = Object.fromEntries(MATCHES.map((m) => [m.id, m]));
const HOME = 1.05, AWAY = 0.97; // ventaja de localía modesta (Mundial, casi neutral)

// Acumula goles a favor / en contra y partidos jugados por equipo, desde los resultados.
// Se calcula una sola vez por render (no por partido).
export function computeStats(results) {
  const stats = {};
  let goles = 0, partidosEquipo = 0;
  for (const id in results) {
    const r = results[id], m = BY_ID[id];
    if (!m || !r) continue;
    const h = +r[0], a = +r[1];
    if (!Number.isFinite(h) || !Number.isFinite(a)) continue;
    (stats[m.home] ||= { gf: 0, ga: 0, pj: 0 });
    (stats[m.away] ||= { gf: 0, ga: 0, pj: 0 });
    stats[m.home].gf += h; stats[m.home].ga += a; stats[m.home].pj++;
    stats[m.away].gf += a; stats[m.away].ga += h; stats[m.away].pj++;
    goles += h + a; partidosEquipo += 2;
  }
  const avg = partidosEquipo > 0 ? goles / partidosEquipo : 1.2; // goles prom. por equipo/partido
  return { stats, avg };
}

// Poisson: P(k goles) = e^-λ · λ^k / k!
function pois(k, l) {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return Math.exp(-l) * Math.pow(l, k) / f;
}

// Predicción de un partido. statsObj = computeStats(results).
// Devuelve { enough:false } si algún equipo todavía no jugó (sin datos).
export function predictMatch(home, away, statsObj) {
  const { stats, avg } = statsObj;
  const H = stats[home], A = stats[away];
  if (!H || !A || H.pj < 1 || A.pj < 1) return { enough: false };

  const atk = (s) => s.gf / s.pj / avg;   // fuerza de ataque (1 = promedio)
  const def = (s) => s.ga / s.pj / avg;   // flojera defensiva (1 = promedio)
  const lamH = Math.min(Math.max(atk(H) * def(A) * avg * HOME, 0.2), 5); // goles esperados local
  const lamA = Math.min(Math.max(atk(A) * def(H) * avg * AWAY, 0.2), 5); // goles esperados visita

  let pH = 0, pD = 0, pA = 0, pOver = 0, pBtts = 0, tot = 0;
  const grid = [];
  for (let h = 0; h < 7; h++) {
    const ph = pois(h, lamH);
    for (let a = 0; a < 7; a++) {
      const p = ph * pois(a, lamA);
      grid.push({ h, a, p }); tot += p;
      if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
      if (h + a >= 3) pOver += p;        // más de 2.5 goles
      if (h >= 1 && a >= 1) pBtts += p;   // ambos marcan
    }
  }
  const top = grid.sort((x, y) => y.p - x.p).slice(0, 5)
    .map((g) => ({ h: g.h, a: g.a, p: g.p / tot }));
  return {
    enough: true,
    lamH, lamA,
    pHome: pH / tot, pDraw: pD / tot, pAway: pA / tot,
    pOver: pOver / tot, pBtts: pBtts / tot,
    top,
    pj: Math.min(H.pj, A.pj), // partidos jugados (el menor de los dos) → confianza
  };
}
