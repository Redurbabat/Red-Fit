import {
  Apple,
  Box,
  CalendarDays,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Download,
  Dumbbell,
  Gauge,
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
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";

interface MoreEntry {
  icon: LucideIcon;
  label: string;
  to: string;
  subtitle?: string;
}

/* Grouped tool overview (§93): Werkzeuge / Daten / System — no chaotic list. */
const GROUPS: { title: string; entries: MoreEntry[] }[] = [
  {
    title: "Deine Werkzeuge",
    entries: [
      { icon: Sparkles, label: "Coach", to: "/coach", subtitle: "Insights und Wochenrückblick" },
      { icon: Target, label: "Ziele", to: "/settings" },
      { icon: Dumbbell, label: "Übungen", to: "/training/exercises" },
      { icon: ClipboardList, label: "Trainingspläne", to: "/training/plans" },
      { icon: Apple, label: "Lebensmittel", to: "/nutrition/foods" },
      { icon: ChefHat, label: "Rezepte", to: "/recipes" },
      { icon: CalendarDays, label: "Essensplan", to: "/nutrition/meal-plan" },
      { icon: ShoppingCart, label: "Einkaufsliste", to: "/shopping" },
      { icon: Scale, label: "Körperwerte", to: "/body/measurements" },
      { icon: Box, label: "3D Coach Demo", to: "/3d-demo" },
    ],
  },
  {
    title: "Daten",
    entries: [
      { icon: Download, label: "Backup & Import", to: "/backup" },
      { icon: Gauge, label: "Speicher & Diagnose", to: "/diagnostics" },
      { icon: Shield, label: "Datenschutz", to: "/privacy" },
    ],
  },
  {
    title: "System",
    entries: [
      { icon: Settings, label: "Einstellungen", to: "/settings" },
      { icon: Info, label: "Über RED Fit", to: "/about" },
    ],
  },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Mehr" />
      {GROUPS.map((group) => (
        <section key={group.title}>
          <SectionHeader title={group.title} />
          <Card>
            {group.entries.map(({ icon: Icon, label, to, subtitle }) => (
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
          </Card>
        </section>
      ))}
    </>
  );
}
