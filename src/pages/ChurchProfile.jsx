import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  IconMapPin, IconUsers, IconCalendar, IconUserCircle, IconMail, IconPhone,
  IconPlus, IconPencil, IconPinned, IconBuildingChurch,
} from '@tabler/icons-react';
import {
  getChurchById, getContactsByChurch, getInteractionsByChurch, getTasksByChurch,
  getNotesByChurch, getMinistryByChurch, getChurchGivingSummary, getUserById,
  getContactById, isTaskOverdue, addNote, toggleTaskCompleted,
  getCongregantsByChurch, addCongregant, updateCongregantContact,
  getLastContactForContact, contactStatus,
} from '../data/helpers.js';
import {
  ENGAGEMENT_STATUS, GIVING_STATUS, GIVING_TYPE, INTERACTION_TYPE, MINISTRY_TYPE,
  MINISTRY_STATUS, TASK_PRIORITY, TASK_STATUS, KFA_ROLE, PREFERRED_CONTACT,
  CONGREGANT_CATEGORY, fmtDate, fmtMoney,
} from '../data/labels.js';
import { Badge, MetricCard, AvatarInitials, EmptyState, ContactDot } from '../components/shared.jsx';
import FormModal from '../components/FormModal.jsx';
import LogInteractionModal from '../components/LogInteractionModal.jsx';
import { useDb } from '../data/store.jsx';
import db from '../data/db.js';
import { saveRecord } from '../data/backend.js';

const TABS = ['Overview', 'Staff', 'Notable Congregants', 'Timeline', 'Ministry', 'Giving', 'Notes', 'Tasks'];

function OverviewTab({ church }) {
  const giving = getChurchGivingSummary(church.id);
  const interactions = getInteractionsByChurch(church.id);
  const ministries = getMinistryByChurch(church.id).filter(m => m.status === 'active');
  const rows = [
    ['Address', `${church.address}, ${church.city}, ${church.state} ${church.zip}`],
    ['Phone', church.phone || '—'],
    ['Email', church.email || '—'],
    ['Website', church.website || '—'],
    ['Denomination', church.denomination],
    ['Attendance', `${church.attendanceMin}–${church.attendanceMax}`],
    ['County', church.county],
    ['Last interaction', fmtDate(church.lastInteractionDate)],
  ];
  return (
    <div className="grid-2">
      <div className="card card-pad">
        <h3 className="section-title">Church details</h3>
        <table className="details-table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}><td>{label}</td><td>{value}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <MetricCard label="Lifetime giving" value={fmtMoney(giving.total)} />
          <MetricCard label="This year giving" value={fmtMoney(giving.thisYearTotal)} />
          <MetricCard label="Total interactions" value={interactions.length} />
          <MetricCard label="Ministry areas active" value={ministries.length} />
        </div>
      </div>
    </div>
  );
}

function StaffTab({ church }) {
  const { refresh } = useDb();
  const [editingContact, setEditingContact] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const contacts = getContactsByChurch(church.id);
  if (!contacts.length && !isAdding) {
    return (
      <div className="card">
        <EmptyState icon={IconUserCircle} title="No staff contacts yet" sub="Add the first staff member for this church." />
      </div>
    );
  }
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={() => setIsAdding(true)}><IconPlus stroke={2} /> Add staff</button>
      </div>
      <div className="people-grid">
        {contacts.map(p => {
          const role = KFA_ROLE[p.kfaRole] || KFA_ROLE.none;
          const lastDate = getLastContactForContact(p.id);
          const status = contactStatus(lastDate);
          return (
            <div className="card person-card" key={p.id}>
              <div className="pc-head">
                <AvatarInitials name={p.name} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="pc-name" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ContactDot status={status} date={lastDate} />
                    {p.name}
                  </div>
                  <div className="pc-role">{p.position}</div>
                </div>
                <Badge label={role.label} variant={role.variant} />
              </div>
              <div className="pc-contact">
                {p.email && <span><IconMail stroke={1.75} /> {p.email}</span>}
                {p.phone && <span><IconPhone stroke={1.75} /> {p.phone}</span>}
                <span className="text-secondary">{PREFERRED_CONTACT[p.preferredContact]}{p.notes ? ` · ${p.notes}` : ''}</span>
              </div>
              <div className="pc-actions">
                <button className="btn sm" onClick={() => setEditingContact(p)}><IconPencil stroke={1.75} /> Edit</button>
              </div>
            </div>
          );
        })}
      </div>
      {(editingContact || isAdding) && (
        <StaffForm
          churchId={church.id}
          contact={editingContact}
          onSave={() => {
            setEditingContact(null);
            setIsAdding(false);
            refresh();
          }}
          onCancel={() => {
            setEditingContact(null);
            setIsAdding(false);
          }}
        />
      )}
    </>
  );
}

