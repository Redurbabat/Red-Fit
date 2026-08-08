import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, text, action, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {Icon ? (
        <span className="empty-state__icon">
          <Icon size={36} strokeWidth={1.5} />
        </span>
      ) : null}
      <p className="empty-state__title">{title}</p>
      {text ? <p className="empty-state__text">{text}</p> : null}
      {action ? (
        <Button autoWidth onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {children}
    </div>
  );
}

/** Small skeleton block for short IndexedDB loads — no fullscreen spinners. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 56 }} />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  text?: string;
  onRetry?: () => void;
}

export function ErrorState({ text, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={CircleAlert}
      title="Daten konnten nicht geladen werden."
      text={text ?? "Bitte versuche es erneut."}
      action={onRetry ? { label: "Erneut versuchen", onClick: onRetry } : undefined}
    />
  );
}
