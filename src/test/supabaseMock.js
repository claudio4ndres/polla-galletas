import { vi } from "vitest";

/**
 * Crea un mock del cliente de Supabase con respuestas configurables.
 *
 * Uso:
 *   const mock = createSupabaseMock();
 *   mock.from("predictions").select.mockResolvedValue({ data: [...], error: null });
 *
 * Por defecto todas las operaciones devuelven { data: null, error: null }.
 */
export function createSupabaseMock(overrides = {}) {
  const defaultResponse = { data: null, error: null };

  const makeQuery = () => {
    const q = {
      select: vi.fn().mockResolvedValue(defaultResponse),
      insert: vi.fn().mockResolvedValue(defaultResponse),
      upsert: vi.fn().mockResolvedValue(defaultResponse),
      update: vi.fn().mockResolvedValue(defaultResponse),
      delete: vi.fn().mockResolvedValue(defaultResponse),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue(defaultResponse),
    };
    // eq y maybeSingle encadenan de vuelta al mismo objeto
    q.eq.mockReturnValue(q);
    return q;
  };

  const fromMap = {};
  const from = vi.fn((table) => {
    if (!fromMap[table]) fromMap[table] = makeQuery();
    return fromMap[table];
  });

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides.auth,
  };

  return { from, auth, _fromMap: fromMap, ...overrides };
}
