import '@testing-library/jest-dom/vitest';

// Node 22+ ships an experimental global `localStorage` that can shadow
// jsdom's window.localStorage with a stub missing most Storage methods
// (e.g. `clear`/`removeItem`) unless `--localstorage-file` points at a
// writable path. Swap in a simple in-memory Storage so any component that
// reads/writes localStorage (LocaleProvider, auth token persistence, etc.)
// works consistently in tests regardless of the Node version/flags in CI.
if (typeof window.localStorage?.clear !== 'function') {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
}

// jsdom doesn't implement matchMedia — ThemeProvider reads it for the system preference.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
