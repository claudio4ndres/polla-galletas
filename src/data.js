// ===================== DATOS DEL MUNDIAL 2026 (fase de grupos) =====================
// 72 partidos, 12 grupos. Selecciones de repesca ya definidas (play-offs marzo 2026).

export const FLAGS = {
  "México": "🇲🇽", "Sudáfrica": "🇿🇦", "Corea del Sur": "🇰🇷", "Canadá": "🇨🇦",
  "Catar": "🇶🇦", "Suiza": "🇨🇭", "Brasil": "🇧🇷", "Marruecos": "🇲🇦",
  "Haití": "🇭🇹", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Estados Unidos": "🇺🇸", "Paraguay": "🇵🇾",
  "Australia": "🇦🇺", "Alemania": "🇩🇪", "Curazao": "🇨🇼", "Costa de Marfil": "🇨🇮",
  "Ecuador": "🇪🇨", "Países Bajos": "🇳🇱", "Japón": "🇯🇵", "Túnez": "🇹🇳",
  "Irán": "🇮🇷", "Nueva Zelanda": "🇳🇿", "Bélgica": "🇧🇪", "Egipto": "🇪🇬",
  "España": "🇪🇸", "Cabo Verde": "🇨🇻", "Arabia Saudita": "🇸🇦", "Uruguay": "🇺🇾",
  "Francia": "🇫🇷", "Senegal": "🇸🇳", "Noruega": "🇳🇴", "Argentina": "🇦🇷",
  "Argelia": "🇩🇿", "Austria": "🇦🇹", "Jordania": "🇯🇴", "Portugal": "🇵🇹",
  "Uzbekistán": "🇺🇿", "Colombia": "🇨🇴", "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croacia": "🇭🇷",
  "Ghana": "🇬🇭", "Panamá": "🇵🇦",
  "Chequia": "🇨🇿", "Bosnia": "🇧🇦", "Turquía": "🇹🇷", "Suecia": "🇸🇪",
  "RD Congo": "🇨🇩", "Irak": "🇮🇶",
};
export const flag = (t) => FLAGS[t] || "⚽";

const RAW = [
  ["A", 1, 11, "México", "Sudáfrica"], ["A", 1, 11, "Corea del Sur", "Chequia"],
  ["A", 2, 18, "Chequia", "Sudáfrica"], ["A", 2, 18, "México", "Corea del Sur"],
  ["A", 3, 24, "Chequia", "México"], ["A", 3, 24, "Sudáfrica", "Corea del Sur"],
  ["B", 1, 12, "Canadá", "Bosnia"], ["B", 1, 13, "Catar", "Suiza"],
  ["B", 2, 18, "Suiza", "Bosnia"], ["B", 2, 18, "Canadá", "Catar"],
  ["B", 3, 24, "Suiza", "Canadá"], ["B", 3, 24, "Bosnia", "Catar"],
  ["C", 1, 13, "Brasil", "Marruecos"], ["C", 1, 13, "Haití", "Escocia"],
  ["C", 2, 19, "Escocia", "Marruecos"], ["C", 2, 19, "Brasil", "Haití"],
  ["C", 3, 24, "Escocia", "Brasil"], ["C", 3, 24, "Marruecos", "Haití"],
  ["D", 1, 12, "Estados Unidos", "Paraguay"], ["D", 1, 13, "Australia", "Turquía"],
  ["D", 2, 19, "Turquía", "Paraguay"], ["D", 2, 19, "Estados Unidos", "Australia"],
  ["D", 3, 25, "Turquía", "Estados Unidos"], ["D", 3, 25, "Paraguay", "Australia"],
  ["E", 1, 14, "Alemania", "Curazao"], ["E", 1, 14, "Costa de Marfil", "Ecuador"],
  ["E", 2, 20, "Alemania", "Costa de Marfil"], ["E", 2, 20, "Ecuador", "Curazao"],
  ["E", 3, 25, "Ecuador", "Alemania"], ["E", 3, 25, "Curazao", "Costa de Marfil"],
  ["F", 1, 14, "Países Bajos", "Japón"], ["F", 1, 14, "Suecia", "Túnez"],
  ["F", 2, 20, "Países Bajos", "Suecia"], ["F", 2, 20, "Túnez", "Japón"],
  ["F", 3, 25, "Japón", "Suecia"], ["F", 3, 25, "Túnez", "Países Bajos"],
  ["G", 1, 15, "Irán", "Nueva Zelanda"], ["G", 1, 15, "Bélgica", "Egipto"],
  ["G", 2, 21, "Bélgica", "Irán"], ["G", 2, 21, "Nueva Zelanda", "Egipto"],
  ["G", 3, 26, "Egipto", "Irán"], ["G", 3, 26, "Nueva Zelanda", "Bélgica"],
  ["H", 1, 15, "España", "Cabo Verde"], ["H", 1, 15, "Arabia Saudita", "Uruguay"],
  ["H", 2, 21, "España", "Arabia Saudita"], ["H", 2, 21, "Uruguay", "Cabo Verde"],
  ["H", 3, 26, "Cabo Verde", "Arabia Saudita"], ["H", 3, 26, "Uruguay", "España"],
  ["I", 1, 16, "Francia", "Senegal"], ["I", 1, 16, "Irak", "Noruega"],
  ["I", 2, 22, "Francia", "Irak"], ["I", 2, 22, "Noruega", "Senegal"],
  ["I", 3, 26, "Noruega", "Francia"], ["I", 3, 26, "Senegal", "Irak"],
  ["J", 1, 16, "Argentina", "Argelia"], ["J", 1, 16, "Austria", "Jordania"],
  ["J", 2, 22, "Argentina", "Austria"], ["J", 2, 22, "Jordania", "Argelia"],
  ["J", 3, 27, "Argelia", "Austria"], ["J", 3, 27, "Jordania", "Argentina"],
  ["K", 1, 17, "Portugal", "RD Congo"], ["K", 1, 17, "Uzbekistán", "Colombia"],
  ["K", 2, 23, "Portugal", "Uzbekistán"], ["K", 2, 23, "Colombia", "RD Congo"],
  ["K", 3, 27, "Colombia", "Portugal"], ["K", 3, 27, "RD Congo", "Uzbekistán"],
  ["L", 1, 17, "Inglaterra", "Croacia"], ["L", 1, 17, "Ghana", "Panamá"],
  ["L", 2, 23, "Inglaterra", "Ghana"], ["L", 2, 23, "Panamá", "Croacia"],
  ["L", 3, 27, "Panamá", "Inglaterra"], ["L", 3, 27, "Croacia", "Ghana"],
];

