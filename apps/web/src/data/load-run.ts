import { currentRun } from "./runs";
import type { Run } from "./types";

/**
 * The one place the app asks for a run. A request to the exercise system replaces this body; everything
 * downstream depends only on the `Run` type.
 */
export async function loadRun(): Promise<Run> {
  return currentRun;
}
