import { setupServer } from "msw/node";

// Importar en tests que necesiten interceptar HTTP:
//   import { server } from '../test/mswServer.js'
//   beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
//   afterEach(() => server.resetHandlers())
//   afterAll(() => server.close())
export const server = setupServer();
