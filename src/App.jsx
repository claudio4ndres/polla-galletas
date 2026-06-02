import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  MATCHES, GROUPS, flag, scorePick, DEADLINE, INSCRIPCION,
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
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
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
        <div className="g-rules">
          <span className="g-rule">Exacto <b>= 3</b></span>
          <span className="g-rule f">Diferencia <b>= 2</b></span>
          <span className="g-rule o">Signo <b>= 1</b></span>
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
        <button className={"g-tab" + (tab === "res" ? " on" : "")} onClick={() => setTab("res")}>Resultados</button>
      </div>

      {tab === "pred" && <PredView picks={picks} results={results} setPick={setPick} savePicks={savePicks} amPaid={amPaid} />}
      {tab === "tabla" && <BoardView board={board} myId={user.id} reload={loadBoard} paidSet={paidSet} />}
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

function PredView({ picks, results, setPick, savePicks, amPaid }) {
  const now = Date.now();
  const locked = now >= DEADLINE;
  const days = Math.max(0, Math.ceil((DEADLINE - now) / 86400000));
  return (
    <>
      <div className="g-card">
        {amPaid ? (
          <div className="g-insc-ok">
            <span className="g-prem">★ Premium</span>
            <span className="g-help"><b>Inscripción al día.</b> Ya estás dentro de la polla oficial. ¡Suerte!</span>
          </div>
        ) : (
          <>
            <div className="g-disp" style={{ fontSize: 17, marginBottom: 6 }}>Inscripción a la polla</div>
            <p className="g-help" style={{ marginBottom: 12 }}>
              Paga la cuota {INSCRIPCION.monto ? <b className="c">{INSCRIPCION.monto} </b> : null}para participar
              oficialmente. Cuando el organizador confirme tu pago, te aparece el distintivo{" "}
              <span className="g-prem mini">★</span> <b>Premium</b>.
            </p>
            <a className="g-btn fire" href={INSCRIPCION.mpLink} target="_blank" rel="noopener noreferrer">
              Pagar con Mercado Pago
            </a>
          </>
        )}
      </div>
      <div className="g-card">
        {locked ? (
          <p className="g-help"><b className="o">🔒 Pronósticos cerrados.</b> El Mundial ya arrancó, así que los
            marcadores quedaron congelados. Abajo ves tus puntos a medida que se cargan los resultados.</p>
        ) : (
          <>
            <p className="g-help">
              Anota el marcador de <b>todos</b> los partidos y toca <b className="c">Guardar</b>. Puedes editar cuantas
              veces quieras hasta que arranque el Mundial: <b className="c">cierra el 11 de junio</b> (faltan {days} día{days === 1 ? "" : "s"}).
              Después no se podrá cambiar nada.
            </p>
            <div className="g-rules-t">Cómo se ganan los puntos en cada partido</div>
            <p className="g-help" style={{ marginBottom: 13 }}>
              Antes que nada, dos palabras: el <b className="o">signo</b> es <b>quién gana o si terminó empate</b> (lo que se conoce
              como 1‑X‑2), y la <b className="f">diferencia</b> es <b>por cuántos goles gana</b> el equipo (por 1, por 2, etc.).
            </p>
            <ul className="g-rules">
              <li className="g-rule">
                <span className="g-rp c">3</span>
                <span className="g-rtx"><b>Marcador exacto.</b> Acertaste los goles tal cual, los de cada equipo.
                  <span className="g-rex"> Ej.: pones 2-1 y queda 2-1.</span></span>
              </li>
              <li className="g-rule">
                <span className="g-rp f">2</span>
                <span className="g-rtx"><b>Acertaste el ganador y la diferencia de goles</b>, pero no el marcador exacto.
                  <span className="g-rex"> Ej.: pones 2-1 y queda 3-2; en los dos gana el local por 1 gol.</span></span>
              </li>
              <li className="g-rule">
                <span className="g-rp o">1</span>
                <span className="g-rtx"><b>Acertaste solo el signo</b> (quién gana, o que fue empate), pero no la diferencia.
                  <span className="g-rex"> Ej.: pones 2-1 y queda 3-0, igual gana el local; o pones 1-1 y queda 0-0, igual es empate.</span></span>
              </li>
              <li className="g-rule">
                <span className="g-rp z">0</span>
                <span className="g-rtx"><b>Erraste el signo.</b> El partido se fue para el otro lado: ganó el rival, o hubo empate cuando esperabas ganador (o al revés).</span>
              </li>
            </ul>
          </>
        )}
      </div>
      {GROUPS.map((g) => (
        <div className="g-card" key={g}>
          <div className="g-gline"><span className="g-gtag">GRUPO {g}</span><span className="g-gbar" /></div>
          {MATCHES.filter((m) => m.group === g).map((m) => {
            const p = picks[m.id] || ["", ""]; const r = results[m.id]; const pts = scorePick(picks[m.id], r);
            const exact = !!r && pts === 3; const state = r ? (pts === 3 ? " won" : pts === 2 ? " p2" : pts === 1 ? " p1" : " p0") : "";
            return (
              <div key={m.id}>
                <div className={"g-match" + state}>
                  <div className="g-team r"><span className="g-tn">{m.home}</span><span className="g-fl">{flag(m.home)}</span></div>
                  <div className="g-sb">
                    <input className="g-sc" type="number" inputMode="numeric" disabled={locked} value={p[0]} onChange={(e) => setPick(m.id, 0, e.target.value)} />
                    <span className="g-colon">:</span>
                    <input className="g-sc" type="number" inputMode="numeric" disabled={locked} value={p[1]} onChange={(e) => setPick(m.id, 1, e.target.value)} />
                  </div>
                  <div className="g-team"><span className="g-fl">{flag(m.away)}</span><span className="g-tn">{m.away}</span></div>
                  <div className={"g-pts " + (pts === 3 ? "won" : pts === 2 ? "f" : pts === 1 ? "o" : "z")}>{r ? "+" + pts : "·"}</div>
                </div>
                {r && <div className={"g-note fin" + (exact ? " won" : "")}>Final {r[0]}–{r[1]}{exact ? <> · <span className="g-exact">Exacto</span></> : ""} · J{m.jornada} · {m.day} jun</div>}
              </div>
            );
          })}
        </div>
      ))}
      {!locked && <button className="g-btn cyan" style={{ position: "sticky", bottom: 14 }} onClick={savePicks}>💾 Guardar mis pronósticos</button>}
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

function ResultsView({ results, isAdmin, adminMode, setAdminMode, setResult, players, paidSet, togglePaid }) {
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
            Marca a quién ya le llegó el pago de la cuota a tu cuenta de Mercado Pago. Al activarlo, esa persona
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
                      <input className="g-sc res" type="number" inputMode="numeric" value={r[0]} onChange={(e) => setResult(m.id, 0, e.target.value)} />
                      <span className="g-colon">:</span>
                      <input className="g-sc res" type="number" inputMode="numeric" value={r[1]} onChange={(e) => setResult(m.id, 1, e.target.value)} />
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
