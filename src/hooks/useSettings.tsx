import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SETTINGS, type UserSettings } from "../models/settings";
import { settingsRepository } from "../services/storage/settingsRepository";

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (changes: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Applies theme + reduced motion to <html> so plain CSS can react to it. */
function applyToDocument(settings: UserSettings): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme =
    settings.theme === "system" ? (prefersDark ? "dark" : "light") : settings.theme;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-reduced-motion", String(settings.reducedMotion));
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void settingsRepository.getSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      applyToDocument(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Follow OS theme changes while in "system" mode.
  useEffect(() => {
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyToDocument(settings);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

  const updateSettings = useCallback(async (changes: Partial<UserSettings>) => {
    const next = await settingsRepository.updateSettings(changes);
    setSettings(next);
    applyToDocument(next);
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
