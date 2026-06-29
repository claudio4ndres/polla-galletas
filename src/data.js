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

// Estadios (sede oficial de cada ciudad anfitriona). Código → "Estadio, Ciudad".
const VENUES = {
  AZT: "Estadio Azteca, Ciudad de México", AKR: "Estadio Akron, Guadalajara",
  BBVA: "Estadio BBVA, Monterrey", BMO: "BMO Field, Toronto", BCP: "BC Place, Vancouver",
  SOFI: "SoFi Stadium, Los Ángeles", LEVI: "Levi's Stadium, San Francisco",
  MET: "MetLife Stadium, Nueva York", GIL: "Gillette Stadium, Boston", NRG: "NRG Stadium, Houston",
  ATT: "AT&T Stadium, Dallas", LINC: "Lincoln Financial Field, Filadelfia",
  MBS: "Mercedes-Benz Stadium, Atlanta", LUM: "Lumen Field, Seattle",
  HRD: "Hard Rock Stadium, Miami", ARR: "Arrowhead Stadium, Kansas City",
};

// [grupo, jornada, día-junio, local, visita, hora (Chile, "HH:MM"), código-estadio]
// La hora está en horario de Chile (= ET de EE.UU. en junio, UTC-4). El "día" es el día real en Chile:
// los 5 partidos de medianoche (00:00) caen el día siguiente a su jornada.
const RAW = [
  ["A", 1, 11, "México", "Sudáfrica", "15:00", "AZT"], ["A", 1, 11, "Corea del Sur", "Chequia", "22:00", "AKR"],
  ["A", 2, 18, "Chequia", "Sudáfrica", "12:00", "MBS"], ["A", 2, 18, "México", "Corea del Sur", "21:00", "AKR"],
  ["A", 3, 24, "Chequia", "México", "21:00", "AZT"], ["A", 3, 24, "Sudáfrica", "Corea del Sur", "21:00", "BBVA"],
  ["B", 1, 12, "Canadá", "Bosnia", "15:00", "BMO"], ["B", 1, 13, "Catar", "Suiza", "15:00", "LEVI"],
  ["B", 2, 18, "Suiza", "Bosnia", "15:00", "SOFI"], ["B", 2, 18, "Canadá", "Catar", "18:00", "BCP"],
  ["B", 3, 24, "Suiza", "Canadá", "15:00", "BCP"], ["B", 3, 24, "Bosnia", "Catar", "15:00", "LUM"],
  ["C", 1, 13, "Brasil", "Marruecos", "18:00", "MET"], ["C", 1, 13, "Haití", "Escocia", "21:00", "GIL"],
  ["C", 2, 19, "Escocia", "Marruecos", "18:00", "GIL"], ["C", 2, 19, "Brasil", "Haití", "20:30", "LINC"],
  ["C", 3, 24, "Escocia", "Brasil", "18:00", "HRD"], ["C", 3, 24, "Marruecos", "Haití", "18:00", "MBS"],
  ["D", 1, 12, "Estados Unidos", "Paraguay", "21:00", "SOFI"], ["D", 1, 14, "Australia", "Turquía", "00:00", "BCP"],
  ["D", 2, 19, "Turquía", "Paraguay", "23:00", "LEVI"], ["D", 2, 19, "Estados Unidos", "Australia", "15:00", "LUM"],
  ["D", 3, 25, "Turquía", "Estados Unidos", "22:00", "SOFI"], ["D", 3, 25, "Paraguay", "Australia", "22:00", "LEVI"],
  ["E", 1, 14, "Alemania", "Curazao", "13:00", "NRG"], ["E", 1, 14, "Costa de Marfil", "Ecuador", "19:00", "LINC"],
  ["E", 2, 20, "Alemania", "Costa de Marfil", "16:00", "BMO"], ["E", 2, 20, "Ecuador", "Curazao", "20:00", "ARR"],
  ["E", 3, 25, "Ecuador", "Alemania", "16:00", "MET"], ["E", 3, 25, "Curazao", "Costa de Marfil", "16:00", "LINC"],
  ["F", 1, 14, "Países Bajos", "Japón", "16:00", "ATT"], ["F", 1, 14, "Suecia", "Túnez", "22:00", "BBVA"],
  ["F", 2, 20, "Países Bajos", "Suecia", "13:00", "NRG"], ["F", 2, 21, "Túnez", "Japón", "00:00", "BBVA"],
  ["F", 3, 25, "Japón", "Suecia", "19:00", "ATT"], ["F", 3, 25, "Túnez", "Países Bajos", "19:00", "ARR"],
  ["G", 1, 15, "Irán", "Nueva Zelanda", "21:00", "SOFI"], ["G", 1, 15, "Bélgica", "Egipto", "15:00", "LUM"],
  ["G", 2, 21, "Bélgica", "Irán", "15:00", "SOFI"], ["G", 2, 21, "Nueva Zelanda", "Egipto", "21:00", "BCP"],
  ["G", 3, 26, "Egipto", "Irán", "23:00", "LUM"], ["G", 3, 26, "Nueva Zelanda", "Bélgica", "23:00", "BCP"],
  ["H", 1, 15, "España", "Cabo Verde", "12:00", "MBS"], ["H", 1, 15, "Arabia Saudita", "Uruguay", "18:00", "HRD"],
  ["H", 2, 21, "España", "Arabia Saudita", "12:00", "MBS"], ["H", 2, 21, "Uruguay", "Cabo Verde", "18:00", "HRD"],
  ["H", 3, 26, "Cabo Verde", "Arabia Saudita", "20:00", "NRG"], ["H", 3, 26, "Uruguay", "España", "20:00", "AKR"],
  ["I", 1, 16, "Francia", "Senegal", "15:00", "MET"], ["I", 1, 16, "Irak", "Noruega", "18:00", "GIL"],
  ["I", 2, 22, "Francia", "Irak", "17:00", "LINC"], ["I", 2, 22, "Noruega", "Senegal", "20:00", "MET"],
  ["I", 3, 26, "Noruega", "Francia", "15:00", "GIL"], ["I", 3, 26, "Senegal", "Irak", "15:00", "BMO"],
  ["J", 1, 16, "Argentina", "Argelia", "21:00", "ARR"], ["J", 1, 17, "Austria", "Jordania", "00:00", "LEVI"],
  ["J", 2, 22, "Argentina", "Austria", "13:00", "ATT"], ["J", 2, 22, "Jordania", "Argelia", "23:00", "LEVI"],
  ["J", 3, 27, "Argelia", "Austria", "22:00", "ARR"], ["J", 3, 27, "Jordania", "Argentina", "22:00", "ATT"],
  ["K", 1, 17, "Portugal", "RD Congo", "13:00", "NRG"], ["K", 1, 17, "Uzbekistán", "Colombia", "22:00", "AZT"],
  ["K", 2, 23, "Portugal", "Uzbekistán", "13:00", "NRG"], ["K", 2, 23, "Colombia", "RD Congo", "22:00", "AKR"],
  ["K", 3, 27, "Colombia", "Portugal", "19:30", "HRD"], ["K", 3, 27, "RD Congo", "Uzbekistán", "19:30", "MBS"],
  ["L", 1, 17, "Inglaterra", "Croacia", "16:00", "ATT"], ["L", 1, 17, "Ghana", "Panamá", "19:00", "BMO"],
  ["L", 2, 23, "Inglaterra", "Ghana", "16:00", "GIL"], ["L", 2, 23, "Panamá", "Croacia", "19:00", "BMO"],
  ["L", 3, 27, "Panamá", "Inglaterra", "17:00", "MET"], ["L", 3, 27, "Croacia", "Ghana", "17:00", "LINC"],
];

