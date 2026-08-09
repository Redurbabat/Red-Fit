import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "../components/layout/BottomNav";
import { QuickLogButton } from "../components/layout/QuickLogButton";
import { useToast } from "../components/feedback/ToastProvider";
import { onUpdateAvailable } from "../services/pwa/updatePrompt";

/** Routes rendered fullscreen (no bottom nav): workout mode + onboarding. */
function isFullscreenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/onboarding") ||
    /^\/training\/workout\/[^/]+$/.test(pathname)
  );
}

export function AppShell() {
  const location = useLocation();
  const { showToast } = useToast();
  const fullscreen = isFullscreenRoute(location.pathname);

  // PWA update prompt: never auto-reload — the user taps "Aktualisieren" (§88).
  useEffect(() => {
    onUpdateAvailable((applyUpdate) => {
      showToast("Neue Version verfügbar", {
        label: "Aktualisieren",
        onClick: applyUpdate,
      });
    });
  }, [showToast]);

  return (
    <div className="app-shell">
      <main
        className={`app-shell__content${fullscreen ? " app-shell__content--full" : ""}`}
      >
        <Outlet />
      </main>
      {fullscreen ? null : (
        <>
          <QuickLogButton />
          <BottomNav />
        </>
      )}
    </div>
  );
}
