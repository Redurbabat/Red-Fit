import type { ReactNode } from "react";
import { ErrorBoundary } from "../components/feedback/ErrorBoundary";
import { ToastProvider } from "../components/feedback/ToastProvider";
import { SettingsProvider } from "../hooks/useSettings";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ToastProvider>{children}</ToastProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
