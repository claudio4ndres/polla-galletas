import { describe, it, expect } from "vitest";
import { scorePick, PTS_EXACT, PTS_DIFF, PTS_SIGN } from "./data.js";

describe("scorePick", () => {
  // ── Acierto exacto ─────────────────────────────────────────────────────────
  describe("acierto exacto", () => {
    it("pick 2-1, result 2-1 devuelve PTS_EXACT", () => {
      expect(scorePick([2, 1], [2, 1])).toBe(PTS_EXACT);
    });

    it("empate exacto 0-0 devuelve PTS_EXACT", () => {
      expect(scorePick([0, 0], [0, 0])).toBe(PTS_EXACT);
    });

    it("marcador alto 5-3 exacto devuelve PTS_EXACT", () => {
      expect(scorePick([5, 3], [5, 3])).toBe(PTS_EXACT);
    });
  });

  // ── Acierto de diferencia ──────────────────────────────────────────────────
  describe("acierto de diferencia (mismo signo y diferencia, distinto marcador)", () => {
    it("pick 2-1, result 3-2: gana local por 1 en ambos → PTS_DIFF", () => {
      expect(scorePick([2, 1], [3, 2])).toBe(PTS_DIFF);
    });

    it("pick 1-2, result 2-3: gana visita por 1 → PTS_DIFF", () => {
      expect(scorePick([1, 2], [2, 3])).toBe(PTS_DIFF);
    });

    it("pick 3-1, result 5-3: gana local por 2 → PTS_DIFF", () => {
      expect(scorePick([3, 1], [5, 3])).toBe(PTS_DIFF);
    });
  });

  // ── Acierto de signo ──────────────────────────────────────────────────────
  describe("acierto de signo (mismo ganador, diferencia distinta)", () => {
    it("pick 3-1, result 2-0: gana local, misma diferencia (+2) → PTS_DIFF (no PTS_SIGN)", () => {
      // 3-1=2 y 2-0=2: misma diferencia, por eso es PTS_DIFF.
      expect(scorePick([3, 1], [2, 0])).toBe(PTS_DIFF);
    });

    it("pick 1-3, result 0-1: gana visita, diferencias distintas → PTS_SIGN", () => {
      expect(scorePick([1, 3], [0, 1])).toBe(PTS_SIGN);
    });

    it("pick 0-0, result 1-1: ambos empates pero marcador distinto → PTS_SIGN (no PTS_EXACT)", () => {
      // La función llega a sr===0 antes del check exacto ya falló;
      // empate no-exacto cuenta como PTS_SIGN, no PTS_EXACT.
      expect(scorePick([0, 0], [1, 1])).toBe(PTS_SIGN);
    });
  });

  // ── Errado ────────────────────────────────────────────────────────────────
  describe("errado (cambio de ganador)", () => {
    it("pick 2-1, result 1-2: pronosticó local, ganó visita → 0", () => {
      expect(scorePick([2, 1], [1, 2])).toBe(0);
    });

    it("pick 0-1, result 1-0: pronosticó visita, ganó local → 0", () => {
      expect(scorePick([0, 1], [1, 0])).toBe(0);
    });

    it("pick 2-2, result 2-1: pronosticó empate, ganó local → 0", () => {
      expect(scorePick([2, 2], [2, 1])).toBe(0);
    });
  });

  // ── Entradas inválidas ────────────────────────────────────────────────────
  describe("entradas inválidas", () => {
    it("pick undefined → 0", () => {
      expect(scorePick(undefined, [1, 0])).toBe(0);
    });

    it("pick null → 0", () => {
      expect(scorePick(null, [1, 0])).toBe(0);
    });

    it("pick objeto vacío {} → 0 (no es array, se rechaza)", () => {
      expect(scorePick({}, [1, 0])).toBe(0);
    });

    it("pick con strings vacíos ['', ''] → 0", () => {
      expect(scorePick(["", ""], [1, 0])).toBe(0);
    });

    it("pick con null en home [null, 2] → 0", () => {
      expect(scorePick([null, 2], [1, 2])).toBe(0);
    });

    it("pick con strings numéricos ['1', '2'] → funciona: strings se coercen con +", () => {
      // +"1" === 1, así que la función los trata como números.
      // Pick "1-2" vs result "1-2" → exacto.
      expect(scorePick(["1", "2"], ["1", "2"])).toBe(PTS_EXACT);
    });

    it("pick con strings numéricos ['2', '1'] vs result ['3', '2'] → PTS_DIFF (coerción funciona)", () => {
      expect(scorePick(["2", "1"], ["3", "2"])).toBe(PTS_DIFF);
    });

    it("result undefined → 0", () => {
      expect(scorePick([1, 0], undefined)).toBe(0);
    });

    it("result null → 0", () => {
      expect(scorePick([1, 0], null)).toBe(0);
    });

    it("result parcial con undefined [1, undefined] → 0", () => {
      expect(scorePick([1, 0], [1, undefined])).toBe(0);
    });

    it("result parcial con string vacío [1, ''] → 0", () => {
      expect(scorePick([1, 0], [1, ""])).toBe(0);
    });
  });

  // ── Límites ───────────────────────────────────────────────────────────────
  describe("límites", () => {
    it("marcadores altos: pick 10-0, result 10-0 → PTS_EXACT", () => {
      expect(scorePick([10, 0], [10, 0])).toBe(PTS_EXACT);
    });

    it("marcadores negativos no crashean (aunque no deberían ocurrir)", () => {
      // No se especifica qué debe devolver, solo que no lanza excepción.
      expect(() => scorePick([-1, 2], [1, 0])).not.toThrow();
    });
  });
});
