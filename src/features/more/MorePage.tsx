import {
  Apple,
  Box,
  CalendarDays,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Download,
  Dumbbell,
  Info,
  Scale,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";

interface MoreEntry {
  icon: LucideIcon;
  label: string;
  to: string;
  subtitle?: string;
}

const ENTRIES: MoreEntry[] = [
  { icon: Target, label: "Ziele", to: "/settings" },
  { icon: Dumbbell, label: "Übungen", to: "/training/exercises" },
  { icon: ClipboardList, label: "Trainingspläne", to: "/training/plans" },
  { icon: Apple, label: "Lebensmittel", to: "/nutrition/foods" },
  { icon: ChefHat, label: "Rezepte", to: "/recipes" },
  { icon: CalendarDays, label: "Essensplan", to: "/nutrition/meal-plan" },
  { icon: ShoppingCart, label: "Einkaufsliste", to: "/shopping" },
  { icon: Scale, label: "Körperwerte", to: "/progress/body" },
  { icon: Download, label: "Backup & Import", to: "/backup" },
  { icon: Settings, label: "Einstellungen", to: "/settings" },
  { icon: Shield, label: "Datenschutz", to: "/privacy" },
  { icon: Info, label: "Über RED Fit", to: "/about" },
  { icon: Box, label: "3D Coach Demo", to: "/3d-demo" },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Mehr" />
      <Card>
        {ENTRIES.map(({ icon: Icon, label, to, subtitle }) => (
          <button
            key={label}
            type="button"
            className="list-row"
            onClick={() => navigate(to)}
          >
            <Icon size={20} color="var(--accent)" aria-hidden="true" />
            <span className="list-row__body">
              <span className="list-row__title">{label}</span>
              {subtitle ? <span className="list-row__subtitle">{subtitle}</span> : null}
            </span>
            <span className="list-row__trailing">
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </button>
        ))}

        {/* KI Coach: honestly labelled as "later" — no fake functionality (§105). */}
        <div className="list-row" aria-disabled="true" style={{ opacity: 0.55 }}>
          <Sparkles size={20} color="var(--text-soft)" aria-hidden="true" />
          <span className="list-row__body">
            <span className="list-row__title">KI Coach</span>
            <span className="list-row__subtitle">
              Persönliche Unterstützung für Training und Ernährung – später verfügbar.
            </span>
          </span>
          <span className="chip" style={{ minHeight: 28, fontSize: 12 }}>
            Später
          </span>
        </div>
      </Card>
    </>
  );
}
