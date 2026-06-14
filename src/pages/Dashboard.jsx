import { useState } from 'react';
import {
  IconSearch, IconMapPin, IconChevronRight, IconRefresh,
  IconUsers, IconBuildingChurch, IconHeartHandshake, IconUser,
  IconCheckbox, IconPray,
} from '@tabler/icons-react';
import db from '../data/db.js';
import { fmtDate } from '../data/labels.js';
import { useDb } from '../data/store.jsx';

function getDirectoryCounts() {
  const advocates = db.contacts.filter(c => c.kfaRole === 'advocate' || c.kfaRole === 'champion');
  const volunteers = db.contacts.filter(c => c.kfaRole === 'primary_contact' || c.kfaRole === 'admin');
  return {
    volunteers: volunteers.length,
    advocates: advocates.length,
    families: 0,
    partnerChurches: db.churches.length,
  };
}

function getAllRecords() {
  const contacts = db.contacts.map(c => {
    const church = db.churches.find(ch => ch.id === c.churchId);
    const isAdvocate = c.kfaRole === 'advocate' || c.kfaRole === 'champion';
    return {
      id: c.id,
      name: c.name,
      sub: c.email,
      typeKey: isAdvocate ? 'advocate' : 'volunteer',
      typeLabel: isAdvocate ? 'Advocates' : 'Volunteers',
      lastContact: church?.lastInteractionDate || null,
    };
  });
  const churches = db.churches.map(ch => ({
    id: ch.id,
    name: ch.name,
    sub: `${ch.city}, ${ch.state}`,
    typeKey: 'church',
    typeLabel: 'Churches',
    lastContact: ch.lastInteractionDate || null,
  }));
  return [...contacts, ...churches];
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'volunteer', label: 'Volunteers' },
  { key: 'advocate', label: 'Advocates' },
  { key: 'family', label: 'Families' },
  { key: 'church', label: 'Churches' },
];

function DirectoryWidget() {
  const counts = getDirectoryCounts();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const rows = [
    { icon: IconUsers, label: 'Volunteers', count: counts.volunteers, color: 'blue' },
    { icon: IconUser, label: 'Church Advocates', count: counts.advocates, color: 'purple' },
    { icon: IconHeartHandshake, label: 'Families', count: counts.families, color: 'green' },
    { icon: IconBuildingChurch, label: 'Partner Churches', count: counts.partnerChurches, color: 'amber' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Directory</div>
        <span className="dir-updated">
          <IconRefresh stroke={1.5} style={{ width: 12, height: 12 }} />
          Updated {timeStr}
        </span>
      </div>
      <div className="dir-list">
        {rows.map(({ icon: Icon, label, count, color }) => (
          <div className="dir-row" key={label}>
            <div
              className="dir-icon"
              style={{
                background: `var(--${color}-bg)`,
                color: color === 'amber' ? 'var(--amber-600)' : color === 'purple' ? 'var(--purple-600)' : `var(--${color}-400)`,
              }}
            >
              <Icon stroke={1.75} />
            </div>
            <span className="dir-label">{label}</span>
            <span
              className="dir-count"
              style={{
                color: color === 'amber' ? 'var(--amber-600)' : color === 'purple' ? 'var(--purple-600)' : `var(--${color}-400)`,
              }}
            >
              {count}
            </span>
            <IconChevronRight stroke={1.5} className="dir-chevron" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PrayerSpotlightWidget() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🙏 Prayer Spotlight</div>
      </div>
      <div className="empty-state" style={{ padding: '32px 20px' }}>
        <IconPray stroke={1.25} />
        <div className="es-title">Prayer spotlight coming soon</div>
        <div>Prayer requests will surface</div>
      </div>
    </div>
  );
}

function DatabaseWidget() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const allRecords = getAllRecords();

  const counts = {
    all: allRecords.length,
    volunteer: allRecords.filter(r => r.typeKey === 'volunteer').length,
    advocate: allRecords.filter(r => r.typeKey === 'advocate').length,
    family: 0,
    church: allRecords.filter(r => r.typeKey === 'church').length,
  };

  let filtered = filter === 'all' ? allRecords : allRecords.filter(r => r.typeKey === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));
  }

  return (
    <div className="card">
      <div className="db-card-inner">
        <div className="db-card-title">Database</div>
        <div className="search-bar">
          <IconSearch stroke={1.75} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all records..."
          />
        </div>
        <div className="db-filter-row">
          <div className="db-filter-pills">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`db-filter-pill${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="db-pill-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="location-pill">
            <IconMapPin stroke={1.75} style={{ width: 12, height: 12 }} />
            Berks
          </div>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>NAME</th>
            <th>TYPE</th>
            <th>LAST CONTACT</th>
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>
                <div className="cell-stack">
                  <div className="cell-primary">{r.name}</div>
                  <div className="cell-secondary">{r.sub}</div>
                </div>
              </td>
              <td>
                <span className="db-type-link">{r.typeLabel}</span>
              </td>
              <td>
                {r.lastContact
                  ? <span className="db-last-badge">{fmtDate(r.lastContact)}</span>
                  : <span className="cell-muted">—</span>}
              </td>
              <td>
                <IconChevronRight stroke={1.5} style={{ width: 14, height: 14, color: 'var(--text-tertiary)', display: 'block' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ToDoWidget() {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconCheckbox stroke={1.75} style={{ width: 16, height: 16 }} />
          <span className="card-title">To-Do</span>
        </div>
      </div>
      <div className="empty-state" style={{ padding: '32px 20px' }}>
        <IconCheckbox stroke={1.25} />
        <div className="es-title">Personal task list coming soon</div>
        <div>To-do items will be available</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDb();
  return (
    <div>
      <div className="overview-topbar">
        <button className="btn sm">
          <IconRefresh stroke={1.75} />
          Reset layout
        </button>
      </div>
      <div className="overview-grid">
        <div className="overview-left">
          <DirectoryWidget />
          <PrayerSpotlightWidget />
        </div>
        <div className="overview-right">
          <DatabaseWidget />
          <ToDoWidget />
        </div>
      </div>
    </div>
  );
}
