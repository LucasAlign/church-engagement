import { useState } from 'react';
import { getUserById, updateUser } from '../data/helpers.js';
import { Header } from '../components/layout.jsx';
import { AvatarInitials } from '../components/shared.jsx';
import { initialsOf } from '../data/labels.js';
import { useDb } from '../data/store.jsx';

export default function Settings() {
  const { refresh } = useDb();
  const me = getUserById('usr_001');
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!name.trim() || !email.trim()) return;
    updateUser(me.id, { name: name.trim(), email: email.trim(), initials: initialsOf(name.trim()) });
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header title="Settings" subtitle="Profile and module preferences" />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="section-title">Profile</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <AvatarInitials name={me.name} initials={me.initials} size="lg" />
            <div>
              <div style={{ fontWeight: 500 }}>{me.name}</div>
              <div className="text-secondary" style={{ fontSize: 13 }}>{me.role} · {me.county} County</div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Name</label>
            <input className="select" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="select" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn primary" onClick={save}>Save changes</button>
            {saved && <span className="text-secondary" style={{ fontSize: 13 }}>Saved ✓</span>}
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="section-title">Notifications</h3>
          {[
            'Email me when a task becomes overdue',
            'Email me when a new gift is recorded',
            'Weekly engagement summary digest',
            'Remind me before scheduled follow-ups',
          ].map(label => (
            <label key={label} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', fontSize: 13.5 }}>
              <input type="checkbox" className="checkbox" defaultChecked /> {label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
