import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "../ui/Button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  trailing?: ReactNode;
}

export function PageHeader({ title, subtitle, back, trailing }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back ? (
        <IconButton label="Zurück" onClick={() => navigate(-1)}>
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
