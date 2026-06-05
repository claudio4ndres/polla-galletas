import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEADLINE } from "./data.js";

vi.mock("./supabaseClient.js", () => ({
  supabase: {
    from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const { PredView } = await import("./App.jsx");

const SAVE_BTN = { name: /guardar mis pronósticos/i };
const baseProps = {
  picks: {},
  results: {},
  setPick: vi.fn(),
  savePicks: vi.fn(),
  fillRandom: vi.fn(),
  amPaid: false,
};

describe("PredView — bloqueo por deadline", () => {
  afterEach(() => vi.useRealTimers());

  describe("antes del deadline (1 día antes)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(DEADLINE - 86_400_000);
    });

    it("los inputs de marcador no están disabled", () => {
      render(<PredView {...baseProps} />);
      screen.getAllByRole("spinbutton").forEach((i) => expect(i).not.toBeDisabled());
    });

    it("el botón 'Guardar mis pronósticos' está visible", () => {
      render(<PredView {...baseProps} />);
      expect(screen.getByRole("button", SAVE_BTN)).toBeInTheDocument();
    });

    it("clicar Guardar invoca savePicks", async () => {
      const savePicks = vi.fn();
      render(<PredView {...baseProps} savePicks={savePicks} />);
      await userEvent.click(screen.getByRole("button", SAVE_BTN));
      expect(savePicks).toHaveBeenCalledOnce();
    });
  });

  describe("después del deadline (1 ms después)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(DEADLINE + 1);
    });

    it("todos los inputs de marcador están disabled", () => {
      render(<PredView {...baseProps} />);
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs.length).toBeGreaterThan(0);
      inputs.forEach((i) => expect(i).toBeDisabled());
    });

    it("el botón 'Guardar mis pronósticos' no aparece", () => {
      render(<PredView {...baseProps} />);
      expect(screen.queryByRole("button", SAVE_BTN)).not.toBeInTheDocument();
    });

    it("muestra el mensaje '🔒 Pronósticos cerrados'", () => {
      render(<PredView {...baseProps} />);
      expect(screen.getByText(/pronósticos cerrados/i)).toBeInTheDocument();
    });
  });

  describe("en el deadline exacto", () => {
    it("now === DEADLINE → bloqueado: no hay botón Guardar y aparece mensaje", () => {
      vi.useFakeTimers();
      vi.setSystemTime(DEADLINE);
      render(<PredView {...baseProps} />);
      expect(screen.queryByRole("button", SAVE_BTN)).not.toBeInTheDocument();
      expect(screen.getByText(/pronósticos cerrados/i)).toBeInTheDocument();
    });
  });
});
