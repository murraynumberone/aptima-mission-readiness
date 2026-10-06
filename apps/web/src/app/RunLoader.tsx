import { useLayoutEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@mission-readiness/ui";
import { loadRun } from "../data/load-run";
import type { Run } from "../data/types";

/**
 * Fetches the run and hands it to the app. The static placeholder in index.html stays until the app or the
 * error appears, so nothing flashes blank.
 */
export function RunLoader({
  load = loadRun,
  children,
}: {
  load?: () => Promise<Run>;
  children: (run: Run) => ReactNode;
}) {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ["run", "current"],
    queryFn: load,
    staleTime: Infinity,
  });
  const settled = data !== undefined || error !== null;

  useLayoutEffect(() => {
    if (settled) document.getElementById("app-shell")?.remove();
  }, [settled]);

  if (data) return children(data);
  if (!error) return null;
  return (
    <div role="alert" className="mx-auto max-w-xl p-6">
      <h1 className="text-lg font-semibold">We couldn’t load the exercise</h1>
      <p className="mt-2 text-muted-foreground">Check your connection, then try again.</p>
      <Button variant="primary" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
        Try again
      </Button>
    </div>
  );
}
