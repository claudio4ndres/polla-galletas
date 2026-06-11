import { describe, it, expect } from "vitest";
import { isLocked, DEADLINE } from "./data.js";

// DEADLINE = 2026-06-11T19:00:00.000Z (UTC)
// Equivale a: Chile (UTC-4) → 2026-06-11 15:00  (inicio del primer partido)

describe("isLocked", () => {
  describe("antes del deadline", () => {
    it("1 ms antes → no bloqueado", () => {
      expect(isLocked(DEADLINE - 1)).toBe(false);
    });

    it("1 día antes → no bloqueado", () => {
      expect(isLocked(DEADLINE - 86_400_000)).toBe(false);
    });

    it("muy en el pasado (año 2000) → no bloqueado", () => {
      expect(isLocked(Date.UTC(2000, 0, 1))).toBe(false);
    });
  });

  describe("en el deadline exacto", () => {
    it("now === deadline → bloqueado", () => {
      expect(isLocked(DEADLINE)).toBe(true);
    });
  });

  describe("después del deadline", () => {
    it("1 ms después → bloqueado", () => {
      expect(isLocked(DEADLINE + 1)).toBe(true);
    });

    it("1 año después → bloqueado", () => {
      expect(isLocked(DEADLINE + 365 * 86_400_000)).toBe(true);
    });
  });

  describe("zonas horarias", () => {
    // El DEADLINE usa Date.UTC(), por lo que es independiente del TZ local.
    // Ambos usuarios ven el mismo timestamp absoluto; isLocked compara UTC.

    it("usuario en Chile (UTC-4): el momento exacto del deadline es el mismo timestamp", () => {
      // 2026-06-11 15:00 hora Chile = 2026-06-11T19:00Z
      const deadlineChile = Date.UTC(2026, 5, 11, 19, 0, 0); // +4h offset aplicado
      expect(deadlineChile).toBe(DEADLINE);
      expect(isLocked(deadlineChile)).toBe(true);
      expect(isLocked(deadlineChile - 1)).toBe(false);
    });

    it("usuario en otra zona horaria: el momento exacto del deadline es el mismo timestamp", () => {
      // mismo instante UTC sin importar la zona del cliente
      const deadlineSeul = Date.UTC(2026, 5, 11, 19, 0, 0); // UTC es UTC, mismo valor
      expect(deadlineSeul).toBe(DEADLINE);
      expect(isLocked(deadlineSeul)).toBe(true);
    });

    it("1 ms antes del deadline es igual para cualquier zona horaria", () => {
      // Cualquier cliente que tenga now < DEADLINE no está bloqueado, sin importar su TZ.
      expect(isLocked(DEADLINE - 1)).toBe(false);
    });
  });
});
