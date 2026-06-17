import { NavLink } from 'react-router-dom';
import {
  IconBug,
  IconBell,
  IconLogout,
} from '@tabler/icons-react';
import { getUserById } from '../data/helpers.js';
import { useDb } from '../data/store.jsx';
import { AvatarInitials } from './shared.jsx';

function FlockLogo() {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* large bird left */}
      <path d="M1 7 C2 5.5 3.5 5.5 4.5 7 C5.5 5 7.5 4.5 8 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* medium bird center */}
      <path d="M6 4 C7 2.8 8.2 2.8 9 4 C9.8 2.5 11.2 2.2 11.5 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* small bird right */}
      <path d="M11 6.5 C11.8 5.5 12.8 5.5 13.5 6.5 C14 5.2 15.2 5 15.5 6" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

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
            <FlockLogo />
          </div>
          <span className="brand-wordmark">Flock</span>
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

function BackendBanner() {
  const { backend, backendError } = useDb();
  if (backend === 'demo') {
    return (
      <div className="backend-banner backend-banner-demo">
        Demo mode — changes are not saved. Connect Supabase to enable saving (see README).
      </div>
    );
  }
  if (backend === 'error') {
    return (
      <div className="backend-banner backend-banner-error">
        Could not reach the database — showing sample data, changes will not be saved. ({backendError})
      </div>
    );
  }
  return null;
}

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="main">
        <BackendBanner />
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
