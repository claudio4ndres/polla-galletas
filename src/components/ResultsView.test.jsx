import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MATCHES } from "../data.js";

vi.mock("../supabaseClient.js", () => ({
  supabase: {
    from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const { ResultsView } = await import("../App.jsx");

const M0 = MATCHES[0]; // México vs Sudáfrica

function renderResultsView(overrides = {}) {
  const props = {
    results: {},
    isAdmin: true,
    adminMode: true,
    setAdminMode: vi.fn(),
    setResult: vi.fn(),
    players: [],
    paidSet: new Set(),
    togglePaid: vi.fn(),
    ...overrides,
  };
  return { ...render(<ResultsView {...props} />), props };
}

describe("ResultsView — setResult solo se llama al perder el foco (onBlur)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("escribir '1' luego '3' sin salir del input NO llama setResult", async () => {
    const setResult = vi.fn();
    renderResultsView({ setResult });

    const inputLocal = screen.getAllByRole("spinbutton")[0];
    await userEvent.type(inputLocal, "13");

    // Aún no se ha hecho blur → setResult no debe haberse llamado
    expect(setResult).not.toHaveBeenCalled();
  });

  it("al hacer blur después de escribir '13', setResult se llama UNA sola vez con '13'", async () => {
    const setResult = vi.fn();
    renderResultsView({ setResult });

    const inputLocal = screen.getAllByRole("spinbutton")[0];
    await userEvent.type(inputLocal, "13");
    await userEvent.tab(); // dispara onBlur

    expect(setResult).toHaveBeenCalledTimes(1);
    expect(setResult).toHaveBeenCalledWith(M0.id, 0, "13");
  });

  it("editar local y visita en secuencia genera exactamente 2 llamadas", async () => {
    const setResult = vi.fn();
    renderResultsView({ setResult });

    const [inputLocal, inputVisita] = screen.getAllByRole("spinbutton");
    await userEvent.type(inputLocal, "2");
    await userEvent.tab(); // blur en local → llama setResult(m0, 0, "2")
    await userEvent.type(inputVisita, "1");
    await userEvent.tab(); // blur en visita → llama setResult(m0, 1, "1")

    expect(setResult).toHaveBeenCalledTimes(2);
    expect(setResult).toHaveBeenNthCalledWith(1, M0.id, 0, "2");
    expect(setResult).toHaveBeenNthCalledWith(2, M0.id, 1, "1");
  });
});
