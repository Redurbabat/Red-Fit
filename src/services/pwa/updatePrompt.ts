import { registerSW } from "virtual:pwa-register";

type UpdateListener = (applyUpdate: () => void) => void;

let listener: UpdateListener | null = null;
let pendingUpdate: (() => void) | null = null;

/**
 * SW registration with prompt-style updates (§88): a new version never
 * hard-reloads on its own. The app shows a toast; the user decides.
 * Active workout data is safe either way — it is autosaved in IndexedDB.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      const apply = () => void updateSW(true);
      if (listener) listener(apply);
      else pendingUpdate = apply;
    },
  });
}

/** The app shell registers here to surface the "Neue Version" toast. */
export function onUpdateAvailable(fn: UpdateListener): void {
  listener = fn;
  if (pendingUpdate) {
    fn(pendingUpdate);
    pendingUpdate = null;
  }
}
