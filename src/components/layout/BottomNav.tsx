import { useEffect, useRef, useState } from "react";
import { Dumbbell, House, Menu, PersonStanding, Utensils, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePress } from "../../design/red-morph/usePress";
import {
  initialDockScrollState,
  isDockTabActive,
  updateDockScrollState,
} from "./dockBehavior";

/* RED Fit 2031: five stable destinations, RED Morph/BBT-Bit-inspired dock. */
export const NAV_ITEMS = [
  { to: "/today", label: "Heute", icon: House },
  { to: "/training", label: "Training", icon: Dumbbell },
  { to: "/nutrition", label: "Ernährung", icon: Utensils },
  { to: "/body", label: "Körper", icon: PersonStanding },
  { to: "/more", label: "Mehr", icon: Menu },
];

interface DockLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  selected: boolean;
}

function DockLink({ to, label, icon: Icon, selected }: DockLinkProps) {
  const { pressProps } = usePress<HTMLAnchorElement>();
  return (
    <Link
      to={to}
      className="bottom-nav__item"
      aria-label={label}
      aria-current={selected ? "page" : undefined}
      {...pressProps}
    >
      <Icon size={22} strokeWidth={selected ? 2.4 : 1.8} aria-hidden="true" />
      <span className="bottom-nav__label" aria-hidden="true">{label}</span>
    </Link>
  );
}

/** One dock, five real links; RED Morph selection material responds to route changes. */
export function BottomNav() {
  const { pathname } = useLocation();
  const [compact, setCompact] = useState(false);
  const scrollRef = useRef(initialDockScrollState(0));
  const selectedIndex = NAV_ITEMS.findIndex(({ to }) => isDockTabActive(pathname, to));

  useEffect(() => {
    // Keep the component mounted so its selection can travel between routes,
    // but restore the expanded state whenever navigation changes.
    scrollRef.current = initialDockScrollState(window.scrollY);
    setCompact(false);

    const onScroll = () => {
      const next = updateDockScrollState(scrollRef.current, window.scrollY);
      scrollRef.current = next;
      setCompact((current) => current === next.compact ? current : next.compact);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <nav
      className={`bottom-nav${compact ? " bottom-nav--compact" : ""}`}
      aria-label="Hauptnavigation"
      data-dock-state={compact ? "compact" : "expanded"}
      data-active-index={selectedIndex >= 0 ? selectedIndex : "none"}
    >
      <div className="bottom-nav__inner">
        <span className="bottom-nav__selection" aria-hidden="true" />
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <DockLink
            key={to}
            to={to}
            label={label}
            icon={icon}
            selected={isDockTabActive(pathname, to)}
          />
        ))}
      </div>
    </nav>
  );
}
