import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "../components/layout/BottomNav";
import { DesktopNav } from "../components/layout/DesktopNav";
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

/** Hide floating chrome only when an editable field really opens a mobile keyboard. */
function useKeyboardOcclusion(): boolean {
  const [occluded, setOccluded] = useState(false);
  const freeHeight = useRef(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    freeHeight.current = viewport.height;
    const update = () => {
      const element = document.activeElement;
      const editable = element instanceof HTMLElement &&
        (element.matches("input, textarea, select") || element.isContentEditable);
      if (!editable) freeHeight.current = Math.max(freeHeight.current, viewport.height);
      const keyboardHeight = Math.max(
        window.innerHeight - viewport.height - viewport.offsetTop,
        freeHeight.current - viewport.height,
      );
      setOccluded(window.innerWidth < 1024 && editable && keyboardHeight > 140);
    };
    const onFocusChange = () => window.requestAnimationFrame(update);
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
    };
  }, []);

  return occluded;
}

export function AppShell() {
  const location = useLocation();
  const { showToast } = useToast();
  const fullscreen = isFullscreenRoute(location.pathname);
  const keyboardOpen = useKeyboardOcclusion();

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
    <div className={[
      "app-shell",
      fullscreen ? "app-shell--fullscreen" : "",
      keyboardOpen ? "app-shell--keyboard-open" : "",
    ].filter(Boolean).join(" ")}>
      {fullscreen ? null : <DesktopNav />}
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
