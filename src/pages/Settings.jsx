import { getUserById } from '../data/helpers.js';
import { Header } from '../components/layout.jsx';
import { AvatarInitials } from '../components/shared.jsx';

export default function Settings() {
  const me = getUserById('usr_001');
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
            <input className="select" defaultValue={me.name} />
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="select" defaultValue={me.email} />
          </div>
          <button className="btn primary">Save changes</button>
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
