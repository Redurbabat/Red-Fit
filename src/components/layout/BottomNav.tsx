import { Dumbbell, House, Menu, PersonStanding, Utensils } from "lucide-react";
import { NavLink } from "react-router-dom";

/* Navigation 2031 (§7): exactly five entries, Körper absorbs Fortschritt. */
const NAV_ITEMS = [
  { to: "/today", label: "Heute", icon: House },
  { to: "/training", label: "Training", icon: Dumbbell },
  { to: "/nutrition", label: "Ernährung", icon: Utensils },
  { to: "/body", label: "Körper", icon: PersonStanding },
  { to: "/more", label: "Mehr", icon: Menu },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      <div className="bottom-nav__inner">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className="bottom-nav__item"
            style={undefined}
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
