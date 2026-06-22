// Log Interaction modal — writes to the in-memory db.
import { useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import db from '../data/db.js';
import { addInteraction, TODAY } from '../data/helpers.js';
import { INTERACTION_TYPE } from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { captureInteraction } from '../ai/arlo.js';
import { Modal } from './shared.jsx';

export default function LogInteractionModal({ churchId, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    churchId: churchId || db.churches[0].id,
    type: 'meeting',
    date: TODAY,
    notes: '',
  });
  const [structuring, setStructuring] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Let Arlo turn a freeform note into structured type/date/notes (Haiku).
  const structure = async () => {
    if (!form.notes.trim()) return;
    setStructuring(true);
    try {
      const d = await captureInteraction({ rawText: form.notes, churchId: form.churchId });
      setForm(f => ({ ...f, type: d.type, date: d.date, notes: d.notes }));
    } finally {
      setStructuring(false);
    }
  };

  const save = () => {
    if (!form.notes.trim()) return;
    addInteraction(form);
    refresh();
    onClose();
  };

  return (
    <Modal
      title="Log interaction"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save interaction</button>
        </>
      }
    >
      {!churchId && (
        <div className="field">
          <label className="field-label">Church</label>
          <select className="select" value={form.churchId} onChange={e => set('churchId', e.target.value)}>
            {db.churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label className="field-label">Interaction type</label>
        <select className="select" value={form.type} onChange={e => set('type', e.target.value)}>
          {Object.entries(INTERACTION_TYPE).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field-label">Date</label>
        <input type="date" className="select" value={form.date} onChange={e => set('date', e.target.value)} />
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="field-label">Notes</label>
          <button
            type="button"
            className="btn sm"
            onClick={structure}
            disabled={structuring || !form.notes.trim()}
          >
            <IconSparkles stroke={1.75} /> {structuring ? 'Structuring…' : 'Structure with Arlo'}
          </button>
        </div>
        <textarea
          className="select"
          placeholder="What happened? Jot it freeform, then let Arlo structure it."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  );
}
