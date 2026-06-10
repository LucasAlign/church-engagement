import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  IconMapPin, IconUsers, IconCalendar, IconUserCircle, IconMail, IconPhone,
  IconPlus, IconPencil, IconPinned, IconLock, IconArchive, IconBuildingChurch,
  IconHeartHandshake, IconSpeakerphone, IconUsersGroup,
} from '@tabler/icons-react';
import {
  getChurchById, getContactsByChurch, getInteractionsByChurch, getTasksByChurch,
  getNotesByChurch, getMinistryByChurch, getChurchGivingSummary, getUserById,
  getContactById, getCareCommunitiesByChurch, getAdvocatesByChurch,
  getConnectionsByChurch, isTaskOverdue, addNote, updateNote, toggleTaskCompleted,
  archiveContact,
} from '../data/helpers.js';
import {
  ENGAGEMENT_STATUS, GIVING_STATUS, GIVING_TYPE, INTERACTION_TYPE, MINISTRY_TYPE,
  MINISTRY_STATUS, TASK_PRIORITY, TASK_STATUS, KFA_ROLE, PREFERRED_CONTACT,
  CARE_COMMUNITY_STATUS, ADVOCATE_STATUS, CONNECTION_TYPE, CONNECTION_STATUS,
  fmtDate, fmtMoney,
} from '../data/labels.js';
import { Badge, MetricCard, AvatarInitials, EmptyState } from '../components/shared.jsx';
import LogInteractionModal from '../components/LogInteractionModal.jsx';
import {
  StaffModal, CareCommunityModal, AdvocateModal, ConnectionModal,
  ChurchModal, MinistryModal, GivingRecordModal, TaskModal,
} from '../components/EntityModals.jsx';
import { useDb } from '../data/store.jsx';

