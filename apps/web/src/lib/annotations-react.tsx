import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { AnnotationStore, DebriefState } from "./annotations";

const Context = createContext<AnnotationStore | null>(null);

export function AnnotationsProvider({ store, children }: { store: AnnotationStore; children: ReactNode }) {
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useAnnotationActions(): AnnotationStore {
  const store = useContext(Context);
  if (!store) throw new Error("useAnnotationActions must be used inside <AnnotationsProvider>");
  return store;
}

/** Subscribe to a slice of the debrief state. Return a stable value (a field of the state, or a primitive). */
export function useDebrief<T>(selector: (state: DebriefState) => T): T {
  const store = useAnnotationActions();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
