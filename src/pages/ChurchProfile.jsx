import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  IconMapPin, IconUsers, IconCalendar, IconUserCircle, IconMail, IconPhone,
  IconPlus, IconPencil, IconTrash, IconPinned, IconLock, IconArchive, IconBuildingChurch, IconX, IconAlertCircle, IconLoader,
} from '@tabler/icons-react';
import {
  getChurchById, getContactsByChurch, getInteractionsByChurch, getTasksByChurch,
  getNotesByChurch, getMinistryByChurch, getChurchGivingSummary, getUserById,
  getContactById, isTaskOverdue, addNote, toggleTaskCompleted,
  getCongregantsByChurch, addCongregant, updateCongregantContact,
  getLastContactForContact, contactStatus,
  getAdvocatesByChurch, addAdvocate, updateAdvocate, addMinistryEngagement, updateMinistryEngagement, addTask, updateTask, removeProfileRecord,
} from '../data/helpers.js';
import {
  ENGAGEMENT_STATUS, GIVING_STATUS, INTERACTION_TYPE, MINISTRY_TYPE,
  MINISTRY_STATUS, TASK_PRIORITY, TASK_STATUS, KFA_ROLE, PREFERRED_CONTACT,
  CONGREGANT_CATEGORY, ADVOCATE_ROLE, ADVOCATE_STATUS, fmtDate, fmtMoney,
} from '../data/labels.js';
import { Badge, MetricCard, AvatarInitials, EmptyState, ContactDot } from '../components/shared.jsx';
import LogInteractionModal from '../components/LogInteractionModal.jsx';
import FormModal from '../components/FormModal.jsx';
import ChurchForm from '../components/ChurchForm.jsx';
import { useDb } from '../data/store.jsx';
import db from '../data/db.js';
import { saveRecord } from '../data/backend.js';
import { validateContact, validateCongregant } from '../data/validation.js';

const TABS = ['Overview', 'Advocate', 'Staff', 'Notable Congregants', 'Interactions', 'Ministry', 'Notes', 'Tasks'];

