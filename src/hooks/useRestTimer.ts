import { useEffect, useState } from "react";

/**
 * Remaining rest seconds derived from an absolute deadline. The truth is
 * `restEndsAt` — an ISO timestamp persisted on the workout — so backgrounding,
 * screen lock and reloads can never desync the timer (§50/§147).
 */
export function useRestTimer(restEndsAt: string | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(() =>
    computeRemaining(restEndsAt),
  );

  useEffect(() => {
    setRemaining(computeRemaining(restEndsAt));
    if (!restEndsAt) return;

    const tick = () => setRemaining(computeRemaining(restEndsAt));
    const interval = setInterval(tick, 250);
    // Recompute immediately when the app returns from background.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [restEndsAt]);

  return remaining;
}

function computeRemaining(restEndsAt: string | undefined): number | null {
  if (!restEndsAt) return null;
  const ms = new Date(restEndsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}