function NotableCongregrantsTab({ church }) {
  const { refresh } = useDb();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', category: 'business', email: '', phone: '', notes: '' });
  const congregants = getCongregantsByChurch(church.id);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    addCongregant({ churchId: church.id, ...form });
    setForm({ name: '', title: '', category: 'business', email: '', phone: '', notes: '' });
    setAdding(false);
    refresh();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setAdding(a => !a)}>
          <IconPlus stroke={2} /> Add congregant
        </button>
      </div>

      {adding && (
        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Full name *</label>
              <input className="select" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Smith" />
            </div>
            <div className="field">
              <label className="field-label">Title / Role</label>
              <input className="select" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. CEO, Smith Industries" />
            </div>
            <div className="field">
              <label className="field-label">Category</label>
              <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CONGREGANT_CATEGORY).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="select" value={form.email} onChange={e => set('email', e.target.value)} placeholder="optional" />
            </div>
            <div className="field">
              <label className="field-label">Phone</label>
              <input className="select" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="optional" />
            </div>
            <div className="field">
              <label className="field-label">Notes</label>
              <input className="select" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={save}>Save</button>
          </div>
        </div>
      )}

      {congregants.length === 0 && !adding && (
        <div className="card">
          <EmptyState icon={IconUsers} title="No notable congregants yet" sub="Track key business leaders, community figures, and other notable members." />
        </div>
      )}

      <div className="people-grid">
        {congregants.map(c => {
          const cat = CONGREGANT_CATEGORY[c.category] || CONGREGANT_CATEGORY.other;
          const status = contactStatus(c.lastContactDate);
          return (
            <div className="card person-card" key={c.id}>
              <div className="pc-head">
                <AvatarInitials name={c.name} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="pc-name" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ContactDot status={status} date={c.lastContactDate} />
                    {c.name}
                  </div>
                  <div className="pc-role">{c.title || '—'}</div>
                </div>
                <Badge label={cat.label} variant={cat.variant} />
              </div>
              <div className="pc-contact">
                {c.email && <span><IconMail stroke={1.75} /> {c.email}</span>}
                {c.phone && <span><IconPhone stroke={1.75} /> {c.phone}</span>}
                {c.notes && <span className="text-secondary">{c.notes}</span>}
                <span className="text-secondary" style={{ fontSize: 12 }}>
                  {c.lastContactDate ? `Last contact: ${fmtDate(c.lastContactDate)}` : 'No contact logged'}
                </span>
              </div>
              <div className="pc-actions">
                <button className="btn sm" onClick={() => { updateCongregantContact(c.id); refresh(); }}>
                  ✓ Log contact
                </button>
                <button className="btn sm"><IconPencil stroke={1.75} /> Edit</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TimelineTab({ church, onLog }) {
  const interactions = getInteractionsByChurch(church.id);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>Activity timeline</h3>
        <button className="btn primary" onClick={onLog}><IconPlus stroke={2} /> Log interaction</button>
      </div>
      {interactions.length === 0 && <EmptyState icon={IconBuildingChurch} title="No interactions logged yet" />}
      <div className="timeline">
        {interactions.map(item => {
          const meta = INTERACTION_TYPE[item.type];
          const user = getUserById(item.userId);
          return (
            <div className="timeline-entry" key={item.id}>
              <span className={`timeline-dot dot-${meta.variant}`} />
              <div className="timeline-head">
                <span className="t-type">{meta.label}</span>{' '}
                <span className="t-meta">· {fmtDate(item.date)} · {user?.name}</span>
              </div>
              <div className="timeline-notes">{item.notes}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MinistryTab({ church }) {
  const engagements = getMinistryByChurch(church.id);
  if (!engagements.length) {
    return <div className="card"><EmptyState icon={IconBuildingChurch} title="No ministry engagements yet" /></div>;
  }
  return (
    <div className="ministry-grid">
      {engagements.map(m => {
        const status = MINISTRY_STATUS[m.status];
        const coordinator = m.coordinatorId ? getContactById(m.coordinatorId) : null;
        return (
          <div className={`card ministry-card ${m.status === 'active' ? 'active-ministry' : ''}`} key={m.id}>
            <div className="mc-head">
              <span className="mc-name">{MINISTRY_TYPE[m.ministry]}</span>
              <Badge label={status.label} variant={status.variant} />
            </div>
            <div className="mc-meta">
              {m.startDate && <div>Since {fmtDate(m.startDate)}</div>}
              {coordinator && <div>Coordinator: {coordinator.name}</div>}
              {m.notes && <div>{m.notes}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GivingTab({ church }) {
  const giving = getChurchGivingSummary(church.id);
  const status = GIVING_STATUS[giving.givingStatus];
  const byYear = {};
  for (const r of giving.records) {
    const year = r.date.slice(0, 4);
    byYear[year] = (byYear[year] || 0) + r.amount;
  }
  const years = Object.entries(byYear).sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...years.map(([, v]) => v), 1);
  const records = [...giving.records].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Badge label={status.label} variant={status.variant} />
      </div>
      <div className="metric-grid">
        <MetricCard label="Lifetime giving" value={fmtMoney(giving.total)} />
        <MetricCard label="Current year" value={fmtMoney(giving.thisYearTotal)} />
        <MetricCard label="Previous year" value={fmtMoney(giving.lastYearTotal)} />
        <MetricCard label="Average gift" value={fmtMoney(giving.avg)} />
      </div>
      <div className="grid-2">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header"><div className="card-title">Giving history</div></div>
          {records.length === 0 ? (
            <EmptyState title="No gifts recorded" />
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Amount</th><th>Fund</th><th>Type</th></tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const type = GIVING_TYPE[r.type];
                  return (
                    <tr key={r.id}>
                      <td className="cell-muted">{fmtDate(r.date)}</td>
                      <td style={{ fontWeight: 500 }}>{fmtMoney(r.amount)}</td>
                      <td className="cell-muted">{r.fund}</td>
                      <td><Badge label={type.label} variant={type.variant} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card card-pad">
          <h3 className="section-title">Year over year</h3>
          <div className="bar-chart">
            {years.map(([year, total]) => (
              <div className="bar-row" key={year} style={{ gridTemplateColumns: '50px 1fr 80px' }}>
                <span className="bar-label">{year}</span>
                <div className="bar-track"><div className="bar-fill fill-green" style={{ width: `${Math.round((total / max) * 100)}%` }} /></div>
                <span className="bar-value">{fmtMoney(total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function NotesTab({ church }) {
  const { refresh } = useDb();
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [internalOnly, setInternalOnly] = useState(false);
  const notes = getNotesByChurch(church.id);

  const save = () => {
    if (!body.trim()) return;
    addNote({ churchId: church.id, body: body.trim(), pinned, internalOnly });
    setBody(''); setPinned(false); setInternalOnly(false); setAdding(false);
    refresh();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setAdding(a => !a)}><IconPlus stroke={2} /> Add note</button>
      </div>
      {adding && (
        <div className="card card-pad" style={{ marginBottom: 10 }}>
          <div className="field">
            <label className="field-label">Note</label>
            <textarea className="select" value={body} onChange={e => setBody(e.target.value)} placeholder="Write a note…" />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" className="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /> Pin note
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" className="checkbox" checked={internalOnly} onChange={e => setInternalOnly(e.target.checked)} /> Internal only
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={save}>Save note</button>
          </div>
        </div>
      )}
      {notes.length === 0 && !adding && <div className="card"><EmptyState title="No notes yet" sub="Add the first note for this church." /></div>}
      <div className="notes-stack">
        {notes.map(note => {
          const author = getUserById(note.authorId);
          return (
            <div className={`card note-card ${note.pinned ? 'pinned' : ''}`} key={note.id}>
              <div className="note-body">{note.body}</div>
              <div className="note-meta">
                {note.pinned && <><IconPinned stroke={1.75} /> Pinned</>}
                {note.internalOnly && <Badge label="Internal only" variant="amber" />}
                <span>{author?.name} · {fmtDate(note.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TasksTab({ church }) {
  const { refresh } = useDb();
  const tasks = getTasksByChurch(church.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!tasks.length) {
    return <div className="card"><EmptyState title="No tasks for this church" /></div>;
  }
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr><th /><th>Task</th><th>Assigned to</th><th>Due date</th><th>Priority</th><th>Status</th></tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const overdue = isTaskOverdue(task);
            const priority = TASK_PRIORITY[task.priority];
            const status = TASK_STATUS[overdue ? 'overdue' : task.status];
            const done = task.status === 'completed';
            return (
              <tr key={task.id} className={overdue ? 'overdue-row' : ''}>
                <td style={{ width: 36 }}>
                  <input type="checkbox" className="checkbox" checked={done} onChange={() => { toggleTaskCompleted(task.id); refresh(); }} />
                </td>
                <td className={done ? 'text-strike' : ''} style={{ fontWeight: 500 }}>{task.title}</td>
                <td className="cell-muted">{getUserById(task.assignedTo)?.name}</td>
                <td className="cell-muted">{fmtDate(task.dueDate)}</td>
                <td><Badge label={priority.label} variant={priority.variant} /></td>
                <td><Badge label={status.label} variant={status.variant} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StaffForm({ churchId, contact, onSave, onCancel }) {
  const [formData, setFormData] = useState(contact || { churchId, kfaRole: 'none', preferredContact: 'email' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) return;
    setLoading(true);
    try {
      if (contact && contact.id) {
        const existing = db.contacts.findIndex(c => c.id === formData.id);
        if (existing >= 0) {
          db.contacts[existing] = formData;
          saveRecord('contacts', formData);
        }
      } else {
        const newContact = {
          id: `con_${Date.now()}`,
          churchId,
          ...formData,
        };
        db.contacts.push(newContact);
        saveRecord('contacts', newContact);
      }
      onSave();
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Name', key: 'name', required: true },
    { label: 'Position', key: 'position' },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Notes', key: 'notes', type: 'textarea' },
  ];

  return (
    <FormModal
      title={contact ? 'Edit Staff Member' : 'Add Staff Member'}
      fields={fields}
      formData={formData}
      onChange={handleChange}
      onSave={handleSave}
      onCancel={onCancel}
      isLoading={loading}
    />
  );
}

export default function ChurchProfile() {
  useDb();
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const [logging, setLogging] = useState(false);
  const [editingChurch, setEditingChurch] = useState(false);
  const church = getChurchById(id);

  if (!church) {
    return (
      <div className="card">
        <EmptyState icon={IconBuildingChurch} title="Church not found" sub={<Link to="/churches">Back to churches</Link>} />
      </div>
    );
  }

  const status = ENGAGEMENT_STATUS[church.engagementStatus];
  const giving = getChurchGivingSummary(church.id);
  const givingStatus = GIVING_STATUS[giving.givingStatus];
  const coordinator = church.assignedCoordinatorId ? getUserById(church.assignedCoordinatorId) : null;
  const activeMinistries = getMinistryByChurch(church.id).filter(m => m.status === 'active').length;

  return (
    <>
      <div className="breadcrumb">
        <Link to="/churches">Churches</Link> <span> / </span> {church.name}
      </div>
      <div className="profile-header">
        <AvatarInitials name={church.name} size="lg" />
        <div className="ph-body">
          <div className="ph-name">{church.name}</div>
          <div className="ph-badges">
            <Badge label={status.label} variant={status.variant} />
            {activeMinistries > 0 && <Badge label={`${activeMinistries} active ${activeMinistries === 1 ? 'ministry' : 'ministries'}`} variant="green" />}
            <Badge label={givingStatus.label} variant={givingStatus.variant} />
          </div>
          <div className="ph-meta">
            <span><IconMapPin stroke={1.75} /> {church.city}, {church.state}</span>
            <span><IconUsers stroke={1.75} /> {church.attendanceMin}–{church.attendanceMax} attendance</span>
            <span><IconCalendar stroke={1.75} /> First contact {fmtDate(church.firstContactDate)}</span>
            <span><IconUserCircle stroke={1.75} /> {coordinator ? coordinator.name : 'No coordinator'}</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setEditingChurch(church)} title="Edit church details"><IconPencil stroke={1.75} /> Edit</button>
          <button className="btn primary" onClick={() => setLogging(true)}><IconPlus stroke={2} /> Log interaction</button>
        </div>
      </div>
      <div className="tab-nav">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && <OverviewTab church={church} />}
      {tab === 'Staff' && <StaffTab church={church} />}
      {tab === 'Notable Congregants' && <NotableCongregrantsTab church={church} />}
      {tab === 'Timeline' && <TimelineTab church={church} onLog={() => setLogging(true)} />}
      {tab === 'Ministry' && <MinistryTab church={church} />}
      {tab === 'Giving' && <GivingTab church={church} />}
      {tab === 'Notes' && <NotesTab church={church} />}
      {tab === 'Tasks' && <TasksTab church={church} />}
      {logging && <LogInteractionModal churchId={church.id} onClose={() => setLogging(false)} />}
      {editingChurch && (
        <ChurchEditForm
          church={church}
          onSave={() => {
            setEditingChurch(false);
          }}
          onCancel={() => setEditingChurch(false)}
        />
      )}
    </>
  );
}

function ChurchEditForm({ church, onSave, onCancel }) {
  const [formData, setFormData] = useState(church || {});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const existing = db.churches.findIndex(c => c.id === formData.id);
      if (existing >= 0) {
        db.churches[existing] = formData;
        saveRecord('churches', formData);
      }
      onSave();
    } finally {
      setLoading(false);
    }
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
    { label: 'Notes', key: 'notes', type: 'textarea' },
  ];

  return (
    <FormModal
      title="Edit Church"
      fields={fields}
      formData={formData}
      onChange={handleChange}
      onSave={handleSave}
      onCancel={onCancel}
      isLoading={loading}
    />
  );
}
