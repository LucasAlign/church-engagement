import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLayoutGrid, IconList, IconAdjustmentsHorizontal, IconPlus, IconBuildingChurch, IconFileSpreadsheet, IconEdit, IconX, IconAlertCircle, IconLoader } from '@tabler/icons-react';
import db from '../data/db.js';
import { getContactsByChurch, getUserById, contactStatus } from '../data/helpers.js';
import { ENGAGEMENT_STATUS, fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, SearchBar, FilterPills, AvatarInitials, EmptyState, ContactDot } from '../components/shared.jsx';
import { saveRecord } from '../data/backend.js';
import FormModal from '../components/FormModal.jsx';
import { validateChurch } from '../data/validation.js';

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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    const validation = validateChurch(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
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
    } catch (err) {
      setErrorMessage('Failed to save church. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Name', key: 'name', required: true, error: errors.name },
    { label: 'Address', key: 'address' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Zip', key: 'zip' },
    { label: 'Phone', key: 'phone' },
    { label: 'Email', key: 'email', type: 'email', error: errors.email },
    { label: 'Website', key: 'website', error: errors.website },
    { label: 'Denomination', key: 'denomination' },
    { label: 'Min Attendance', key: 'attendanceMin', type: 'number', error: errors.attendanceMin },
    { label: 'Max Attendance', key: 'attendanceMax', type: 'number', error: errors.attendanceMax },
    { label: 'Engagement Status', key: 'engagementStatus' },
    { label: 'Assigned Coordinator ID', key: 'assignedCoordinatorId' },
    { label: 'Notes', key: 'notes', type: 'textarea' },
  ];

  const title = church?.id ? 'Edit Church' : 'Add Church';

  return (
    <>
      <FormModal
        title={title}
        fields={fields}
        formData={formData}
        onChange={handleChange}
        onSave={handleSave}
        onCancel={onCancel}
        loading={loading}
      />
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

function ErrorToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      zIndex: 2000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    }}>
      <IconAlertCircle size={16} />
      {message}
      <button onClick={onClose} style={{
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
      }}>
        <IconX size={16} />
      </button>
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
