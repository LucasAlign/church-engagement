import { NavLink } from 'react-router-dom';
import {
  IconBug,
  IconBell,
  IconLogout,
  IconHeart,
} from '@tabler/icons-react';
import { getUserById } from '../data/helpers.js';
import { AvatarInitials } from './shared.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/churches', label: 'Churches' },
  { to: '/interactions', label: 'Interactions' },
  { to: '/follow-ups', label: 'Follow-ups' },
  { to: '/giving', label: 'Giving' },
  { to: '/reports', label: 'Reports & Impact' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

function TopNav() {
  const me = getUserById('usr_001');
  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <div className="top-nav-brand">
          <div className="brand-logo">
            <IconHeart stroke={2} />
          </div>
          <span className="brand-wordmark">WRAPAROUND</span>
        </div>
        <div className="top-nav-sep" />
        <span className="top-nav-role">KFA Coordinator</span>
        <nav className="top-nav-items">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `top-nav-item${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="top-nav-right">
        <button className="top-nav-btn">
          <IconBug stroke={1.75} />
          Report a Bug
        </button>
        <button className="icon-btn">
          <IconBell stroke={1.75} />
        </button>
        <AvatarInitials name={me.name} initials={me.initials} size="sm" />
        <button className="top-nav-btn">
          <IconLogout stroke={1.75} />
          Sign out
        </button>
      </div>
    </header>
  );
}

export function Header({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="main">
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
