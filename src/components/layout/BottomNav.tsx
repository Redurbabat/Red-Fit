import { useEffect, useRef, useState } from "react";
import { Dumbbell, House, Menu, PersonStanding, Utensils } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
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

/** One dock, not a second floating toolbar. The five links stay usable when compact. */
export function BottomNav() {
  const { pathname } = useLocation();
  const [compact, setCompact] = useState(false);
  const scrollRef = useRef(initialDockScrollState(0));

  useEffect(() => {
    // AppShell keys this dock by route, resetting it on navigation.
    // While this route is active, only actual scroll direction changes state.
    scrollRef.current = initialDockScrollState(window.scrollY);

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
    >
      <div className="bottom-nav__inner">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const selected = isDockTabActive(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              className="bottom-nav__item"
              aria-label={label}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={22} strokeWidth={selected ? 2.4 : 1.8} aria-hidden="true" />
              <span className="bottom-nav__label" aria-hidden="true">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
