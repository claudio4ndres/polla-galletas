import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  MATCHES, GROUPS, flag, scorePick, isMatchLocked, LOCK_BEFORE_MS, INSCRIPCION, PREMIOS, montoNumber,
} from "./data";

/* ============================ AUTH WRAPPER ============================ */
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return <div className="g-root"><div className="g-center"><div className="g-spin" /></div></div>;
  }
  if (!session) return <Login />;
  return <Polla session={session} />;
}

/* ============================ LOGIN ============================ */
function GoogleIcon() {
  return (
    <svg className="g-gicon" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.7-9.6 6.7-17z" />
      <path fill="#FBBC05" d="M10.3 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.1-5.5c-2 1.3-4.6 2.1-8.2 2.1-6.4 0-11.8-3.7-13.7-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function Login() {
  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      // prompt:"select_account" obliga a Google a mostrar SIEMPRE el selector de cuenta,
      // así nadie entra con la cuenta equivocada (y se cambia cerrando sesión y volviendo a entrar).
      options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
    });
  return (
    <div className="g-root"><div className="g-wrap">
      <div className="g-hero">
        <div className="g-logo"><img src="/logo.jpg" alt="Galletas FC" /></div>
        <div className="g-eyebrow">⚽ Polla Mundial · 2026</div>
        <div className="g-tag">Galletas FC · Fundado 10·04·2019 · Fútbol 7 &amp; 11</div>
      </div>
      <div className="g-card" style={{ marginTop: 10 }}>
        <div className="g-disp" style={{ fontSize: 22, marginBottom: 6 }}>Entra a la polla</div>
        <p className="g-help" style={{ marginBottom: 16 }}>
          Inicia sesión con tu cuenta de Google. Tus pronósticos quedan guardados con tu nombre y
          aparecerás en la tabla del equipo. Sin contraseñas nuevas que recordar.
        </p>
        <button className="g-btn google" onClick={signIn}><GoogleIcon /> Entrar con Google</button>
      </div>
      <Footer />
    </div></div>
  );
}

