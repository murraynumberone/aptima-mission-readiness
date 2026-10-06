import type { Annotation } from "../data/types";

export const REVIEW_STATUSES = ["unreviewed", "confirmed", "adjusted", "dismissed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const reviewLabels: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  confirmed: "Confirmed",
  adjusted: "Adjusted",
  dismissed: "Dismissed",
};

export const reviewHints: Record<ReviewStatus, string> = {
  unreviewed: "Not looked at yet.",
  confirmed: "Agree with how the system recorded this.",
  adjusted: "Recorded, with a correction. Say what in a note.",
  dismissed: "Not relevant to the debrief.",
};

export interface Review {
  status: ReviewStatus;
  updatedAt: string;
}

export interface DebriefState {
  annotations: Annotation[];
  /** Only events that have left "unreviewed" have an entry. */
  reviews: Record<string, Review>;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface AnnotationsOptions {
  /** Defaults to localStorage. Pass null for memory only. */
  storage?: StorageLike | null;
  now?: () => Date;
}

const storageKey = (runId: string) => `mr-debrief-v1:${runId}`;
const empty = (): DebriefState => ({ annotations: [], reviews: {} });

const isStatus = (v: unknown): v is ReviewStatus => REVIEW_STATUSES.includes(v as ReviewStatus);
const isString = (v: unknown): v is string => typeof v === "string";

// Anything read back from storage is untrusted: keep only well-formed entries.
function parse(raw: string | null, runId: string): DebriefState {
  if (!raw) return empty();
  try {
    const data = JSON.parse(raw) as Partial<DebriefState>;
    const annotations = (Array.isArray(data.annotations) ? data.annotations : [])
      .filter(
        (a): a is Annotation =>
          !!a &&
          isString(a.id) &&
          a.runId === runId &&
          Number.isFinite(a.t) &&
          isString(a.text) &&
          isString(a.createdAt),
      )
      .map((a) => ({ ...a, updatedAt: isString(a.updatedAt) ? a.updatedAt : a.createdAt }));
    const reviews: Record<string, Review> = {};
    for (const [id, r] of Object.entries(data.reviews ?? {})) {
      if (r && isStatus(r.status) && r.status !== "unreviewed" && isString(r.updatedAt)) reviews[id] = r;
    }
    return { annotations, reviews };
  } catch {
    return empty();
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Instructor notes and event review statuses for one run. Framework-free, persisted per run. */
export function createAnnotations(
  runId: string,
  { storage = defaultStorage(), now = () => new Date() }: AnnotationsOptions = {},
) {
  let state = (() => {
    try {
      return parse(storage?.getItem(storageKey(runId)) ?? null, runId);
    } catch {
      return empty();
    }
  })();
  const listeners = new Set<() => void>();
  let counter = 0;

  const commit = (next: DebriefState) => {
    state = next;
    try {
      storage?.setItem(storageKey(runId), JSON.stringify(state));
    } catch {
      /* the change still applies for this visit */
    }
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add(input: { t: number; text: string; eventId?: string }): Annotation | undefined {
      const text = input.text.trim();
      if (!text) return undefined;
      const stamp = now().toISOString();
      const note: Annotation = {
        id: `n-${Date.now().toString(36)}-${counter++}-${Math.random().toString(36).slice(2, 6)}`,
        runId,
        t: input.t,
        text,
        eventId: input.eventId,
        createdAt: stamp,
        updatedAt: stamp,
      };
      commit({ ...state, annotations: [...state.annotations, note] });
      return note;
    },
    update(id: string, textInput: string) {
      const text = textInput.trim();
      if (!text) return;
      const stamp = now().toISOString();
      commit({
        ...state,
        annotations: state.annotations.map((a) => (a.id === id ? { ...a, text, updatedAt: stamp } : a)),
      });
    },
    remove(id: string) {
      commit({ ...state, annotations: state.annotations.filter((a) => a.id !== id) });
    },
    setReview(eventId: string, status: ReviewStatus) {
      if (!isStatus(status)) return;
      const reviews = { ...state.reviews };
      if (status === "unreviewed") delete reviews[eventId];
      else reviews[eventId] = { status, updatedAt: now().toISOString() };
      commit({ ...state, reviews });
    },
  };
}

export type AnnotationStore = ReturnType<typeof createAnnotations>;
