import { CalendarDays, CircleHelp, LayoutDashboard, Menu, Settings, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "./BrandMark";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/sessions/demo-friday-badminton", label: "Sessions", icon: CalendarDays },
  { to: "/sessions/demo-friday-badminton?tab=players", label: "Players", icon: UsersRound },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu /></button>
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <BrandMark />
          <div><strong>FairPlay</strong><span>Rotation scheduler</span></div>
          <button className="sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        <nav aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={label} to={to} end={to === "/"} onClick={() => setMenuOpen(false)}>
              <Icon size={19} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#settings"><Settings size={18} />Settings</a>
          <a href="#help"><CircleHelp size={18} />Help center</a>
          <div className="profile-chip">
            <div className="avatar">FA</div>
            <div><strong>Fauzan</strong><span>Organizer</span></div>
          </div>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