function StaffForm({ contact, churchId, onSave, onCancel }) {
  const [formData, setFormData] = useState(contact || { churchId });
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
    const validation = validateContact(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      if (!formData.id) {
        formData.id = `ct_${Date.now()}`;
      }
      const existing = db.contacts.findIndex(c => c.id === formData.id);
      if (existing >= 0) {
        db.contacts[existing] = formData;
      } else {
        db.contacts.push(formData);
      }
      saveRecord('contacts', formData);
      onSave();
    } catch (err) {
      setErrorMessage('Failed to save staff member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Name', key: 'name', required: true, error: errors.name },
    { label: 'Title / Position', key: 'title' },
    { label: 'Email', key: 'email', type: 'email', error: errors.email },
    { label: 'Phone', key: 'phone' },
    { label: 'KFA Role', key: 'kfaRole' },
    { label: 'Preferred Contact', key: 'preferredContact' },
    { label: 'Notes', key: 'notes', type: 'textarea' },
  ];

  const title = contact?.id ? 'Edit Staff' : 'Add Staff';

  return (
    <>
      <FormModal
        title={title}
        fields={fields}
        formData={formData}
        onChange={handleChange}
        onSave={handleSave}
        onCancel={onCancel}
        isLoading={loading}
      />
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

function CongregantForm({ congregant, churchId, onSave, onCancel }) {
  const { refresh } = useDb();
  const [formData, setFormData] = useState(congregant || { churchId, category: 'business' });
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
    const validation = validateCongregant(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      if (formData.id) {
        const existing = db.notableCongregants.findIndex(c => c.id === formData.id);
        if (existing >= 0) {
          db.notableCongregants[existing] = formData;
          saveRecord('notableCongregants', formData);
        }
      } else {
        formData.id = `cg_${Date.now()}`;
        db.notableCongregants.push(formData);
        saveRecord('notableCongregants', formData);
      }

      onSave();
      refresh();
    } catch (err) {
      setErrorMessage('Failed to save congregant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Full name', key: 'name', required: true, placeholder: 'e.g. John Smith', error: errors.name },
    { label: 'Title / Role', key: 'title', placeholder: 'e.g. CEO, Smith Industries' },
    {
      label: 'Category',
      key: 'category',
      type: 'select',
      options: Object.entries(CONGREGANT_CATEGORY).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    },
    { label: 'Email', key: 'email', type: 'email', placeholder: 'optional', error: errors.email },
    { label: 'Phone', key: 'phone', placeholder: 'optional' },
    { label: 'Notes', key: 'notes', type: 'textarea', placeholder: 'optional' },
  ];

  const title = congregant?.id ? 'Edit Congregant' : 'Add Congregant';

  return (
    <>
      <FormModal
        title={title}
        fields={fields}
        formData={formData}
        onChange={handleChange}
        onSave={handleSave}
        onCancel={onCancel}
        isLoading={loading}
      />
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

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

function AdvocateTab({ church }) {
  const { refresh } = useDb();
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'care_communities', notes: '' });
  const advocates = getAdvocatesByChurch(church.id);
  const filtered = roleFilter === 'all' ? advocates : advocates.filter(a => a.role === roleFilter);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.name.trim()) return;
    const fields = { churchId: church.id, name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, role: form.role, notes: form.notes.trim() || null };
    if (editingId) updateAdvocate(editingId, fields); else addAdvocate(fields);
    setForm({ name: '', email: '', phone: '', role: 'care_communities', notes: '' });
    setEditingId(null);
    setIsAdding(false);
    refresh();
  };

  return (
    <>
      <div className="advocate-toolbar">
        <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
          <label className="field-label">Role</label>
          <select className="select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(ADVOCATE_ROLE).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button className="btn primary" onClick={() => { setEditingId(null); setForm({ name: '', email: '', phone: '', role: 'care_communities', notes: '' }); setIsAdding(a => !a); }}><IconPlus stroke={2} /> Add advocate</button>
      </div>

      {isAdding && (
        <div className="card card-pad profile-form" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Name</label>
              <input className="select" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div className="field">
              <label className="field-label">Role</label>
              <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
                {Object.entries(ADVOCATE_ROLE).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="select" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="optional" />
            </div>
            <div className="field">
              <label className="field-label">Phone</label>
              <input className="select" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes</label>
            <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="optional" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={save}>{editingId ? 'Update advocate' : 'Save advocate'}</button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !isAdding && (
        <div className="card">
          <EmptyState icon={IconUserCircle} title="No advocates yet" sub="Add the first advocate for this church." />
        </div>
      )}

      <div className="people-grid">
        {filtered.map(a => {
          const role = ADVOCATE_ROLE[a.role];
          const st = ADVOCATE_STATUS[a.status] || ADVOCATE_STATUS.prospect;
          return (
            <div className="card person-card" key={a.id}>
              <div className="pc-head">
                <AvatarInitials name={a.name} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="pc-name">{a.name}</div>
                  <div className="pc-role"><Badge label={st.label} variant={st.variant} /></div>
                </div>
                {role && <Badge label={role.label} variant={role.variant} />}
              </div>
              <div className="pc-contact">
                {a.email && <span><IconMail stroke={1.75} /> {a.email}</span>}
                {a.phone && <span><IconPhone stroke={1.75} /> {a.phone}</span>}
                {a.notes && <span className="text-secondary">{a.notes}</span>}
              </div>
              <div className="pc-actions">
                <button className="btn sm" onClick={() => { setEditingId(a.id); setForm({ name: a.name || '', email: a.email || '', phone: a.phone || '', role: a.role || 'care_communities', notes: a.notes || '' }); setIsAdding(true); }}><IconPencil /> Edit</button>
                <button className="btn sm danger" onClick={() => { removeProfileRecord('advocates', a.id); refresh(); }}><IconTrash /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StaffTab({ church }) {
  const { refresh } = useDb();
  const [editingContact, setEditingContact] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const contacts = getContactsByChurch(church.id);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setIsAdding(true)}><IconPlus stroke={2} /> Add staff</button>
      </div>
      {(editingContact || isAdding) && (
        <StaffForm
          contact={editingContact}
          churchId={church.id}
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
      {!contacts.length && !isAdding && (
        <div className="card">
          <EmptyState icon={IconUserCircle} title="No staff contacts yet" sub="Add the first staff member for this church." />
        </div>
      )}
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
                  <div className="pc-role">{p.title}</div>
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
                <button className="btn sm danger" onClick={() => { removeProfileRecord('contacts', p.id); refresh(); }}><IconTrash stroke={1.75} /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function NotableCongregrantsTab({ church }) {
  const { refresh } = useDb();
  const [editingCongregant, setEditingCongregant] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const congregants = getCongregantsByChurch(church.id);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setIsAdding(true)}>
          <IconPlus stroke={2} /> Add congregant
        </button>
      </div>

      {(editingCongregant || isAdding) && (
        <CongregantForm
          congregant={editingCongregant}
          churchId={church.id}
          onSave={() => {
            setEditingCongregant(null);
            setIsAdding(false);
          }}
          onCancel={() => {
            setEditingCongregant(null);
            setIsAdding(false);
          }}
        />
      )}

      {congregants.length === 0 && !isAdding && (
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
                <button className="btn sm" onClick={() => setEditingCongregant(c)}><IconPencil stroke={1.75} /> Edit</button>
                <button className="btn sm danger" onClick={() => { removeProfileRecord('notableCongregants', c.id); refresh(); }}><IconTrash stroke={1.75} /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TimelineTab({ church, onLog, onEdit }) {
  const { refresh } = useDb();
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
              <div className="pc-actions">
                <button className="btn sm" onClick={() => onEdit(item)}><IconPencil /> Edit</button>
                <button className="btn sm danger" onClick={() => { removeProfileRecord('interactions', item.id); refresh(); }}><IconTrash /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MinistryTab({ church }) {
  const { refresh } = useDb();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ministry: Object.keys(MINISTRY_TYPE)[0], status: 'exploring', startDate: '', notes: '' });
  const engagements = getMinistryByChurch(church.id);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => {
    const fields = { churchId: church.id, ministry: form.ministry, status: form.status, startDate: form.startDate || null, notes: form.notes.trim() || null };
    if (editingId) updateMinistryEngagement(editingId, fields); else addMinistryEngagement(fields);
    setForm({ ministry: Object.keys(MINISTRY_TYPE)[0], status: 'exploring', startDate: '', notes: '' });
    setEditingId(null); setIsAdding(false);
    refresh();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => { setEditingId(null); setForm({ ministry: Object.keys(MINISTRY_TYPE)[0], status: 'exploring', startDate: '', notes: '' }); setIsAdding(a => !a); }}><IconPlus stroke={2} /> Add ministry</button>
      </div>

      {isAdding && (
        <div className="card card-pad profile-form" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Ministry</label>
              <select className="select" value={form.ministry} onChange={e => set('ministry', e.target.value)}>
                {Object.entries(MINISTRY_TYPE).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(MINISTRY_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Start date</label>
              <input type="date" className="select" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes</label>
            <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="optional" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={save}>{editingId ? 'Update ministry' : 'Save ministry'}</button>
          </div>
        </div>
      )}

      {!engagements.length && !isAdding && (
        <div className="card"><EmptyState icon={IconBuildingChurch} title="No ministry engagements yet" /></div>
      )}

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
            <div className="pc-actions">
              <button className="btn sm" onClick={() => { setEditingId(m.id); setForm({ ministry: m.ministry, status: m.status, startDate: m.startDate || '', notes: m.notes || '' }); setIsAdding(true); }}><IconPencil /> Edit</button>
              <button className="btn sm danger" onClick={() => { removeProfileRecord('ministryEngagements', m.id); refresh(); }}><IconTrash /> Remove</button>
            </div>
          </div>
        );
        })}
      </div>
    </>
  );
}

function NotesTab({ church }) {
  const { refresh } = useDb();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [internalOnly, setInternalOnly] = useState(false);
  const notes = getNotesByChurch(church.id);

  const save = () => {
    if (!body.trim()) return;
    if (editingId) {
      const note = db.churchNotes.find(item => item.id === editingId);
      if (note) { Object.assign(note, { body: body.trim(), pinned, internalOnly }); saveRecord('churchNotes', note); }
    } else addNote({ churchId: church.id, body: body.trim(), pinned, internalOnly });
    setBody(''); setPinned(false); setInternalOnly(false); setEditingId(null); setAdding(false);
    refresh();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => { setEditingId(null); setBody(''); setPinned(false); setInternalOnly(false); setAdding(a => !a); }}><IconPlus stroke={2} /> Add note</button>
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
            <button className="btn primary" onClick={save}>{editingId ? 'Update note' : 'Save note'}</button>
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
              <div className="pc-actions">
                <button className="btn sm" onClick={() => { setEditingId(note.id); setBody(note.body); setPinned(note.pinned); setInternalOnly(note.internalOnly); setAdding(true); }}><IconPencil /> Edit</button>
                <button className="btn sm danger" onClick={() => { removeProfileRecord('churchNotes', note.id); refresh(); }}><IconTrash /> Remove</button>
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', dueDate: '', priority: 'medium' });
  const tasks = getTasksByChurch(church.id).slice().sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.title.trim()) return;
    const fields = { churchId: church.id, title: form.title.trim(), dueDate: form.dueDate || null, priority: form.priority };
    if (editingId) updateTask(editingId, fields); else addTask(fields);
    setForm({ title: '', dueDate: '', priority: 'medium' });
    setEditingId(null); setIsAdding(false);
    refresh();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => { setEditingId(null); setForm({ title: '', dueDate: '', priority: 'medium' }); setIsAdding(a => !a); }}><IconPlus stroke={2} /> Add task</button>
      </div>

      {isAdding && (
        <div className="card card-pad profile-form" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Title</label>
              <input className="select" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs doing?" />
            </div>
            <div className="field">
              <label className="field-label">Due date</label>
              <input type="date" className="select" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Priority</label>
              <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={save}>{editingId ? 'Update task' : 'Save task'}</button>
          </div>
        </div>
      )}

      {!tasks.length && !isAdding && (
        <div className="card"><EmptyState title="No tasks for this church" /></div>
      )}

      {tasks.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th /><th>Task</th><th>Assigned to</th><th>Due date</th><th>Priority</th><th>Status</th><th /></tr>
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
                    <td className="cell-muted">{task.dueDate ? fmtDate(task.dueDate) : '—'}</td>
                    <td><Badge label={priority.label} variant={priority.variant} /></td>
                    <td><Badge label={status.label} variant={status.variant} /></td>
                    <td><div className="pc-actions"><button className="btn sm" onClick={() => { setEditingId(task.id); setForm({ title: task.title, dueDate: task.dueDate || '', priority: task.priority || 'medium' }); setIsAdding(true); }}><IconPencil /></button><button className="btn sm danger" onClick={() => { removeProfileRecord('tasks', task.id); refresh(); }}><IconTrash /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ChurchProfile({ churchId }) {
  const { refresh } = useDb();
  const params = useParams();
  const id = churchId || params.id;
  const isModal = !!churchId;
  const [tab, setTab] = useState('Overview');
  const [logging, setLogging] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editing, setEditing] = useState(false);
  const church = getChurchById(id);

  if (!church) {
    return (
      <div className="card">
        <EmptyState icon={IconBuildingChurch} title="Church not found" sub={<Link to="/">Back to churches</Link>} />
      </div>
    );
  }

  const status = ENGAGEMENT_STATUS[church.engagementStatus] || { label: church.engagementStatus || 'Unknown', variant: 'gray' };
  const giving = getChurchGivingSummary(church.id);
  const givingStatus = GIVING_STATUS[giving.givingStatus];
  const coordinator = church.assignedCoordinatorId ? getUserById(church.assignedCoordinatorId) : null;
  const activeMinistries = getMinistryByChurch(church.id).filter(m => m.status === 'active').length;

  return (
    <>
      {!isModal && (
        <div className="breadcrumb">
          <Link to="/">Churches</Link> <span> / </span> {church.name}
        </div>
      )}
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
            <span><IconCalendar stroke={1.75} /> Last interaction {fmtDate(church.lastInteractionDate)}</span>
            <span><IconUserCircle stroke={1.75} /> {coordinator ? coordinator.name : 'No advocate'}</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setEditing(true)}><IconPencil stroke={1.75} /> Edit</button>
        </div>
      </div>
      <div className="tab-nav">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && <OverviewTab church={church} />}
      {tab === 'Advocate' && <AdvocateTab church={church} />}
      {tab === 'Staff' && <StaffTab church={church} />}
      {tab === 'Notable Congregants' && <NotableCongregrantsTab church={church} />}
      {tab === 'Interactions' && <TimelineTab church={church} onLog={() => setLogging(true)} onEdit={setEditingInteraction} />}
      {tab === 'Ministry' && <MinistryTab church={church} />}
      {tab === 'Notes' && <NotesTab church={church} />}
      {tab === 'Tasks' && <TasksTab church={church} />}
      {logging && <LogInteractionModal churchId={church.id} onClose={() => setLogging(false)} />}
      {editingInteraction && <LogInteractionModal churchId={church.id} interaction={editingInteraction} onClose={() => setEditingInteraction(null)} />}
      {editing && <ChurchForm church={church} onSave={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />}
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
