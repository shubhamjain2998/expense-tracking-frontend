import '@testing-library/jest-dom'

import { server } from './src/test/server'

// On Node 22+ neither `globalThis.localStorage` nor `window.localStorage`
// resolves under jsdom: Node's own experimental Storage getter returns
// `undefined` unless the process was started with `--localstorage-file`, and
// it shadows jsdom's. Tests that touch storage then fail with "Cannot read
// properties of undefined". Install a plain in-memory Storage instead.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  }
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  if (globalThis[key] != null) continue
  const storage = createMemoryStorage()
  const define = (target: object) =>
    Object.defineProperty(target, key, { configurable: true, value: storage })
  define(globalThis)
  if (globalThis.window && globalThis.window !== globalThis) define(globalThis.window)
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