// ===================== FASE DE ELIMINACIÓN =====================
// Ronda de 32 (16avos de final). Cruces oficiales (terminada la fase de grupos).
// Hora en HORARIO DE CHILE (UTC-4). [ronda, mes(0-idx: 5=jun, 6=jul), día, local, visita, "HH:MM" Chile, código-estadio]
const RAW_KO = [
  // Sudáfrica-Canadá (28-jun) se omite a propósito: se jugó antes de habilitar los 16avos, así que no se pronostica ni puntúa.
  ["16avos", 5, 29, "Brasil", "Japón", "13:00", "NRG"],
  ["16avos", 5, 29, "Alemania", "Paraguay", "16:30", "GIL"],
  ["16avos", 5, 29, "Países Bajos", "Marruecos", "21:00", "BBVA"],
  ["16avos", 5, 30, "Costa de Marfil", "Noruega", "13:00", "ATT"],
  ["16avos", 5, 30, "Francia", "Suecia", "17:00", "MET"],
  ["16avos", 5, 30, "México", "Ecuador", "21:00", "AZT"],
  ["16avos", 6, 1, "Inglaterra", "RD Congo", "12:00", "MBS"],
  ["16avos", 6, 1, "Bélgica", "Senegal", "16:00", "LUM"],
  ["16avos", 6, 1, "Estados Unidos", "Bosnia", "20:00", "LEVI"],
  ["16avos", 6, 2, "España", "Austria", "15:00", "SOFI"],
  ["16avos", 6, 2, "Portugal", "Croacia", "19:00", "BMO"],
  ["16avos", 6, 2, "Suiza", "Argelia", "23:00", "BCP"],
  ["16avos", 6, 3, "Australia", "Egipto", "14:00", "ATT"],
  ["16avos", 6, 3, "Argentina", "Cabo Verde", "18:00", "HRD"],
  ["16avos", 6, 3, "Colombia", "Ghana", "21:30", "ARR"],
];

