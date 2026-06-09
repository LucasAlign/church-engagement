// AppShell, Sidebar, Header — matches Wraparound Admin layout.
import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconBuildingChurch,
  IconMessages,
  IconCheckbox,
  IconHeartHandshake,
  IconFileDescription,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react';
import { getOverdueTaskCount, getUserById } from '../data/helpers.js';
import { useDb } from '../data/store.jsx';
import { AvatarInitials } from './shared.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconLayoutDashboard, end: true },
  { to: '/churches', label: 'Churches', icon: IconBuildingChurch },
  { to: '/interactions', label: 'Interactions', icon: IconMessages },
  { to: '/follow-ups', label: 'Follow-ups', icon: IconCheckbox, badge: getOverdueTaskCount },
  { to: '/giving', label: 'Giving', icon: IconHeartHandshake },
  { to: '/reports', label: 'Impact reports', icon: IconFileDescription },
  { to: '/analytics', label: 'Analytics', icon: IconChartBar },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

function Sidebar() {
  useDb(); // re-render badge counts after mutations
  const me = getUserById('usr_001');
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">KF</div>
        <div>
          <div className="brand-name">KeyFam1</div>
          <div className="brand-sub">Church engagement</div>
        </div>
      </div>
      <nav className="nav-list">
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge, end }) => {
          const count = badge ? badge() : 0;
          return (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon stroke={1.75} />
              {label}
              {count > 0 && <span className="nav-badge">{count}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="user-pill">
        <AvatarInitials name={me.name} initials={me.initials} size="md" />
        <div>
          <div className="user-name">{me.name}</div>
          <div className="user-role">{me.role} · {me.county}</div>
        </div>
      </div>
    </aside>
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
      <Sidebar />
      <main className="main">
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
