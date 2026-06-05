import "@testing-library/jest-dom";
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

// Extender expect con matchers de accesibilidad
expect.extend(toHaveNoViolations);

// El servidor MSW se inicia en los tests que lo necesiten:
//   import { server } from '../test/mswServer.js'
//   beforeAll(() => server.listen())
//   afterEach(() => server.resetHandlers())
//   afterAll(() => server.close())
