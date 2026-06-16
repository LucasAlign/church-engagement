import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLayoutGrid, IconList, IconAdjustmentsHorizontal, IconPlus, IconBuildingChurch, IconFileSpreadsheet } from '@tabler/icons-react';
import db from '../data/db.js';
import { getContactsByChurch, getUserById, contactStatus } from '../data/helpers.js';
import { ENGAGEMENT_STATUS, fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, SearchBar, FilterPills, AvatarInitials, EmptyState, ContactDot } from '../components/shared.jsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active_partner', label: 'Active partner' },
  { value: 'strategic_partner', label: 'Strategic partner' },
  { value: 'interested', label: 'Interested' },
  { value: 'dormant', label: 'Dormant' },
];

function attendanceRange(c) {
  return `${c.attendanceMin}–${c.attendanceMax}`;
}

export default function Churches() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('table');

  const churches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.churches.filter(c => {
      if (status !== 'all' && c.engagementStatus !== status) return false;
      if (!q) return true;
      const pastors = getContactsByChurch(c.id).map(p => p.name).join(' ');
      return [c.name, c.city, c.denomination, pastors].join(' ').toLowerCase().includes(q);
    });
  }, [query, status]);

  return (
    <>
      <Header
        title="Churches"
        subtitle={`${db.churches.length} churches in Berks County`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={() => navigate('/import')}><IconFileSpreadsheet stroke={1.75} /> Import CSV</button>
            <button className="btn primary"><IconPlus stroke={2} /> Add church</button>
          </div>
        }
      />
      <div className="toolbar">
        <div style={{ flex: 1, minWidth: 260 }}>
          <SearchBar placeholder="Search by name, city, pastor, or denomination…" value={query} onChange={setQuery} />
        </div>
      </div>
      <div className="toolbar">
        <FilterPills options={STATUS_FILTERS} active={status} onChange={setStatus} />
        <button className="btn sm"><IconAdjustmentsHorizontal stroke={1.75} /> More filters</button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className={`btn sm ${view === 'table' ? 'primary' : ''}`} onClick={() => setView('table')} aria-label="Table view"><IconList stroke={1.75} /></button>
          <button className={`btn sm ${view === 'cards' ? 'primary' : ''}`} onClick={() => setView('cards')} aria-label="Card view"><IconLayoutGrid stroke={1.75} /></button>
        </span>
      </div>

      {churches.length === 0 && (
        <div className="card">
          <EmptyState icon={IconBuildingChurch} title="No churches match" sub="Try a different search or filter." />
        </div>
      )}

      {view === 'table' && churches.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Church</th>
                <th>Denomination</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Last contact</th>
                <th>Coordinator</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {churches.map(c => {
                const coordinator = c.assignedCoordinatorId ? getUserById(c.assignedCoordinatorId) : null;
                const st = ENGAGEMENT_STATUS[c.engagementStatus];
                return (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/churches/${c.id}`)}>
                    <td>
                      <div className="cell-stack">
                        <div className="cell-primary">{c.name}</div>
                        <div className="cell-secondary">{c.city}, {c.state}</div>
                      </div>
                    </td>
                    <td className="cell-muted">{c.denomination}</td>
                    <td className="cell-muted">{attendanceRange(c)}</td>
                    <td><Badge label={st.label} variant={st.variant} /></td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <ContactDot status={contactStatus(c.lastInteractionDate)} date={fmtDate(c.lastInteractionDate)} />
                        <span className="cell-muted">{fmtDate(c.lastInteractionDate)}</span>
                      </span>
                    </td>
                    <td className="cell-muted">{coordinator ? coordinator.name : '—'}</td>
                    <td><button className="btn sm" onClick={e => { e.stopPropagation(); navigate(`/churches/${c.id}`); }}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'cards' && churches.length > 0 && (
        <div className="church-grid">
          {churches.map(c => {
            const coordinator = c.assignedCoordinatorId ? getUserById(c.assignedCoordinatorId) : null;
            const st = ENGAGEMENT_STATUS[c.engagementStatus];
            return (
              <div className="card church-card" key={c.id} onClick={() => navigate(`/churches/${c.id}`)}>
                <div className="cc-head">
                  <AvatarInitials name={c.name} size="md" />
                  <div>
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-city">{c.city}, {c.state}</div>
                  </div>
                </div>
                <Badge label={st.label} variant={st.variant} />
                <div className="cc-foot">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ContactDot status={contactStatus(c.lastInteractionDate)} date={fmtDate(c.lastInteractionDate)} />
                    Last contact {fmtDate(c.lastInteractionDate)}
                  </span>
                  {coordinator
                    ? <AvatarInitials name={coordinator.name} initials={coordinator.initials} size="sm" />
                    : <span>Unassigned</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
