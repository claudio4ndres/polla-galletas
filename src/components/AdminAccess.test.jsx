import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

const baseProps = {
  results: {},
  adminMode: true,
  setAdminMode: vi.fn(),
  setResult: vi.fn(),
  players: [{ id: "u1", name: "Jugador 1" }],
  paidSet: new Set(),
  togglePaid: vi.fn(),
};

describe("ResultsView — control de acceso admin (lado cliente)", () => {
  describe("isAdmin = false (usuario normal)", () => {
    it("no muestra el toggle de modo organizador", () => {
      render(<ResultsView {...baseProps} isAdmin={false} />);
      expect(screen.queryByText(/modo organizador/i)).not.toBeInTheDocument();
    });

    it("no muestra inputs de edición de resultados", () => {
      render(<ResultsView {...baseProps} isAdmin={false} />);
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("no muestra la sección de inscripciones/pagos", () => {
      render(<ResultsView {...baseProps} isAdmin={false} />);
      expect(screen.queryByText(/marcar pagado/i)).not.toBeInTheDocument();
    });
  });

  describe("isAdmin = true (organizador)", () => {
    it("muestra el toggle de modo organizador", () => {
      render(<ResultsView {...baseProps} isAdmin={true} />);
      expect(screen.getByText(/modo organizador/i)).toBeInTheDocument();
    });

    it("muestra inputs editables de resultados cuando adminMode=true", () => {
      render(<ResultsView {...baseProps} isAdmin={true} adminMode={true} />);
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    });

    it("muestra la sección de inscripciones con el jugador", () => {
      render(<ResultsView {...baseProps} isAdmin={true} />);
      expect(screen.getByText(/Jugador 1/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /marcar pagado/i })).toBeInTheDocument();
    });
  });

  describe("manipulación de isAdmin vía DevTools (análisis de riesgo)", () => {
    it("si isAdmin=true es forzado en el cliente, los controles SE RENDERIZAN — el freno real es la RLS de Supabase", () => {
      // Este test documenta que la protección en el cliente es solo UX.
      // Un usuario que ponga isAdmin=true en React DevTools verá los controles,
      // pero cualquier llamada a setResult → supabase.upsert fallará en el servidor
      // gracias a la RLS: "auth.email() in (select email from public.admins)".
      const setResult = vi.fn();
      render(<ResultsView {...baseProps} isAdmin={true} adminMode={true} setResult={setResult} />);

      // Los controles son visibles (esto es esperado y aceptado)
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);

      // setResult es un mock aquí. En producción, setResult llama a supabase.upsert
      // que será rechazado por RLS si el usuario no está en la tabla admins.
      // Ver: docs/security-notes.md para el plan completo de mitigación.
    });
  });
});