export const MATCHES = RAW.map((m, i) => ({
  id: "m" + i, group: m[0], jornada: m[1], day: m[2], home: m[3], away: m[4],
}));

export const GROUPS = [..."ABCDEFGHIJKL"];
export const PTS_EXACT = 3, PTS_DIFF = 2, PTS_SIGN = 1;

// ===================== INSCRIPCIÓN / CUOTA DE PARTICIPACIÓN =====================
// Datos de transferencia (fijos, iguales para todos). El jugador transfiere y luego
// el organizador confirma manualmente quién pagó desde la pestaña Resultados → modo organizador.
// Cuando lo confirma, esa persona obtiene el distintivo "Premium".
export const INSCRIPCION = {
  monto: "$10.000", // Cuota de inscripción (CLP). El pozo se reparte entre los primeros (ver PREMIOS).
  transferencia: {
    titular: "Claudio Figueroa",
    rut: "17.675.629-2",
    banco: "Banco de Chile",
    tipo: "Cuenta Corriente",
    cuenta: "00-800-49317-06",
    email: "claudio.figueroa.arias@gmail.com",
  },
};

// Cuota como número en CLP, derivada de INSCRIPCION.monto ("$10.000" → 10000).
export const montoNumber = parseInt(String(INSCRIPCION.monto).replace(/[^\d]/g, ""), 10) || 0;

// ===================== PREMIOS (reparto del pozo) =====================
// El pozo = cuota (montoNumber) × inscritos pagados. Se reparte entre los primeros de la tabla.
// Para cambiar el reparto, edita estos porcentajes (deben sumar 100). Agrega/quita filas para
// más o menos premiados; la pantalla "Premios" se adapta sola.
export const PREMIOS = [
  { pos: 1, label: "Primer lugar", pct: 60 },
  { pos: 2, label: "Segundo lugar", pct: 30 },
  { pos: 3, label: "Tercer lugar", pct: 10 },
];

// El Mundial arranca el 11-jun-2026. Se puede editar hasta ese momento; luego TODO queda cerrado.
// DEADLINE en UTC: 11-jun-2026 04:00 UTC = 11-jun-2026 00:00 Chile (UTC-4) = 11-jun-2026 12:00 Seúl (UTC+8)
export const DEADLINE = Date.UTC(2026, 5, 11, 4, 0, 0); // mes 5 = junio (0-indexed)

// Devuelve true si now >= deadline (el momento exacto del deadline ya es bloqueado).
export function isLocked(now = Date.now(), deadline = DEADLINE) {
  return now >= deadline;
}

// Puntaje estándar de 3 niveles: exacto / diferencia de goles / signo (1-X-2).
export function scorePick(pick, res) {
  if (!pick || !res || !Array.isArray(pick) || !Array.isArray(res)) return 0;
  const [ph, pa] = pick, [rh, ra] = res;
  if ([ph, pa, rh, ra].some((x) => x === null || x === undefined || x === "")) return 0;
  const PH = +ph, PA = +pa, RH = +rh, RA = +ra;
  if (PH === RH && PA === RA) return PTS_EXACT;          // marcador exacto
  const sr = Math.sign(RH - RA), sp = Math.sign(PH - PA);
  if (sr !== sp) return 0;                               // erró el signo
  if (sr === 0) return PTS_SIGN;                         // empate acertado, no exacto
  return (RH - RA === PH - PA) ? PTS_DIFF : PTS_SIGN;    // misma diferencia, o solo signo
}
