import { LayoutDashboard, Menu, Plus, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "./BrandMark";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/sessions/new", label: "New session", icon: Plus },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <Link to="/" className="mobile-brand" aria-label="FairPlay overview"><BrandMark /><strong>FairPlay</strong></Link>
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu /></button>
      </header>
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
          <div className="profile-chip">
            <div className="avatar">FP</div>
            <div><strong>Local workspace</strong><span>Saved on this device</span></div>
          </div>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to} end={to === "/"}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
