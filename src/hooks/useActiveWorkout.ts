import { useLiveQuery } from "dexie-react-hooks";
import type { WorkoutLog } from "../models";
import { db } from "../services/storage/database";

/**
 * Live view of the one active workout (if any). Powered by Dexie's liveQuery,
 * so the resume banner appears/disappears reactively everywhere.
 */
export function useActiveWorkout(): WorkoutLog | undefined | null {
  const result = useLiveQuery(
    () => db.workoutLogs.where("status").equals("active").first(),
    [],
    null, // null = still loading (distinguishes from "none active")
  );
  return result;
}
