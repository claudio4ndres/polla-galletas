import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { DEADLINE, MATCHES } from "../data.js";

vi.mock("../supabaseClient.js", () => ({
  supabase: {
    from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const { PredView } = await import("../App.jsx");

// Partido conocido para tests dirigidos
const M0 = MATCHES[0]; // { id:"m0", home:"México", away:"Sudáfrica" }

function renderPredView(overrides = {}) {
  const props = {
    picks: {},
    results: {},
    setPick: vi.fn(),
    savePicks: vi.fn(),
    fillRandom: vi.fn(),
    amPaid: false,
    ...overrides,
  };
  const utils = render(<PredView {...props} />);
  return { ...utils, props };
}

// Antes del deadline para todos los tests por defecto
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DEADLINE - 86_400_000);
});
afterEach(() => vi.useRealTimers());

// ── Renderizado ───────────────────────────────────────────────────────────────
describe("renderizado", () => {
  it("renderiza 144 inputs (72 partidos × 2 marcadores)", () => {
    renderPredView();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(144);
  });

  it("cada partido muestra el nombre del equipo local y visitante", () => {
    renderPredView();
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.getByText("Sudáfrica")).toBeInTheDocument();
  });

  it("si picks tiene valor, el input lo refleja", () => {
    renderPredView({ picks: { [M0.id]: [2, 1] } });
    const inputLocal = screen.getByRole("spinbutton", {
      name: `${M0.home} vs ${M0.away} - goles ${M0.home}`,
    });
    expect(inputLocal).toHaveValue(2);
  });

  it("si results tiene resultado oficial, se muestra 'Final X–Y'", () => {
    renderPredView({ results: { [M0.id]: [3, 0] } });
    expect(screen.getByText(/final 3–0/i)).toBeInTheDocument();
  });
});

// ── Interacción ───────────────────────────────────────────────────────────────
describe("interacción", () => {
  it("escribir en input de local llama setPick(id, 0, valor)", async () => {
    const setPick = vi.fn();
    renderPredView({ setPick });
    const input = screen.getByRole("spinbutton", {
      name: `${M0.home} vs ${M0.away} - goles ${M0.home}`,
    });
    await userEvent.clear(input);
    await userEvent.type(input, "2");
    expect(setPick).toHaveBeenCalledWith(M0.id, 0, "2");
  });

  it("escribir en input de visita llama setPick(id, 1, valor)", async () => {
    const setPick = vi.fn();
    renderPredView({ setPick });
    const input = screen.getByRole("spinbutton", {
      name: `${M0.home} vs ${M0.away} - goles ${M0.away}`,
    });
    await userEvent.clear(input);
    await userEvent.type(input, "1");
    expect(setPick).toHaveBeenCalledWith(M0.id, 1, "1");
  });

  it("click en 'Guardar mis pronósticos' llama savePicks una vez", async () => {
    const savePicks = vi.fn();
    renderPredView({ savePicks });
    await userEvent.click(screen.getByRole("button", { name: /guardar mis pronósticos/i }));
    expect(savePicks).toHaveBeenCalledOnce();
  });

  it("click en 'Prueba tu suerte' llama fillRandom", async () => {
    const fillRandom = vi.fn();
    renderPredView({ fillRandom });
    await userEvent.click(screen.getByRole("button", { name: /prueba tu suerte/i }));
    expect(fillRandom).toHaveBeenCalledOnce();
  });
});

// ── Validaciones de input ─────────────────────────────────────────────────────
describe("validaciones de input", () => {
  it("el input es de tipo number (solo acepta dígitos)", () => {
    renderPredView();
    const input = screen.getByRole("spinbutton", {
      name: `${M0.home} vs ${M0.away} - goles ${M0.home}`,
    });
    expect(input).toHaveAttribute("type", "number");
  });

  it("el input tiene inputMode numeric (teclado numérico en móvil)", () => {
    renderPredView();
    const input = screen.getByRole("spinbutton", {
      name: `${M0.home} vs ${M0.away} - goles ${M0.home}`,
    });
    expect(input).toHaveAttribute("inputMode", "numeric");
  });
});

// ── Estado de bloqueo ─────────────────────────────────────────────────────────
describe("estado de bloqueo", () => {
  it("amPaid=false NO bloquea los inputs (la regla de pago no afecta pronósticos)", () => {
    renderPredView({ amPaid: false });
    screen.getAllByRole("spinbutton").forEach((i) => expect(i).not.toBeDisabled());
  });

  it("después del deadline todos los inputs están disabled", () => {
    vi.setSystemTime(DEADLINE + 1);
    renderPredView();
    screen.getAllByRole("spinbutton").forEach((i) => expect(i).toBeDisabled());
  });

  it("después del deadline aparece el mensaje de cierre", () => {
    vi.setSystemTime(DEADLINE + 1);
    renderPredView();
    expect(screen.getByText(/pronósticos cerrados/i)).toBeInTheDocument();
  });
});

// ── Accesibilidad ─────────────────────────────────────────────────────────────
describe("accesibilidad", () => {
  it("cada input tiene aria-label con local vs visita y equipo", () => {
    renderPredView();
    // Verificamos los dos inputs del primer partido como muestra
    expect(
      screen.getByRole("spinbutton", { name: `${M0.home} vs ${M0.away} - goles ${M0.home}` })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: `${M0.home} vs ${M0.away} - goles ${M0.away}` })
    ).toBeInTheDocument();
  });

  it("el botón Guardar tiene texto accesible visible (no solo emoji)", () => {
    renderPredView();
    const btn = screen.getByRole("button", { name: /guardar mis pronósticos/i });
    expect(btn).toBeInTheDocument();
  });

  it("no tiene violaciones de accesibilidad (jest-axe)", async () => {
    const { container } = renderPredView();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