const TABS = [
  'Overview', 'Staff', 'Care Communities', 'Advocates', 'Connections',
  'Timeline', 'Ministry', 'Giving', 'Notes', 'Tasks',
];

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
  const [modal, setModal] = useState(null); // { contact? } when open
  const contacts = getContactsByChurch(church.id);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Add staff member</button>
      </div>
      {!contacts.length && (
        <div className="card">
          <EmptyState icon={IconUserCircle} title="No staff yet" sub="Add the first staff member for this church." />
        </div>
      )}
      <div className="people-grid">
        {contacts.map(p => {
          const role = KFA_ROLE[p.kfaRole] || KFA_ROLE.none;
          return (
            <div className="card person-card" key={p.id}>
              <div className="pc-head">
                <AvatarInitials name={p.name} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="pc-name">{p.name}</div>
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
                <button className="btn sm" onClick={() => setModal({ contact: p })}><IconPencil stroke={1.75} /> Edit</button>
                <button className="btn sm" onClick={() => { archiveContact(p.id); refresh(); }}><IconArchive stroke={1.75} /> Archive</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && <StaffModal churchId={church.id} contact={modal.contact} onClose={() => setModal(null)} />}
    </>
  );
}

function CareCommunitiesTab({ church }) {
  const [modal, setModal] = useState(null); // { community? } when open
  const communities = getCareCommunitiesByChurch(church.id);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Add care community</button>
      </div>
      {!communities.length && (
        <div className="card">
          <EmptyState icon={IconHeartHandshake} title="No care communities yet" sub="Add the first care community for this church." />
        </div>
      )}
      <div className="ministry-grid">
        {communities.map(cc => {
          const status = CARE_COMMUNITY_STATUS[cc.status];
          return (
            <div className={`card ministry-card ${cc.status === 'active' ? 'active-ministry' : ''}`} key={cc.id}>
              <div className="mc-head">
                <span className="mc-name">{cc.name}</span>
                <Badge label={status.label} variant={status.variant} />
              </div>
              <div className="mc-meta">
                {cc.lead && <div>Lead: {cc.lead}</div>}
                {cc.familyServed && <div>Serving: {cc.familyServed}</div>}
                {cc.startDate && <div>Since {fmtDate(cc.startDate)}</div>}
                {cc.members.length > 0 && (
                  <div>Team: {cc.members.map(m => (m.role ? `${m.name} (${m.role})` : m.name)).join(', ')}</div>
                )}
                {cc.notes && <div>{cc.notes}</div>}
              </div>
              <div className="pc-actions" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setModal({ community: cc })}><IconPencil stroke={1.75} /> Edit</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && <CareCommunityModal churchId={church.id} community={modal.community} onClose={() => setModal(null)} />}
    </>
  );
}

function AdvocatesTab({ church }) {
  const [modal, setModal] = useState(null); // { advocate? } when open
  const advocates = getAdvocatesByChurch(church.id);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Add advocate</button>
      </div>
      {!advocates.length && (
        <div className="card">
          <EmptyState icon={IconSpeakerphone} title="No advocates yet" sub="Add the first advocate for this church." />
        </div>
      )}
      <div className="people-grid">
        {advocates.map(a => {
          const status = ADVOCATE_STATUS[a.status];
          return (
            <div className="card person-card" key={a.id}>
              <div className="pc-head">
                <AvatarInitials name={a.name} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="pc-name">{a.name}</div>
                  <div className="pc-role">{a.role || 'Advocate'}</div>
                </div>
                <Badge label={status.label} variant={status.variant} />
              </div>
              <div className="pc-contact">
                {a.email && <span><IconMail stroke={1.75} /> {a.email}</span>}
                {a.phone && <span><IconPhone stroke={1.75} /> {a.phone}</span>}
                <span className="text-secondary">
                  {a.trainedDate ? `Trained ${fmtDate(a.trainedDate)}` : 'Not yet trained'}
                  {a.notes ? ` · ${a.notes}` : ''}
                </span>
              </div>
              <div className="pc-actions">
                <button className="btn sm" onClick={() => setModal({ advocate: a })}><IconPencil stroke={1.75} /> Edit</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && <AdvocateModal churchId={church.id} advocate={modal.advocate} onClose={() => setModal(null)} />}
    </>
  );
}

function ConnectionsTab({ church }) {
  const [modal, setModal] = useState(null); // { connection? } when open
  const connections = getConnectionsByChurch(church.id);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Add connection</button>
      </div>
      {!connections.length ? (
        <div className="card">
          <EmptyState icon={IconUsersGroup} title="No connections yet" sub="Add people from this congregation connected to KFA." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Connection</th><th>Email</th><th>Phone</th><th>Status</th><th>Notes</th><th /></tr>
            </thead>
            <tbody>
              {connections.map(cx => {
                const type = CONNECTION_TYPE[cx.connectionType] || CONNECTION_TYPE.other;
                const status = CONNECTION_STATUS[cx.status];
                return (
                  <tr key={cx.id}>
                    <td style={{ fontWeight: 500 }}>{cx.name}</td>
                    <td><Badge label={type.label} variant={type.variant} /></td>
                    <td className="cell-muted">{cx.email || '—'}</td>
                    <td className="cell-muted">{cx.phone || '—'}</td>
                    <td><Badge label={status.label} variant={status.variant} /></td>
                    <td className="cell-muted">{cx.notes || ''}</td>
                    <td><button className="btn sm" onClick={() => setModal({ connection: cx })}><IconPencil stroke={1.75} /> Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {modal && <ConnectionModal churchId={church.id} connection={modal.connection} onClose={() => setModal(null)} />}
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
  const [modal, setModal] = useState(null); // { engagement? } when open
  const engagements = getMinistryByChurch(church.id);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Add ministry</button>
      </div>
      {!engagements.length && (
        <div className="card"><EmptyState icon={IconBuildingChurch} title="No ministry engagements yet" sub="Add the first ministry engagement for this church." /></div>
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
              <div className="pc-actions" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setModal({ engagement: m })}><IconPencil stroke={1.75} /> Edit</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && <MinistryModal churchId={church.id} engagement={modal.engagement} onClose={() => setModal(null)} />}
    </>
  );
}

function GivingTab({ church }) {
  const [modal, setModal] = useState(null); // { record? } when open
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Badge label={status.label} variant={status.variant} />
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Record gift</button>
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
                <tr><th>Date</th><th>Amount</th><th>Fund</th><th>Type</th><th /></tr>
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
                      <td style={{ width: 40 }}>
                        <button className="icon-btn" aria-label="Edit gift" onClick={() => setModal({ record: r })}><IconPencil stroke={1.75} /></button>
                      </td>
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
      {modal && <GivingRecordModal churchId={church.id} record={modal.record} onClose={() => setModal(null)} />}
    </>
  );
}

function NotesTab({ church }) {
  const { refresh } = useDb();
  // form is null when closed; { note? , body, pinned, internalOnly } when open
  const [form, setForm] = useState(null);
  const notes = getNotesByChurch(church.id);

  const openAdd = () => setForm({ body: '', pinned: false, internalOnly: false });
  const openEdit = note => setForm({ note, body: note.body, pinned: note.pinned, internalOnly: note.internalOnly });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.body.trim()) return;
    const values = { body: form.body.trim(), pinned: form.pinned, internalOnly: form.internalOnly };
    if (form.note) updateNote(form.note.id, values);
    else addNote({ churchId: church.id, ...values });
    setForm(null);
    refresh();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={openAdd}><IconPlus stroke={2} /> Add note</button>
      </div>
      {form && (
        <div className="card card-pad" style={{ marginBottom: 10 }}>
          <div className="field">
            <label className="field-label">{form.note ? 'Edit note' : 'Note'}</label>
            <textarea className="select" value={form.body} onChange={e => set('body', e.target.value)} placeholder="Write a note…" />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" className="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} /> Pin note
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" className="checkbox" checked={form.internalOnly} onChange={e => set('internalOnly', e.target.checked)} /> Internal only
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>Save note</button>
          </div>
        </div>
      )}
      {notes.length === 0 && !form && <div className="card"><EmptyState title="No notes yet" sub="Add the first note for this church." /></div>}
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
                <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => openEdit(note)}>
                  <IconPencil stroke={1.75} /> Edit
                </button>
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
  const [modal, setModal] = useState(null); // { task? } when open
  const tasks = getTasksByChurch(church.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> Add task</button>
      </div>
      {!tasks.length ? (
        <div className="card"><EmptyState title="No tasks for this church" sub="Add the first task for this church." /></div>
      ) : (
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
                    <td className="cell-muted">{fmtDate(task.dueDate)}</td>
                    <td><Badge label={priority.label} variant={priority.variant} /></td>
                    <td><Badge label={status.label} variant={status.variant} /></td>
                    <td style={{ width: 40 }}>
                      <button className="icon-btn" aria-label="Edit task" onClick={() => setModal({ task })}><IconPencil stroke={1.75} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {modal && <TaskModal churchId={church.id} task={modal.task} onClose={() => setModal(null)} />}
    </>
  );
}

export default function ChurchProfile() {
  useDb();
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState(false);
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
          <button className="btn" onClick={() => setEditing(true)}><IconPencil stroke={1.75} /> Edit</button>
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
      {tab === 'Care Communities' && <CareCommunitiesTab church={church} />}
      {tab === 'Advocates' && <AdvocatesTab church={church} />}
      {tab === 'Connections' && <ConnectionsTab church={church} />}
      {tab === 'Timeline' && <TimelineTab church={church} onLog={() => setLogging(true)} />}
      {tab === 'Ministry' && <MinistryTab church={church} />}
      {tab === 'Giving' && <GivingTab church={church} />}
      {tab === 'Notes' && <NotesTab church={church} />}
      {tab === 'Tasks' && <TasksTab church={church} />}
      {logging && <LogInteractionModal churchId={church.id} onClose={() => setLogging(false)} />}
      {editing && <ChurchModal church={church} onClose={() => setEditing(false)} />}
    </>
  );
}
