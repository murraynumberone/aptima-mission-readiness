/** A controllable window.matchMedia for tests: flip a query and listeners fire, like an OS setting change. */
type Listener = (e: { matches: boolean }) => void;

const state = { dark: false, reduced: false };
const listeners = new Map<string, Set<Listener>>();

const matches = (q: string) =>
  q.includes("prefers-color-scheme: dark")
    ? state.dark
    : q.includes("prefers-reduced-motion: reduce")
      ? state.reduced
      : false;

export function installMatchMedia() {
  window.matchMedia = ((query: string) => {
    const set = listeners.get(query) ?? listeners.set(query, new Set()).get(query)!;
    return {
      get matches() {
        return matches(query);
      },
      media: query,
      addEventListener: (_: string, l: Listener) => set.add(l),
      removeEventListener: (_: string, l: Listener) => set.delete(l),
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

export function setMedia(next: Partial<typeof state>) {
  Object.assign(state, next);
  for (const [query, set] of listeners) set.forEach((l) => l({ matches: matches(query) }));
}

export const resetMedia = () => {
  state.dark = false;
  state.reduced = false;
};
