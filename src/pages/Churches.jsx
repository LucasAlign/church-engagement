import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLayoutGrid, IconList, IconAdjustmentsHorizontal, IconPlus, IconBuildingChurch, IconFileSpreadsheet, IconEdit, IconX } from '@tabler/icons-react';
import db from '../data/db.js';
import { getContactsByChurch, getUserById, contactStatus } from '../data/helpers.js';
import { ENGAGEMENT_STATUS, fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, SearchBar, FilterPills, AvatarInitials, EmptyState, ContactDot } from '../components/shared.jsx';
import { saveRecord } from '../data/backend.js';

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

function ChurchForm({ church, onSave, onCancel }) {
  const [formData, setFormData] = useState(church || {});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.id) {
      formData.id = `ch_${Date.now()}`;
    }
    const existing = db.churches.findIndex(c => c.id === formData.id);
    if (existing >= 0) {
      db.churches[existing] = formData;
    } else {
      db.churches.push(formData);
    }
    saveRecord('churches', formData);
    onSave();
  };

  const fields = [
    { label: 'Name', key: 'name', required: true },
    { label: 'Address', key: 'address' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Zip', key: 'zip' },
    { label: 'Phone', key: 'phone' },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Website', key: 'website' },
    { label: 'Denomination', key: 'denomination' },
    { label: 'Min Attendance', key: 'attendanceMin', type: 'number' },
    { label: 'Max Attendance', key: 'attendanceMax', type: 'number' },
    { label: 'Engagement Status', key: 'engagementStatus' },
    { label: 'Assigned Coordinator ID', key: 'assignedCoordinatorId' },
    { label: 'Notes', key: 'notes', type: 'textarea' },
  ];

  return (
    <div className="modal-overlay" onClick={onCancel} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {church?.id ? 'Edit' : 'Add'} Church
          </h2>
          <button onClick={onCancel} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
          }}>
            <IconX stroke={1.5} size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {fields.map(field => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                marginBottom: 6,
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}>
                {field.label}
                {field.required && <span style={{ color: 'var(--red-500)' }}>*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                  }}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          padding: '24px',
          borderTop: '1px solid var(--border)',
          justifyContent: 'flex-end',
        }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{
            padding: '8px 16px',
            backgroundColor: 'var(--primary-500)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Churches() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('table');
  const [editingChurch, setEditingChurch] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

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
            <button className="btn primary" onClick={() => setIsAdding(true)}><IconPlus stroke={2} /> Add church</button>
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
                const st = ENGAGEMENT_STATUS[c.engagementStatus] || { label: c.engagementStatus, variant: 'gray' };
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
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm" onClick={e => { e.stopPropagation(); setEditingChurch(c); }}>Edit</button>
                      <button className="btn sm" onClick={e => { e.stopPropagation(); navigate(`/churches/${c.id}`); }}>View</button>
                    </td>
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
            const st = ENGAGEMENT_STATUS[c.engagementStatus] || { label: c.engagementStatus, variant: 'gray' };
            return (
              <div className="card church-card" key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div className="cc-head">
                    <AvatarInitials name={c.name} size="md" />
                    <div>
                      <div className="cc-name">{c.name}</div>
                      <div className="cc-city">{c.city}, {c.state}</div>
                    </div>
                  </div>
                  <button
                    className="btn sm"
                    onClick={() => setEditingChurch(c)}
                    style={{ padding: '6px 12px' }}
                  >
                    <IconEdit stroke={1.5} size={16} />
                  </button>
                </div>
                <Badge label={st.label} variant={st.variant} />
                <div className="cc-foot">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => navigate(`/churches/${c.id}`)}>
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

      {(editingChurch || isAdding) && (
        <ChurchForm
          church={editingChurch}
          onSave={() => {
            setEditingChurch(null);
            setIsAdding(false);
          }}
          onCancel={() => {
            setEditingChurch(null);
            setIsAdding(false);
          }}
        />
      )}
    </>
  );
}
