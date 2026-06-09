import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import db from '../data/db.js';
import { getChurchById, getUserById } from '../data/helpers.js';
import { INTERACTION_TYPE, fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, FilterPills } from '../components/shared.jsx';
import LogInteractionModal from '../components/LogInteractionModal.jsx';
import { useDb } from '../data/store.jsx';

const TYPE_GROUPS = {
  meeting: ['meeting', 'lunch', 'care_community_meeting'],
  phone: ['phone_call', 'follow_up'],
  email: ['email'],
  event: ['event_invitation', 'presentation', 'stand_sunday', 'training', 'volunteer_recruitment'],
  giving: ['giving_conversation'],
};

const FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'event', label: 'Event' },
  { value: 'giving', label: 'Giving' },
];

function truncate(text, n = 90) {
  return text.length > n ? text.slice(0, n).trimEnd() + '…' : text;
}

export default function Interactions() {
  useDb();
  const [filter, setFilter] = useState('all');
  const [logging, setLogging] = useState(false);

  const interactions = [...db.interactions]
    .filter(i => filter === 'all' || TYPE_GROUPS[filter].includes(i.type))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Header
        title="Interactions"
        subtitle={`${db.interactions.length} interactions logged`}
        actions={<button className="btn primary" onClick={() => setLogging(true)}><IconPlus stroke={2} /> Log interaction</button>}
      />
      <div className="toolbar">
        <FilterPills options={FILTERS} active={filter} onChange={setFilter} />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Church</th><th>Type</th><th>User</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {interactions.map(i => {
              const meta = INTERACTION_TYPE[i.type];
              return (
                <tr key={i.id}>
                  <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(i.date)}</td>
                  <td><Link to={`/churches/${i.churchId}`}>{getChurchById(i.churchId)?.name}</Link></td>
                  <td><Badge label={meta.label} variant={meta.variant} /></td>
                  <td className="cell-muted">{getUserById(i.userId)?.name}</td>
                  <td className="cell-muted">{truncate(i.notes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {logging && <LogInteractionModal onClose={() => setLogging(false)} />}
    </>
  );
}