const MES = { 5: "jun", 6: "jul" };

// Fase de grupos (72 partidos, todo junio).
const groupMatches = RAW.map((m, i) => {
  const [group, jornada, day, home, away, time, venueCode] = m;
  const [H, M] = time.split(":").map(Number);
  return {
    id: "m" + i, phase: "grupos", group, jornada, day, mes: 5, home, away, time,
    roundLabel: "J" + jornada, dateLabel: day + " " + MES[5],
    venue: VENUES[venueCode], kickoff: Date.UTC(2026, 5, day, H + 4, M, 0),
  };
});
// Fase de eliminación. UTC = Chile + 4h; Date.UTC con el mes correcto (junio/julio).
const koMatches = RAW_KO.map((m, i) => {
  const [ronda, mes, day, home, away, time, venueCode] = m;
  const [H, M] = time.split(":").map(Number);
  return {
    id: "k" + i, phase: "ko", ronda, day, mes, home, away, time,
    roundLabel: ronda, dateLabel: day + " " + MES[mes],
    venue: VENUES[venueCode], kickoff: Date.UTC(2026, mes, day, H + 4, M, 0),
  };
});

export const MATCHES = [...groupMatches, ...koMatches];

export const GROUPS = [..."ABCDEFGHIJKL"];
// Rondas de eliminación presentes (la UI las muestra como secciones, después de los grupos).
export const KO_ROUNDS = ["16avos"];
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

// Cierre de pronósticos: 11-jun-2026 19:00 hora de Chile (UTC-4) = 23:00 UTC.
// (Extensión manual del plazo de inscripción.)
// Se expresa en UTC para que sea el mismo instante en cualquier zona horaria. mes 5 = junio (0-indexed).
export const DEADLINE = Date.UTC(2026, 5, 11, 23, 0, 0);

// Devuelve true si now >= deadline (el momento exacto del deadline ya es bloqueado).
export function isLocked(now = Date.now(), deadline = DEADLINE) {
  return now >= deadline;
}

// Cierre por partido: se puede editar hasta 30 min antes de su inicio; desde ahí queda cerrado.
export const LOCK_BEFORE_MS = 30 * 60 * 1000;
export function isMatchLocked(match, now = Date.now()) {
  return now >= match.kickoff - LOCK_BEFORE_MS;
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
