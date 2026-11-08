import { ChartColumnIncreasing, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./BottomNav";

/** Dedicated desktop navigation; hidden by CSS below the desktop breakpoint. */
export function DesktopNav() {
  return (
    <aside className="desktop-nav" aria-label="RED Fit Desktop-Navigation">
      <div className="desktop-nav__brand" aria-label="RED Fit">RED <span>Fit</span></div>
      <p className="desktop-nav__tagline">Dein Performance-System</p>
      <nav className="desktop-nav__links" aria-label="Hauptnavigation Desktop">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="desktop-nav__link">
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="desktop-nav__spacer" />
      <nav className="desktop-nav__links" aria-label="Weitere Bereiche">
        <NavLink to="/progress" className="desktop-nav__link">
          <ChartColumnIncreasing size={20} aria-hidden="true" />
          <span>Trainingsanalyse</span>
        </NavLink>
        <NavLink to="/settings" className="desktop-nav__link">
          <Settings2 size={20} aria-hidden="true" />
          <span>Einstellungen</span>
        </NavLink>
      </nav>
    </aside>
  );
}
