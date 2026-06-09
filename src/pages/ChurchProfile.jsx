import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  IconMapPin, IconUsers, IconCalendar, IconUserCircle, IconMail, IconPhone,
  IconPlus, IconPencil, IconPinned, IconLock, IconArchive, IconBuildingChurch,
} from '@tabler/icons-react';
import {
  getChurchById, getContactsByChurch, getInteractionsByChurch, getTasksByChurch,
  getNotesByChurch, getMinistryByChurch, getChurchGivingSummary, getUserById,
  getContactById, isTaskOverdue, addNote, toggleTaskCompleted,
} from '../data/helpers.js';
import {
  ENGAGEMENT_STATUS, GIVING_STATUS, GIVING_TYPE, INTERACTION_TYPE, MINISTRY_TYPE,
  MINISTRY_STATUS, TASK_PRIORITY, TASK_STATUS, KFA_ROLE, PREFERRED_CONTACT,
  fmtDate, fmtMoney,
} from '../data/labels.js';
import { Badge, MetricCard, AvatarInitials, EmptyState } from '../components/shared.jsx';
import LogInteractionModal from '../components/LogInteractionModal.jsx';
import { useDb } from '../data/store.jsx';

const TABS = ['Overview', 'People', 'Timeline', 'Ministry', 'Giving', 'Notes', 'Tasks'];

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

function PeopleTab({ church }) {
  const contacts = getContactsByChurch(church.id);
  if (!contacts.length) {
    return (
      <div className="card">
        <EmptyState icon={IconUserCircle} title="No leadership contacts yet" sub="Add the first contact for this church." />
      </div>
    );
  }
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn"><IconPlus stroke={2} /> Add contact</button>
      </div>
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
                <button className="btn sm"><IconPencil stroke={1.75} /> Edit</button>
                <button className="btn sm"><IconArchive stroke={1.75} /> Archive</button>
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

export default function ChurchProfile() {
  useDb();
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const [logging, setLogging] = useState(false);
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
          <button className="btn"><IconPencil stroke={1.75} /> Edit</button>
          <button className="btn primary" onClick={() => setLogging(true)}><IconPlus stroke={2} /> Log interaction</button>
        </div>
      </div>
      <div className="tab-nav">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && <OverviewTab church={church} />}
      {tab === 'People' && <PeopleTab church={church} />}
      {tab === 'Timeline' && <TimelineTab church={church} onLog={() => setLogging(true)} />}
      {tab === 'Ministry' && <MinistryTab church={church} />}
      {tab === 'Giving' && <GivingTab church={church} />}
      {tab === 'Notes' && <NotesTab church={church} />}
      {tab === 'Tasks' && <TasksTab church={church} />}
      {logging && <LogInteractionModal churchId={church.id} onClose={() => setLogging(false)} />}
    </>
  );
}
