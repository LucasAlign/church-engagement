// Log Interaction modal — writes to the in-memory db.
import { useState } from 'react';
import db from '../data/db.js';
import { addInteraction, TODAY } from '../data/helpers.js';
import { INTERACTION_TYPE } from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { Modal } from './shared.jsx';

export default function LogInteractionModal({ churchId, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    churchId: churchId || db.churches[0].id,
    type: 'meeting',
    date: TODAY,
    notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
        <label className="field-label">Notes</label>
        <textarea
          className="select"
          placeholder="What happened?"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  );
}
