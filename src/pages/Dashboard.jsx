import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconSearch, IconMapPin, IconChevronRight, IconRefresh, IconX,
  IconBuildingChurch, IconHeartHandshake,
  IconCheckbox, IconAlertCircle, IconPray, IconPhone, IconMail, IconEdit, IconPlus,
} from '@tabler/icons-react';
import db from '../data/db.js';
import { contactStatus, isTaskOverdue, getContactsByChurch } from '../data/helpers.js';
import { fmtDate } from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { ContactDot, AvatarInitials } from '../components/shared.jsx';
import { saveRecord } from '../data/backend.js';

function getDirectoryCounts() {
  return {
    partnerChurches: db.churches.filter(c =>
      ['active_partner', 'strategic_partner'].includes(c.engagementStatus)).length,
    activeMinistries: db.ministryEngagements.filter(m => m.status === 'active').length,
    openTasks: db.tasks.filter(t => t.status !== 'completed').length,
    overdueTasks: db.tasks.filter(isTaskOverdue).length,
  };
}

function getAllRecords() {
  const contacts = db.contacts.map(c => {
    const church = db.churches.find(ch => ch.id === c.churchId);
    const isAdvocate = c.kfaRole === 'advocate' || c.kfaRole === 'champion';
    return {
      id: c.id,
      name: c.name,
      sub: c.title || c.email || church?.name || '',
      typeKey: c.title?.toLowerCase().includes('pastor') ? 'pastor' : 'staff',
      typeLabel: c.title?.toLowerCase().includes('pastor') ? 'Pastors' : 'Staff',
      lastContact: c.email ? new Date().toISOString().slice(0, 10) : null,
      churchId: c.churchId,
      churchName: church?.name,
      email: c.email,
      phone: c.phone,
      fullRecord: c,
    };
  });
  const congregants = (db.notableCongregants || []).map(cg => ({
    id: cg.id,
    name: cg.name,
    sub: cg.category || cg.title || '',
    typeKey: 'congregant',
    typeLabel: 'Congregants',
    lastContact: cg.lastContactDate || null,
    churchId: cg.churchId,
    churchName: db.churches.find(ch => ch.id === cg.churchId)?.name,
    email: cg.email,
    phone: cg.phone,
    fullRecord: cg,
  }));
  const churches = db.churches.map(ch => ({
    id: ch.id,
    name: ch.name,
    sub: `${ch.city}, ${ch.state}`,
    typeKey: 'church',
    typeLabel: 'Churches',
    lastContact: ch.lastInteractionDate || null,
    phone: ch.phone,
    email: ch.email,
    website: ch.website,
    denomination: ch.denomination,
    fullRecord: ch,
  }));
  return [...churches, ...contacts, ...congregants];
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pastor', label: 'Pastors' },
  { key: 'staff', label: 'Staff' },
  { key: 'congregant', label: 'Congregants' },
  { key: 'church', label: 'Churches' },
];

