import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPlus, IconPencil } from '@tabler/icons-react';
import db from '../data/db.js';
import { getChurchById, getUserById, isTaskOverdue, toggleTaskCompleted } from '../data/helpers.js';
import { TASK_PRIORITY, TASK_STATUS, fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, FilterPills } from '../components/shared.jsx';
import { TaskModal } from '../components/EntityModals.jsx';
import { useDb } from '../data/store.jsx';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

export default function FollowUps() {
  const { refresh } = useDb();
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null); // { task? } when open

  const tasks = [...db.tasks]
    .filter(t => {
      if (filter === 'all') return true;
      if (filter === 'overdue') return isTaskOverdue(t);
      return t.status === filter;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <>
      <Header
        title="Follow-ups"
        subtitle={`${db.tasks.filter(t => t.status !== 'completed').length} open tasks across all churches`}
        actions={<button className="btn primary" onClick={() => setModal({})}><IconPlus stroke={2} /> New task</button>}
      />
      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} />}
      <div className="toolbar">
        <FilterPills options={FILTERS} active={filter} onChange={setFilter} />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th /><th>Church</th><th>Task</th><th>Assigned to</th><th>Due date</th><th>Priority</th><th>Status</th><th /></tr>
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
                  <td><Link to={`/churches/${task.churchId}`}>{getChurchById(task.churchId)?.name}</Link></td>
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
    </>
  );
}
