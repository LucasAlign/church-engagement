import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconSearch, IconMapPin, IconChevronRight, IconRefresh, IconX,
  IconUsers, IconBuildingChurch,
  IconCheckbox, IconAlertCircle, IconPhone, IconMail, IconEdit, IconPlus,
  IconHeartHandshake,
} from '@tabler/icons-react';
import db from '../data/db.js';
import {
  contactStatus, isTaskOverdue, addTask, toggleTaskCompleted,
} from '../data/helpers.js';
import { fmtDate, ENGAGEMENT_STATUS, ENGAGEMENT_STATUS_FILTERS, TASK_PRIORITY } from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { ContactDot, AvatarInitials, Badge } from '../components/shared.jsx';
import { saveRecord } from '../data/backend.js';
import FormModal from '../components/FormModal.jsx';

function getDirectoryCounts() {
  return {
    partnerChurches: db.churches.filter(c => c.engagementStatus === 'partnering').length,
    openTasks: db.tasks.filter(t => t.status !== 'completed').length,
    overdueTasks: db.tasks.filter(isTaskOverdue).length,
  };
}

function getAllRecords() {
  const contacts = db.contacts.map(c => {
    const church = db.churches.find(ch => ch.id === c.churchId);
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
    engagementStatus: ch.engagementStatus,
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

function DirectoryWidget({ activeDir, onSelectDir }) {
  const counts = getDirectoryCounts();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const rows = [
    { key: 'partner',  icon: IconBuildingChurch, label: 'Partner Churches',   count: counts.partnerChurches, color: 'green' },
    { key: 'open',     icon: IconCheckbox,       label: 'Open Tasks',         count: counts.openTasks,       color: 'amber' },
    { key: 'overdue',  icon: IconAlertCircle,    label: 'Overdue Follow-ups', count: counts.overdueTasks,    color: 'red' },
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
        {rows.map(({ key, icon: Icon, label, count, color }) => (
          <div
            className={`dir-row${activeDir === key ? ' active' : ''}`}
            key={label}
            onClick={() => onSelectDir(key)}
          >
            <div
              className="dir-icon"
              style={{
                background: `var(--${color}-bg)`,
                color: color === 'amber' ? 'var(--amber-600)' : color === 'red' ? 'var(--red-400)' : `var(--${color}-400)`,
              }}
            >
              <Icon stroke={1.75} />
            </div>
            <span className="dir-label">{label}</span>
            <span
              className="dir-count"
              style={{
                color: color === 'amber' ? 'var(--amber-600)' : color === 'red' ? 'var(--red-400)' : `var(--${color}-400)`,
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

  const title = record?.id ? 'Edit' : 'Add';
  const typeLabel = type === 'church' ? 'Church' : type === 'congregant' ? 'Congregant' : 'Contact';

  return (
    <FormModal
      title={`${title} ${typeLabel}`}
      fields={fields}
      formData={formData}
      onChange={handleChange}
      onSave={handleSave}
      onCancel={onCancel}
    />
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

function DatabaseWidget({ typeFilter, setTypeFilter, statusFilter, setStatusFilter }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
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

  // When a non-"all" engagement status is selected, restrict to churches only.
  const statusActive = statusFilter && statusFilter !== 'all';
  let filtered;
  if (statusActive) {
    filtered = allRecords.filter(r => r.typeKey === 'church' && r.engagementStatus === statusFilter);
  } else {
    filtered = typeFilter === 'all' ? allRecords : allRecords.filter(r => r.typeKey === typeFilter);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));
  }

  filtered = [...filtered].sort((a, b) => {
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

  const openRecord = (r) => {
    if (r.typeKey === 'church') {
      navigate(`/churches/${r.id}`);
    } else {
      setSelectedRecord(r);
    }
  };

  return (
    <div className="card">
      <div className="db-card-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
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
            <button
              className="btn sm"
              onClick={() => setAddingType('contact')}
              title="Add pastor/staff"
              style={{ padding: '6px 12px' }}
            >
              <IconUsers stroke={1.75} size={16} />
            </button>
            <button
              className="btn sm"
              onClick={() => setAddingType('congregant')}
              title="Add congregant"
              style={{ padding: '6px 12px' }}
            >
              <IconHeartHandshake stroke={1.75} size={16} />
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
                className={`db-filter-pill${!statusActive && typeFilter === f.key ? ' active' : ''}`}
                onClick={() => { setStatusFilter('all'); setTypeFilter(f.key); }}
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
        <div className="db-status-pills">
          {ENGAGEMENT_STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              className={`db-filter-pill${(statusActive ? statusFilter === f.value : f.value === 'all' && !statusActive) ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
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
          {filtered.map(r => {
            const eng = r.typeKey === 'church' ? ENGAGEMENT_STATUS[r.engagementStatus] : null;
            return (
              <tr key={r.id} className="clickable" onClick={() => openRecord(r)}>
                <td>
                  <div className="cell-stack">
                    <div className="cell-primary">{r.name}</div>
                    <div className="cell-secondary">{r.sub}</div>
                  </div>
                </td>
                <td>
                  {eng
                    ? <Badge label={eng.label} variant={eng.variant} />
                    : <span className="db-type-link">{r.typeLabel}</span>}
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
            );
          })}
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

const TODO_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'overdue', label: 'Overdue' },
];

function ToDoWidget({ todoFilter, setTodoFilter, todoRef }) {
  const { refresh } = useDb();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');

  let tasks = db.tasks.filter(t => t.status !== 'completed');
  if (todoFilter === 'overdue') {
    tasks = tasks.filter(isTaskOverdue);
  }
  tasks = [...tasks].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  const handleToggle = (id) => {
    toggleTaskCompleted(id);
    refresh();
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    addTask({ title: title.trim(), dueDate: dueDate || null, priority, status: 'open' });
    setTitle('');
    setDueDate('');
    setPriority('medium');
    setAdding(false);
    refresh();
  };

  return (
    <div className="card" ref={todoRef}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconCheckbox stroke={1.75} style={{ width: 16, height: 16 }} />
          <span className="card-title">To-Do</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="db-filter-pills">
            {TODO_FILTERS.map(f => (
              <button
                key={f.value}
                className={`db-filter-pill${todoFilter === f.value ? ' active' : ''}`}
                onClick={() => setTodoFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn sm" onClick={() => setAdding(a => !a)}>
            <IconPlus stroke={1.75} size={14} />
            Add task
          </button>
        </div>
      </div>

      {adding && (
        <div className="todo-add-form">
          <input
            className="todo-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            autoFocus
          />
          <div className="todo-add-row">
            <input
              className="todo-input"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <select
              className="todo-input"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {Object.entries(TASK_PRIORITY).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
            <button className="btn sm primary" onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 20px' }}>
          <IconCheckbox stroke={1.25} />
          <div className="es-title">No tasks here</div>
          <div>{todoFilter === 'overdue' ? 'Nothing overdue' : 'Add a task to get started'}</div>
        </div>
      ) : (
        <div className="todo-list">
          {tasks.map(task => {
            const overdue = isTaskOverdue(task);
            const church = task.churchId ? db.churches.find(c => c.id === task.churchId) : null;
            const prio = TASK_PRIORITY[task.priority] || TASK_PRIORITY.medium;
            return (
              <div className={`todo-row${overdue ? ' overdue' : ''}`} key={task.id}>
                <input
                  type="checkbox"
                  className="todo-check"
                  checked={false}
                  onChange={() => handleToggle(task.id)}
                />
                <div className="todo-main">
                  <div className="todo-title">{task.title}</div>
                  <div className="todo-meta">
                    {church && <span className="todo-church">{church.name}</span>}
                    {task.dueDate && (
                      <span className={`todo-due${overdue ? ' overdue' : ''}`}>
                        {overdue && <IconAlertCircle stroke={1.75} size={12} />}
                        {fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge label={prio.label} variant={prio.variant} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  useDb();
  const todoRef = useRef(null);

  // Lifted shared filter state.
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [todoFilter, setTodoFilter] = useState('all');
  const [activeDir, setActiveDir] = useState(null);

  const handleSelectDir = (key) => {
    setActiveDir(prev => (prev === key ? null : key));
    if (key === 'partner') {
      setTypeFilter('church');
      setStatusFilter('partnering');
    } else if (key === 'open') {
      setTodoFilter('open');
      todoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (key === 'overdue') {
      setTodoFilter('overdue');
      todoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          <DirectoryWidget activeDir={activeDir} onSelectDir={handleSelectDir} />
        </div>
        <div className="overview-right">
          <DatabaseWidget
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          <ToDoWidget
            todoFilter={todoFilter}
            setTodoFilter={setTodoFilter}
            todoRef={todoRef}
          />
        </div>
      </div>
    </div>
  );
}