/* ============================ APP PRINCIPAL ============================ */
function Polla({ session }) {
  const user = session.user;
  const googleName = prettyName(
    user.user_metadata?.full_name || user.user_metadata?.name || user.email
  );
  const myEmail = user.email;

  const [displayName, setDisplayName] = useState(googleName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [tab, setTab] = useState("pred");
  const [picks, setPicks] = useState({});
  const [results, setResults] = useState({});
  const [board, setBoard] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [paidSet, setPaidSet] = useState(() => new Set());
  const [players, setPlayers] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const show = (m) => { setToast(m); setTimeout(() => setToast(""), 1900); };

  // Carga inicial: mis pronósticos, resultados, y si soy admin.
  useEffect(() => {
    (async () => {
      const [{ data: mine }, resMap, admin, paid] = await Promise.all([
        supabase.from("predictions").select("picks,name").eq("user_id", user.id).maybeSingle(),
        loadResults(),
        checkAdmin(myEmail),
        loadPayments(),
      ]);
      if (mine?.picks) setPicks(mine.picks);
      // Respeta el nombre guardado solo si es un nombre de verdad (no un correo); así no pisa lo que cada uno editó.
      if (mine?.name && !mine.name.includes("@")) setDisplayName(mine.name);
      setResults(resMap);
      setIsAdmin(admin);
      setPaidSet(paid);
      setLoading(false);
    })();
  }, [user.id, myEmail]);

  const setPick = (mid, idx, val) => {
    const v = val === "" ? "" : Math.max(0, Math.min(20, parseInt(val) || 0));
    setPicks((p) => { const c = p[mid] ? [...p[mid]] : ["", ""]; c[idx] = v; return { ...p, [mid]: c }; });
  };

  const savePicks = async () => {
    const { error } = await supabase.from("predictions").upsert({
      user_id: user.id, name: displayName, picks, updated_at: new Date().toISOString(),
    });
    show(error ? "Error al guardar" : "✓ Pronósticos guardados");
  };

  // "Prueba tu suerte": rellena los 72 marcadores al azar (sin guardar todavía).
  // Goles ponderados hacia números bajos para que parezcan resultados reales.
  const fillRandom = () => {
    const hasAny = Object.values(picks).some((v) => v && (v[0] !== "" || v[1] !== ""));
    if (hasAny && !window.confirm("Esto reemplaza todos tus marcadores por unos al azar. ¿Seguir?")) return;
    const goal = () => {
      const r = Math.random();
      if (r < 0.28) return 0;
      if (r < 0.60) return 1;
      if (r < 0.82) return 2;
      if (r < 0.93) return 3;
      if (r < 0.98) return 4;
      return 5;
    };
    const next = {};
    MATCHES.forEach((m) => { next[m.id] = [goal(), goal()]; });
    setPicks(next);
    show("✓ Marcadores al azar listos · revisa y guarda");
  };

  const saveName = async () => {
    const clean = nameDraft.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!clean) { show("Escribe un nombre"); return; }
    setDisplayName(clean);
    setEditingName(false);
    const { error } = await supabase.from("predictions").upsert({
      user_id: user.id, name: clean, picks, updated_at: new Date().toISOString(),
    });
    show(error ? "Error al guardar el nombre" : "✓ Nombre actualizado");
  };

  const setResult = async (mid, idx, val) => {
    const v = val === "" ? "" : Math.max(0, Math.min(20, parseInt(val) || 0));
    const next = { ...results };
    const c = next[mid] ? [...next[mid]] : ["", ""];
    c[idx] = v; next[mid] = c;
    setResults(next);
    const [h, a] = c;
    if (h !== "" && a !== "") {
      await supabase.from("results").upsert({ match_id: mid, home: +h, away: +a, updated_at: new Date().toISOString() });
    } else {
      await supabase.from("results").delete().eq("match_id", mid);
    }
  };

  const loadBoard = useCallback(async () => {
    const [{ data: preds }, resMap] = await Promise.all([
      supabase.from("predictions").select("user_id,name,picks"),
      loadResults(),
    ]);
    setResults(resMap);
    const rows = (preds || []).map((p) => {
      let total = 0, exact = 0, hits = 0;
      for (const m of MATCHES) {
        const r = resMap[m.id]; if (!r) continue;
        const pts = scorePick(p.picks?.[m.id], r);
        total += pts; if (pts === 3) exact++; if (pts > 0) hits++;
      }
      return { id: p.user_id, name: prettyName(p.name), total, exact, hits };
    });
    rows.sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));
    setBoard(rows);
  }, []);

  useEffect(() => { if (!loading && tab === "tabla") loadBoard(); }, [tab, loading, loadBoard]);

  // Pronósticos de todos: alimentan el panel "ver los pronósticos de los demás" en cada
  // partido ya cerrado (Pronósticos). Se recarga al entrar a la pestaña para verlos frescos.
  const loadAllPreds = useCallback(async () => {
    const { data } = await supabase.from("predictions").select("user_id,name,picks");
    setAllPreds((data || []).map((p) => ({ id: p.user_id, name: prettyName(p.name), picks: p.picks || {} })));
  }, []);
  useEffect(() => { if (!loading && tab === "pred") loadAllPreds(); }, [tab, loading, loadAllPreds]);

  // Lista de jugadores para que el organizador marque quién pagó la cuota.
  const loadPlayersList = useCallback(async () => {
    const { data } = await supabase.from("predictions").select("user_id,name");
    const list = (data || [])
      .map((p) => ({ id: p.user_id, name: prettyName(p.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setPlayers(list);
  }, []);

  useEffect(() => {
    if (!loading && isAdmin && tab === "res") loadPlayersList();
  }, [isAdmin, tab, loading, loadPlayersList]);

  // El organizador marca/desmarca el pago de la cuota de un jugador.
  const togglePaid = async (userId, next) => {
    setPaidSet((prev) => { const c = new Set(prev); if (next) c.add(userId); else c.delete(userId); return c; });
    const { error } = await supabase.from("payments")
      .upsert({ user_id: userId, paid: next, updated_at: new Date().toISOString() });
    if (error) { show("Error al actualizar el pago"); setPaidSet(await loadPayments()); }
    else show(next ? "✓ Inscripción activada" : "Inscripción quitada");
  };

  if (loading) return <div className="g-root"><div className="g-center"><div className="g-spin" /></div></div>;

  const myPts = MATCHES.reduce((s, m) => s + scorePick(picks[m.id], results[m.id]), 0);
  const amPaid = paidSet.has(user.id);

  return (
    <div className="g-root"><div className="g-wrap">
      <div className="g-hero" style={{ paddingBottom: 4 }}>
        <div className="g-logo"><img src="/logo.jpg" alt="Galletas FC" /></div>
        <div className="g-eyebrow">⚽ Polla Mundial · 2026</div>
        <div className="g-legend">
          <span className="g-key">Exacto <b>= 3</b></span>
          <span className="g-key f">Diferencia <b>= 2</b></span>
          <span className="g-key o">Signo <b>= 1</b></span>
        </div>
      </div>

      <div className="g-me">
        {editingName ? (
          <div className="g-nedit">
            <input
              className="g-ninput" type="text" maxLength={40} autoFocus value={nameDraft}
              placeholder="Tu nombre"
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
            />
            <button className="g-save" onClick={saveName}>Guardar</button>
            <button className="g-cancel" onClick={() => setEditingName(false)}>Cancelar</button>
          </div>
        ) : (
          <>
            <span>
              👤 {displayName} · <b>{myPts}</b> pts
              <button className="g-edit" onClick={() => { setNameDraft(displayName); setEditingName(true); }}>Editar</button>
            </span>
            {amPaid && <span className="g-prem">★ Premium</span>}
          </>
        )}
        <button className="g-logout" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>

      <div className="g-tabs">
        <button className={"g-tab" + (tab === "pred" ? " on" : "")} onClick={() => setTab("pred")}>Pronósticos</button>
        <button className={"g-tab" + (tab === "tabla" ? " on" : "")} onClick={() => setTab("tabla")}>Tabla</button>
        <button className={"g-tab" + (tab === "premios" ? " on" : "")} onClick={() => setTab("premios")}>Premios</button>
        <button className={"g-tab" + (tab === "res" ? " on" : "")} onClick={() => setTab("res")}>Resultados</button>
      </div>

      {tab === "pred" && <PredView picks={picks} results={results} setPick={setPick} savePicks={savePicks} fillRandom={fillRandom} amPaid={amPaid} allPreds={allPreds} myId={user.id} />}
      {tab === "tabla" && <BoardView board={board} myId={user.id} reload={loadBoard} paidSet={paidSet} />}
      {tab === "premios" && <PremiosView paidCount={paidSet.size} />}
      {tab === "res" && (
        <ResultsView results={results} isAdmin={isAdmin} adminMode={adminMode}
          setAdminMode={setAdminMode} setResult={setResult}
          players={players} paidSet={paidSet} togglePaid={togglePaid} />
      )}

      <Footer />
      {toast && <div className="g-toast">{toast}</div>}
    </div></div>
  );
}

/* ============================ HELPERS SUPABASE ============================ */
async function loadResults() {
  const { data } = await supabase.from("results").select("match_id,home,away");
  const map = {};
  (data || []).forEach((r) => { map[r.match_id] = [r.home, r.away]; });
  return map;
}
async function checkAdmin(email) {
  if (!email) return false;
  const { data } = await supabase.from("admins").select("email").eq("email", email).maybeSingle();
  return !!data;
}
// Conjunto de user_id que ya pagaron la cuota (para mostrar el distintivo Premium).
// Si la tabla aún no existe en Supabase, devuelve un set vacío sin romper la app.
async function loadPayments() {
  const { data } = await supabase.from("payments").select("user_id,paid");
  const set = new Set();
  (data || []).forEach((r) => { if (r.paid) set.add(r.user_id); });
  return set;
}

// Devuelve un nombre legible. Si recibe un correo, lo convierte (ej: "ana.soto@gmail.com" → "Ana Soto").
function prettyName(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return "Jugador";
  if (!s.includes("@")) return s;
  const local = s.split("@")[0];
  const name = local
    .split(/[._+\-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return name || "Jugador";
}

/* ============================ VISTAS ============================ */
function Footer() {
  return <div className="g-foot"><b>GALLETAS FC</b><br />Santiago Centro · Maipú · Lo Prado · La Cisterna</div>;
}

/* Cuenta regresiva en vivo hacia `target` (apertura o cierre del próximo partido). */
function Countdown({ target, title, subText, match, editable, onScroll, onElapsed }) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = target ? target - now : -1;
  const closed = !target || remaining <= 0;
  useEffect(() => {
    if (closed) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= target && onElapsed) onElapsed();
    }, 1000);
    return () => clearInterval(id);
  }, [closed, target, onElapsed]);

  if (closed) {
    return (
      <div className="g-count closed">
        <div className="g-count-title">Pronósticos cerrados</div>
        <p className="g-help">Ya no quedan partidos por abrir. Abajo ves tus puntos a medida que se cargan los resultados.</p>
      </div>
    );
  }

  const totalSec = Math.floor(remaining / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="g-count big">
      <div className="g-count-title">{title}</div>
      <div className="g-count-main">
        {match && <span className="g-count-fl">{flag(match.home)}</span>}
        <div className="g-count-clock">
          {d > 0 && (
            <div className="g-count-box"><span className="g-count-n">{d}</span><span className="g-count-u">{d === 1 ? "día" : "días"}</span></div>
          )}
          <div className="g-count-box"><span className="g-count-n">{pad(h)}</span><span className="g-count-u">hrs</span></div>
          <div className="g-count-box"><span className="g-count-n">{pad(m)}</span><span className="g-count-u">min</span></div>
          <div className="g-count-box"><span className="g-count-n">{pad(s)}</span><span className="g-count-u">seg</span></div>
        </div>
        {match && <span className="g-count-fl">{flag(match.away)}</span>}
      </div>
      <p className="g-help">{subText}</p>
      {editable && match && onScroll && (
        <button className="g-btn cyan g-count-btn" onClick={() => onScroll(match.id)}>Poner mi marcador</button>
      )}
    </div>
  );
}

// Formatea el tiempo que falta para que un partido cierre su edición (ej. "2h 15m", "45 min", "3d 4h").
function fmtLeft(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin <= 0) return "menos de 1 min";
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

// Clase de color de un puntaje (misma escala de calor que el resto: verde/naranja/dorado/gris).
const ptsCls = (pts) => (pts === 3 ? "won" : pts === 2 ? "f" : pts === 1 ? "o" : "z");

// Arma la lista de pronósticos de todos para un partido cerrado: nombre, marcador y, si ya hay
// resultado, los puntos coloreados. Ordena por puntaje (con resultado) o por nombre (sin resultado aún).
function buildOthers(allPreds, mid, res, myId) {
  const rows = (allPreds || []).map((pl) => {
    const pk = pl.picks?.[mid];
    const has = Array.isArray(pk) && pk[0] !== "" && pk[0] != null && pk[1] !== "" && pk[1] != null;
    const pts = res ? scorePick(pk, res) : null;
    return {
      id: pl.id,
      name: pl.name,
      pick: has ? `${pk[0]}-${pk[1]}` : "—",
      pts,
      cls: res ? (has ? ptsCls(pts) : "z") : has ? "c" : "z",
      isMe: pl.id === myId,
    };
  });
  rows.sort((a, b) => (b.pts ?? -1) - (a.pts ?? -1) || a.name.localeCompare(b.name));
  return rows;
}

export function PredView({ picks, results, setPick, savePicks, fillRandom, amPaid, allPreds, myId }) {
  const now = Date.now();
  // Cierre por partido: editable hasta 30 min antes de su inicio; desde ahí, cerrado.
  const openMatches = MATCHES.filter((m) => !isMatchLocked(m, now)).sort((a, b) => a.kickoff - b.kickoff);
  const nextMatch = openMatches[0] || null;        // el próximo en cerrar
  const allLocked = !nextMatch;                    // ya cerraron todos
  // Contador grande: apunta al cierre del próximo partido (30 min antes de su inicio).
  let cd = null;
  if (nextMatch) {
    const mm = nextMatch;
    cd = { target: mm.kickoff - LOCK_BEFORE_MS, title: "Próximo cierre", match: mm, editable: true, subText: <>Cierra <b className="c">{mm.home} vs {mm.away}</b> ({mm.day} jun · {mm.time}) — 30 min antes de empezar.</> };
  }
  const [, forceTick] = useState(0);               // re-render al cerrar cada partido
  const [copied, setCopied] = useState(false);
  const [openPanel, setOpenPanel] = useState(null); // id del partido cuyo panel "pronósticos de los demás" está abierto (uno a la vez)
  useEffect(() => {                                // refresca el "cierra en…" de cada partido cada 30 s
    const id = setInterval(() => forceTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const T = INSCRIPCION.transferencia;
  const copiarDatos = async () => {
    const txt = `Titular: ${T.titular}\nRUT: ${T.rut}\n${T.banco} · ${T.tipo}\nCuenta: ${T.cuenta}\nCorreo: ${T.email}`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { /* algunos navegadores bloquean el portapapeles; el jugador puede copiar a mano */ }
  };
  const scrollToMatch = (id) => {                   // lleva la pantalla a la celda del partido y enfoca el marcador
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = el.querySelector("input:not([disabled])");
    if (input) setTimeout(() => input.focus(), 450);
  };
  return (
    <>
      {!amPaid && (
        <div className="g-card">
          <div className="g-disp" style={{ fontSize: 17, marginBottom: 6 }}>Inscripción a la polla</div>
            <p className="g-help" style={{ marginBottom: 12 }}>
              Transfiere la cuota {INSCRIPCION.monto ? <b className="c">{INSCRIPCION.monto} </b> : null}a esta cuenta y
              avísale al organizador. Cuando confirme tu pago, te aparece el distintivo{" "}
              <span className="g-prem mini">★</span> <b>Premium</b>.
            </p>
            <div className="g-bank">
              <div className="g-bk-row"><span className="g-bk-k">Titular</span><span className="g-bk-v">{T.titular}</span></div>
              <div className="g-bk-row"><span className="g-bk-k">RUT</span><span className="g-bk-v">{T.rut}</span></div>
              <div className="g-bk-row"><span className="g-bk-k">Banco</span><span className="g-bk-v">{T.banco}</span></div>
              <div className="g-bk-row"><span className="g-bk-k">Cuenta</span><span className="g-bk-v">{T.tipo} · {T.cuenta}</span></div>
              <div className="g-bk-row"><span className="g-bk-k">Correo</span><span className="g-bk-v">{T.email}</span></div>
            </div>
            <button className="g-btn fire" onClick={copiarDatos}>
              {copied ? "Datos copiados" : "Copiar datos de transferencia"}
            </button>
        </div>
      )}
      <div className="g-card">
        <Countdown target={cd ? cd.target : null} title={cd ? cd.title : ""} subText={cd ? cd.subText : null} match={cd ? cd.match : null} editable={cd ? cd.editable : false} onScroll={scrollToMatch} onElapsed={() => forceTick((t) => t + 1)} />
        {!allLocked && (
          <>
            <p className="g-help" style={{ marginTop: 14 }}>
              Puedes editar cada partido <b className="c">hasta 30 minutos antes de que empiece</b>; desde ahí queda cerrado.
              Anota tus marcadores y toca <b className="c">Guardar</b>.
            </p>
          </>
        )}
      </div>
      <div className="g-tznote">Fecha, hora y estadio de cada partido — en horario de Chile.</div>
      {GROUPS.map((g) => (
        <div className="g-card" key={g}>
          <div className="g-gline"><span className="g-gtag">GRUPO {g}</span><span className="g-gbar" /></div>
          {MATCHES.filter((m) => m.group === g).map((m) => {
            const p = picks[m.id] || ["", ""]; const r = results[m.id]; const pts = scorePick(picks[m.id], r);
            const exact = !!r && pts === 3; const state = r ? (pts === 3 ? " won" : pts === 2 ? " p2" : pts === 1 ? " p1" : " p0") : "";
            const matchLocked = !!r || isMatchLocked(m, now);    // bloqueado si tiene resultado o faltan ≤30 min para empezar
            const timeLeft = m.kickoff - LOCK_BEFORE_MS - now;   // ms hasta que cierre la edición
            const panelOpen = matchLocked && openPanel === m.id; // panel de pronósticos ajenos: solo en partidos cerrados
            const others = panelOpen ? buildOthers(allPreds, m.id, r, myId) : null;
            return (
              <div className="g-mrow" key={m.id} id={m.id}>
                <div className={"g-match" + state}>
                  <div className="g-team r"><span className="g-tn">{m.home}</span><span className="g-fl">{flag(m.home)}</span></div>
                  <div className="g-sb">
                    <input className="g-sc" type="number" inputMode="numeric" disabled={matchLocked} value={p[0]} aria-label={`${m.home} vs ${m.away} - goles ${m.home}`} onChange={(e) => setPick(m.id, 0, e.target.value)} />
                    <span className="g-colon">:</span>
                    <input className="g-sc" type="number" inputMode="numeric" disabled={matchLocked} value={p[1]} aria-label={`${m.home} vs ${m.away} - goles ${m.away}`} onChange={(e) => setPick(m.id, 1, e.target.value)} />
                  </div>
                  <div className="g-right">
                    <div className="g-team"><span className="g-fl">{flag(m.away)}</span><span className="g-tn">{m.away}</span></div>
                    <div className={"g-pts " + (pts === 3 ? "won" : pts === 2 ? "f" : pts === 1 ? "o" : "z")}>{r ? "+" + pts : "·"}</div>
                    {matchLocked && (
                      <button
                        className={"g-others-btn" + (panelOpen ? " on" : "")}
                        onClick={() => setOpenPanel((cur) => (cur === m.id ? null : m.id))}
                        aria-label="Ver los pronósticos de los demás"
                        title="Pronósticos de los demás"
                      ><i /><i /><i /></button>
                    )}
                  </div>
                </div>
                <div className="g-mt">J{m.jornada} · {m.day} jun · {m.time} · {m.venue}</div>
                {!r && (timeLeft <= 0
                  ? <div className="g-lockin closed">Cerrado</div>
                  : <div className={"g-lockin" + (timeLeft < 3600000 ? " soon" : "")}>Cierra en {fmtLeft(timeLeft)}</div>)}
                {r && <div className={"g-note fin" + (exact ? " won" : "")}>Final {r[0]}–{r[1]}{exact ? <> · <span className="g-exact">Exacto</span></> : ""}</div>}
                {others && (
                  <div className="g-others">
                    <div className="g-others-t">{r ? "Pronósticos de los participantes" : "Pronósticos · partido en juego"}</div>
                    {others.length === 0
                      ? <div className="g-oempty">Nadie más pronosticó este partido.</div>
                      : others.map((o) => (
                          <div className={"g-orow" + (o.isMe ? " me" : "")} key={o.id}>
                            <span className="g-on">{o.name}{o.isMe ? " (tú)" : ""}</span>
                            <span className={"g-op " + o.cls}>{o.pick}</span>
                            {r && <span className={"g-opt " + o.cls}>+{o.pts}</span>}
                          </div>
                        ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {!allLocked && <button className="g-btn cyan g-save-fab" onClick={savePicks}>💾 Guardar mis pronósticos</button>}
    </>
  );
}

function BoardView({ board, myId, reload, paidSet }) {
  return (
    <>
      <div className="g-card g-lhead">
        <div className="g-lt">🏆 Tabla</div>
        <button className="g-btn ghost" style={{ width: "auto", padding: "11px 16px" }} onClick={reload}>↻ Refrescar</button>
      </div>
      {board.length === 0 ? (
        <div className="g-card"><div className="g-empty">Todavía nadie cargó pronósticos.<br />Comparte el link con las Galletas para que entren.</div></div>
      ) : (
        <div className="g-card">
          {board.map((row, i) => (
            <div className={"g-row" + (i === 0 ? " p1" : "") + (row.id === myId ? " me" : "")} key={row.id}>
              <div className={"g-rk" + (i === 0 ? " t1" : i === 1 ? " t2" : i === 2 ? " t3" : "")}>{i + 1}</div>
              <div className="g-rn"><b>{row.name}{row.id === myId ? " (tú)" : ""}{paidSet?.has(row.id) && <span className="g-prem mini" title="Inscripción pagada">★</span>}</b><small>{row.exact} exactos · {row.hits} aciertos</small></div>
              <div className="g-rt">{row.total}<small>pts</small></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PremiosView({ paidCount }) {
  const fmt = (n) => "$" + n.toLocaleString("es-CL");
  const pozo = montoNumber * paidCount;
  return (
    <>
      <div className="g-card">
        <div className="g-disp" style={{ fontSize: 20, marginBottom: 6 }}>Premios de la polla</div>
        <p className="g-help" style={{ marginBottom: 14 }}>
          El pozo se arma con las cuotas de inscripción{INSCRIPCION.monto ? <> de <b className="c">{INSCRIPCION.monto}</b> por persona</> : null} y
          se reparte entre los <b>tres primeros</b> de la Tabla cuando termine la fase de grupos.
        </p>
        <div className="g-pozo">
          <span className="g-pozo-k">Pozo actual</span>
          <span className="g-pozo-v">{fmt(pozo)}</span>
          <span className="g-pozo-s">
            {paidCount > 0
              ? `${paidCount} inscrito${paidCount === 1 ? "" : "s"} al día · crece con cada pago`
              : "Crece con cada inscripción que el organizador confirma"}
          </span>
        </div>
      </div>

      <div className="g-card">
        <div className="g-rules-t">Cómo se reparte el pozo</div>
        <div className="g-prizes">
          {PREMIOS.map((p) => (
            <div className={"g-prize t" + p.pos} key={p.pos}>
              <div className="g-pz-pos">{p.pos}º</div>
              <div className="g-pz-mid"><b>{p.label}</b><small>{p.pct}% del pozo</small></div>
              <div className="g-pz-amt">{pozo > 0 ? fmt(Math.round(pozo * p.pct / 100)) : p.pct + "%"}</div>
            </div>
          ))}
        </div>
        <p className="g-help" style={{ marginTop: 14 }}>
          Los montos se actualizan a medida que se confirman los pagos. Si hay empate en puntos,
          desempata quién tenga más <b className="c">marcadores exactos</b>.
        </p>
      </div>
    </>
  );
}

// Input de resultado con estado local: actualiza visualmente en onChange,
// pero solo llama setResult (escribe a BD) en onBlur.
function ResultInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value ?? ""));
  // Sincroniza si el padre actualiza el valor (ej: reload)
  useEffect(() => setDraft(String(value ?? "")), [value]);
  return (
    <input
      className="g-sc res"
      type="number"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => onCommit(e.target.value)}
    />
  );
}

export function ResultsView({ results, isAdmin, adminMode, setAdminMode, setResult, players, paidSet, togglePaid }) {
  const count = Object.keys(results).length;
  return (
    <>
      <div className="g-card">
        {isAdmin ? (
          <>
            <label className="g-toggle" onClick={() => setAdminMode(!adminMode)}>
              <div className={"g-sw" + (adminMode ? " on" : "")}><b /></div>Modo organizador (editar resultados)
            </label>
            <p className="g-help" style={{ marginTop: 12 }}>
              {count > 0 ? <><span className="g-badge">{count}</span> partidos con resultado. </> : "Aún no hay resultados cargados. "}
              Cuando cargues un marcador, el puntaje de todos se recalcula y se guarda solo en la base de datos.
            </p>
          </>
        ) : (
          <p className="g-help">
            {count > 0 ? <><span className="g-badge">{count}</span> partidos con resultado. </> : "Aún no hay resultados cargados. "}
            Solo el organizador puede cargar los marcadores. El puntaje de todos se calcula solo a partir de ellos.
          </p>
        )}
      </div>

      {isAdmin && adminMode && (
        <div className="g-card">
          <div className="g-lt" style={{ fontSize: 18, marginBottom: 6 }}>Inscripciones</div>
          <p className="g-help" style={{ marginBottom: 12 }}>
            Marca a quién ya le llegó la transferencia de la cuota a tu cuenta bancaria. Al activarlo, esa persona
            obtiene el distintivo <span className="g-prem mini">★</span> <b>Premium</b> en su perfil y en la tabla.
          </p>
          {players.length === 0 ? (
            <div className="g-empty">Aún no hay jugadores para mostrar.<br />Aparecen aquí cuando entran y guardan sus pronósticos.</div>
          ) : (
            players.map((pl) => {
              const paid = paidSet.has(pl.id);
              return (
                <div className="g-prow" key={pl.id}>
                  <span className="g-pname">{pl.name}{paid && <span className="g-prem mini">★</span>}</span>
                  <button className={"g-paybtn" + (paid ? " on" : "")} onClick={() => togglePaid(pl.id, !paid)}>
                    {paid ? "Pagado" : "Marcar pagado"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {GROUPS.map((g) => (
        <div className="g-card" key={g}>
          <div className="g-gline"><span className="g-gtag">GRUPO {g}</span><span className="g-gbar" /></div>
          {MATCHES.filter((m) => m.group === g).map((m) => {
            const r = results[m.id] || ["", ""];
            const has = !!results[m.id];
            const editable = isAdmin && adminMode;
            return (
              <div className="g-match" key={m.id}>
                <div className="g-team r"><span className="g-tn">{m.home}</span><span className="g-fl">{flag(m.home)}</span></div>
                <div className="g-sb">
                  {editable ? (
                    <>
                      <ResultInput value={r[0]} onCommit={(v) => setResult(m.id, 0, v)} />
                      <span className="g-colon">:</span>
                      <ResultInput value={r[1]} onCommit={(v) => setResult(m.id, 1, v)} />
                    </>
                  ) : (
                    <span className={"g-rscore" + (has ? "" : " none")}>{has ? `${r[0]} : ${r[1]}` : "—"}</span>
                  )}
                </div>
                <div className="g-team"><span className="g-fl">{flag(m.away)}</span><span className="g-tn">{m.away}</span></div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
