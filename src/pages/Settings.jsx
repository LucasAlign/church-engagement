import { useDb } from '../data/store.jsx';
import { Header } from '../components/layout.jsx';

export default function Settings() {
  const { backend } = useDb();

  return (
    <>
      <Header title="Settings" subtitle="Profile and module preferences" />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="section-title">Account</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            User authentication is not yet configured. Profile settings will appear here once login is enabled.
          </p>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Backend: <strong>{backend}</strong>
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