function DirectoryWidget() {
  const counts = getDirectoryCounts();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const rows = [
    { icon: IconBuildingChurch, label: 'Partner Churches',    count: counts.partnerChurches, color: 'green' },
    { icon: IconHeartHandshake, label: 'Active Ministries',   count: counts.activeMinistries, color: 'blue' },
    { icon: IconCheckbox,       label: 'Open Tasks',          count: counts.openTasks,       color: 'amber' },
    { icon: IconAlertCircle,    label: 'Overdue Follow-ups',  count: counts.overdueTasks,    color: 'red' },
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
                color: color === 'amber' ? 'var(--amber-600)' : color === 'purple' ? 'var(--purple-600)' : color === 'red' ? 'var(--red-400)' : `var(--${color}-400)`,
              }}
            >
              <Icon stroke={1.75} />
            </div>
            <span className="dir-label">{label}</span>
            <span
              className="dir-count"
              style={{
                color: color === 'amber' ? 'var(--amber-600)' : color === 'purple' ? 'var(--purple-600)' : color === 'red' ? 'var(--red-400)' : `var(--${color}-400)`,
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

function RecordForm({ record, type, onSave, onCancel }) {
  const [formData, setFormData] = useState(record || {});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.id) {
      const timestamp = Date.now();
      const prefix = type === 'church' ? 'ch' : type === 'congregant' ? 'cg' : 'ct';
      formData.id = `${prefix}_${timestamp}`;
    }

    const collection = type === 'church' ? 'churches' : type === 'congregant' ? 'notableCongregants' : 'contacts';
    const existing = db[collection].findIndex(r => r.id === formData.id);
    if (existing >= 0) {
      db[collection][existing] = formData;
    } else {
      db[collection].push(formData);
    }
    saveRecord(collection, formData);
    onSave();
  };

  const commonFields = [
    { label: 'Name', key: 'name', required: true },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Phone', key: 'phone' },
  ];

  const churchFields = [
    ...commonFields,
    { label: 'Address', key: 'address' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Zip', key: 'zip' },
    { label: 'Website', key: 'website' },
    { label: 'Denomination', key: 'denomination' },
    { label: 'Min Attendance', key: 'attendanceMin', type: 'number' },
    { label: 'Max Attendance', key: 'attendanceMax', type: 'number' },
    { label: 'Engagement Status', key: 'engagementStatus' },
    { label: 'Notes', key: 'notes', type: 'textarea' },
  ];

  const contactFields = [
    ...commonFields,
    { label: 'Title', key: 'title' },
    { label: 'Church ID', key: 'churchId' },
    { label: 'KFA Role', key: 'kfaRole' },
  ];

  const congregantFields = [
    ...commonFields,
    { label: 'Category', key: 'category' },
    { label: 'Title', key: 'title' },
    { label: 'Church ID', key: 'churchId' },
  ];

  const fields = type === 'church' ? churchFields : type === 'congregant' ? congregantFields : contactFields;

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
            {record?.id ? 'Edit' : 'Add'} {type === 'church' ? 'Church' : type === 'congregant' ? 'Congregant' : 'Contact'}
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

function RecordDetailModal({ record, onClose, onEdit }) {
  if (!record) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AvatarInitials name={record.name} size="md" />
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{record.name}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{record.sub}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => onEdit(record)} style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '14px',
              fontWeight: 500,
            }}>
              <IconEdit stroke={1.5} size={16} />
              Edit
            </button>
            <button onClick={onClose} style={{
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
        </div>

        <div style={{ padding: '24px' }}>
          {/* Type and Status */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Type</p>
            <span style={{ color: 'var(--text-primary)' }}>{record.typeLabel}</span>
          </div>

          {/* Contact Info */}
          {(record.email || record.phone) && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Contact</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {record.email && (
                  <a href={`mailto:${record.email}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--primary-500)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}>
                    <IconMail stroke={1.5} size={16} />
                    {record.email}
                  </a>
                )}
                {record.phone && (
                  <a href={`tel:${record.phone}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--primary-500)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}>
                    <IconPhone stroke={1.5} size={16} />
                    {record.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Church */}
          {record.churchName && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Church</p>
              <span style={{ color: 'var(--text-primary)' }}>{record.churchName}</span>
            </div>
          )}

          {/* Location */}
          {(record.city || record.state) && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Location</p>
              <span style={{ color: 'var(--text-primary)' }}>
                {record.city}{record.city && record.state ? ', ' : ''}{record.state}
              </span>
            </div>
          )}

          {/* Denomination */}
          {record.denomination && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Denomination</p>
              <span style={{ color: 'var(--text-primary)' }}>{record.denomination}</span>
            </div>
          )}

          {/* Website */}
          {record.website && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Website</p>
              <a href={record.website} target="_blank" rel="noopener noreferrer" style={{
                color: 'var(--primary-500)',
                textDecoration: 'none',
                fontSize: '14px',
              }}>
                {record.website}
              </a>
            </div>
          )}

          {/* Last Contact */}
          {record.lastContact && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Last Contact</p>
              <span style={{ color: 'var(--text-primary)' }}>{fmtDate(record.lastContact)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DatabaseWidget() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [addingType, setAddingType] = useState(null);
  const allRecords = getAllRecords();

  const counts = {
    all: allRecords.length,
    pastor: allRecords.filter(r => r.typeKey === 'pastor').length,
    staff: allRecords.filter(r => r.typeKey === 'staff').length,
    congregant: allRecords.filter(r => r.typeKey === 'congregant').length,
    church: allRecords.filter(r => r.typeKey === 'church').length,
  };

  let filtered = filter === 'all' ? allRecords : allRecords.filter(r => r.typeKey === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortField === 'type') {
      aVal = a.typeLabel;
      bVal = b.typeLabel;
    } else if (sortField === 'lastContact') {
      aVal = a.lastContact || '';
      bVal = b.lastContact || '';
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ field, label }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
    >
      {label}
      {sortField === field && (
        <span style={{ marginLeft: 6, fontSize: '12px' }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );

  return (
    <div className="card">
      <div className="db-card-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div className="db-card-title">Database</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn sm"
              onClick={() => setAddingType('church')}
              title="Add church"
              style={{ padding: '6px 12px' }}
            >
              <IconBuildingChurch stroke={1.75} size={16} />
            </button>
          </div>
        </div>
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
            <SortHeader field="name" label="NAME" />
            <SortHeader field="type" label="TYPE" />
            <SortHeader field="lastContact" label="LAST CONTACT" />
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="clickable" onClick={() => setSelectedRecord(r)}>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <ContactDot status={contactStatus(r.lastContact)} date={r.lastContact ? fmtDate(r.lastContact) : null} />
                  {r.lastContact
                    ? <span className="db-last-badge">{fmtDate(r.lastContact)}</span>
                    : <span className="cell-muted">Never</span>}
                </span>
              </td>
              <td>
                <IconChevronRight stroke={1.5} style={{ width: 14, height: 14, color: 'var(--text-tertiary)', display: 'block' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editingRecord && (
        <RecordForm
          record={editingRecord}
          type={editingRecord.typeKey}
          onSave={() => {
            setEditingRecord(null);
            setSelectedRecord(null);
          }}
          onCancel={() => setEditingRecord(null)}
        />
      )}
      {addingType && (
        <RecordForm
          type={addingType}
          onSave={() => {
            setAddingType(null);
          }}
          onCancel={() => setAddingType(null)}
        />
      )}
      {selectedRecord && !editingRecord && !addingType && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onEdit={(record) => {
            setEditingRecord(record);
          }}
        />
      )}
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
        <button className="btn sm" onClick={() => window.location.reload()}>
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
