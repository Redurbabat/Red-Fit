import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { settingsRepository } from "../services/storage/settingsRepository";

/** "/" routes to /today once onboarding is done, else to /onboarding (§135). */
export function StartRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void settingsRepository.getMetadata().then((metadata) => {
      if (!cancelled) setTarget(metadata.onboardingCompleted ? "/today" : "/onboarding");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null; // app shell shows instantly; redirect follows in ms
  return <Navigate to={target} replace />;
}
