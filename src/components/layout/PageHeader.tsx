import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "../ui/Button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  /** Target route when there is no history entry to go back to (deep link / fresh tab). */
  backFallback?: string;
  trailing?: ReactNode;
}

export function PageHeader({ title, subtitle, back, backFallback, trailing }: PageHeaderProps) {
  const navigate = useNavigate();

  const goBack = () => {
    // React Router keeps its stack index in history.state.idx; 0 = first entry,
    // so navigate(-1) would be a dead button on deep links / fresh tabs.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) {
      navigate(-1);
    } else {
      navigate(backFallback ?? "/today", { replace: true });
    }
  };

  return (
    <header className="page-header">
      {back ? (
        <IconButton label="Zurück" onClick={goBack}>
          <ArrowLeft size={22} />
        </IconButton>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="page-header__title">{title}</h1>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      </div>
      {trailing}
    </header>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onClick: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h2 className="section-header__title">{title}</h2>
      {action ? (
        <button type="button" className="section-header__action" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
