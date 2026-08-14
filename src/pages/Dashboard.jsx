import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import {
  IconSearch, IconMapPin, IconChevronRight, IconRefresh, IconX,
  IconBuildingChurch, IconCheckbox, IconAlertCircle, IconPlus,
  IconUpload, IconDownload,
} from '@tabler/icons-react';
import db from '../data/db.js';
import {
  contactStatus, isTaskOverdue, addTask, toggleTaskCompleted,
} from '../data/helpers.js';
import { fmtDate, ENGAGEMENT_STATUS, ENGAGEMENT_STATUS_FILTERS, TASK_PRIORITY } from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { ContactDot, Badge } from '../components/shared.jsx';
import ChurchForm from '../components/ChurchForm.jsx';

const ChurchProfile = lazy(() => import('./ChurchProfile.jsx'));
const ImportExportModals = lazy(() => import('../components/ImportExportModals.jsx'));

function getDirectoryCounts() {
  return {
    partnerChurches: db.churches.filter(c => c.engagementStatus === 'partnering').length,
    openTasks: db.tasks.filter(t => t.status !== 'completed').length,
    overdueTasks: db.tasks.filter(isTaskOverdue).length,
  };
}

// The database lists churches only — staff, congregants and all other
// datapoints live inside each church profile.
function getChurchRecords() {
  return db.churches.map(ch => ({
    id: ch.id,
    name: ch.name,
    sub: `${ch.city}, ${ch.state}`,
    lastContact: ch.lastInteractionDate || null,
    engagementStatus: ch.engagementStatus,
    fullRecord: ch,
  }));
}

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

// Church profile shown as a popup. Dismiss by clicking the backdrop, pressing
// Escape, or the browser Back button — all routed through history so a pushed
// entry is consumed exactly once.
function ChurchProfileModal({ churchId, onClose }) {
  useEffect(() => {
    window.history.pushState({ churchModal: churchId }, '');
    const onPop = () => onClose();
    const onKey = (e) => { if (e.key === 'Escape') window.history.back(); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [churchId, onClose]);

  const requestClose = () => window.history.back();

  return (
    <div className="church-modal-overlay" onClick={requestClose}>
      <div className="church-modal" onClick={e => e.stopPropagation()}>
        <button className="church-modal-close" onClick={requestClose} aria-label="Close">
          <IconX stroke={1.75} />
        </button>
        <Suspense fallback={<div className="backend-splash">Loading profile…</div>}>
          <ChurchProfile churchId={churchId} />
        </Suspense>
      </div>
    </div>
  );
}

function DatabaseWidget({ statusFilter, setStatusFilter }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [profileId, setProfileId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const records = getChurchRecords();

  const statusActive = statusFilter && statusFilter !== 'all';
  let filtered = statusActive
    ? records.filter(r => r.engagementStatus === statusFilter)
    : records;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));
  }

  filtered = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'lastContact') {
      aVal = a.lastContact || '';
      bVal = b.lastContact || '';
    } else {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortHeader = ({ field, label }) => (
    <th onClick={() => toggleSort(field)} style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}>
      {label}
      {sortField === field && (
        <span style={{ marginLeft: 6, fontSize: '12px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );

  return (
    <div className="card">
      <div className="db-card-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <div className="db-card-title">Database</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={() => setImporting(true)} title="Import from CSV/Excel">
              <IconUpload stroke={1.75} size={16} /> Import
            </button>
            <button className="btn sm" onClick={() => setExporting(true)} title="Export to CSV/Excel">
              <IconDownload stroke={1.75} size={16} /> Export
            </button>
            <button className="btn sm primary" onClick={() => setAdding(true)} title="Add church">
              <IconPlus stroke={1.75} size={16} /> Add church
            </button>
          </div>
        </div>
        <div className="search-bar">
          <IconSearch stroke={1.75} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search churches..."
          />
        </div>
        <div className="db-filter-row">
          <div className="db-filter-pills">
            {ENGAGEMENT_STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`db-filter-pill${statusFilter === f.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
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
            <SortHeader field="name" label="CHURCH" />
            <th>STATUS</th>
            <SortHeader field="lastContact" label="LAST CONTACT" />
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => {
            const eng = ENGAGEMENT_STATUS[r.engagementStatus];
            return (
              <tr key={r.id} className="clickable" onClick={() => setProfileId(r.id)}>
                <td>
                  <div className="cell-stack">
                    <div className="cell-primary">{r.name}</div>
                    <div className="cell-secondary">{r.sub}</div>
                  </div>
                </td>
                <td>{eng ? <Badge label={eng.label} variant={eng.variant} /> : <span className="cell-muted">—</span>}</td>
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
          {filtered.length === 0 && (
            <tr><td colSpan={4} className="cell-muted" style={{ textAlign: 'center', padding: 24 }}>No churches match.</td></tr>
          )}
        </tbody>
      </table>
      {adding && <ChurchForm onSave={() => setAdding(false)} onCancel={() => setAdding(false)} />}
      {(importing || exporting) && (
        <Suspense fallback={null}>
          <ImportExportModals
            mode={importing ? 'import' : 'export'}
            onClose={() => { setImporting(false); setExporting(false); }}
          />
        </Suspense>
      )}
      {profileId && <ChurchProfileModal churchId={profileId} onClose={() => setProfileId(null)} />}
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [todoFilter, setTodoFilter] = useState('all');
  const [activeDir, setActiveDir] = useState(null);

  const handleSelectDir = (key) => {
    setActiveDir(prev => (prev === key ? null : key));
    if (key === 'partner') {
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
