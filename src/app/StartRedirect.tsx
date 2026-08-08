import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { settingsRepository } from "../services/storage/settingsRepository";

/** "/" routes to /today once onboarding is done, else to /onboarding (§135). */
export function StartRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    settingsRepository
      .getMetadata()
      .then((metadata) => {
        if (!cancelled) setTarget(metadata.onboardingCompleted ? "/today" : "/onboarding");
      })
      .catch((error: unknown) => {
        // IndexedDB unavailable (private mode / corrupted storage): fall back to
        // onboarding (matches DEFAULT_METADATA.onboardingCompleted = false)
        // instead of leaving "/" blank forever.
        console.error("StartRedirect: failed to read metadata", error);
        if (!cancelled) setTarget("/onboarding");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null; // app shell shows instantly; redirect follows in ms
  return <Navigate to={target} replace />;
}
