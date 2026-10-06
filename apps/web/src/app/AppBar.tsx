import type { ReactNode } from "react";
import { AptimaLogo } from "./AptimaLogo";

/** The top band: brand, a plain statement of what this is, and global controls. */
export function AppBar({ actions }: { actions: ReactNode }) {
  return (
    <div className="bar border-b border-line">
      <div className="mx-auto flex max-w-352 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <AptimaLogo className="h-6 w-auto shrink-0" />
          <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
          <p className="text-xs leading-tight text-muted-foreground">Concept project</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
