// Log Interaction modal — writes to the in-memory db.
import { useState } from 'react';
import db from '../data/db.js';
import { addInteraction, addImpactReport, addTask, updateChurch, TODAY } from '../data/helpers.js';
import { INTERACTION_TYPE } from '../data/labels.js';
import { suggestFromInteractionNotes } from '../data/agentic.js';
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
  const [reportYear, setReportYear] = useState(2026);
  const [suggestion, setSuggestion] = useState(null);
  const [accepted, setAccepted] = useState({ summary: false, stage: false, followUp: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.notes.trim()) return;
    const notes = accepted.summary && suggestion?.summary ? suggestion.summary : form.notes;
    addInteraction({ ...form, notes });
    if (accepted.stage && suggestion?.suggestedStage) {
      updateChurch(form.churchId, { engagementStatus: suggestion.suggestedStage });
    }
    if (accepted.followUp && suggestion?.followUp) {
      addTask({ churchId: form.churchId, ...suggestion.followUp, priority: 'medium', status: 'open' });
    }
    if (form.type === 'impact_report') {
      addImpactReport({ churchId: form.churchId, year: Number(reportYear), notes: form.notes });
    }
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
      {form.type === 'impact_report' && (
        <div className="field">
          <label className="field-label">Report year</label>
          <input
            type="number"
            className="select"
            value={reportYear}
            onChange={e => setReportYear(e.target.value)}
          />
        </div>
      )}
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
      <button
        className="btn"
        type="button"
        disabled={!form.notes.trim()}
        onClick={() => {
          setSuggestion(suggestFromInteractionNotes(form.notes, TODAY));
          setAccepted({ summary: false, stage: false, followUp: false });
        }}
      >
        Review suggested follow-ups
      </button>
      {suggestion && (
        <div className="assistant-review" aria-label="Suggested updates">
          <div className="assistant-review-title">Suggestions — nothing changes until you select it</div>
          <label>
            <input type="checkbox" checked={accepted.summary} onChange={e => setAccepted(value => ({ ...value, summary: e.target.checked }))} />
            <span><strong>Clean up the interaction summary</strong><small>{suggestion.summary}</small></span>
          </label>
          {suggestion.suggestedStage && (
            <label>
              <input type="checkbox" checked={accepted.stage} onChange={e => setAccepted(value => ({ ...value, stage: e.target.checked }))} />
              <span><strong>Change relationship stage</strong><small>Set this church to {suggestion.suggestedStage}.</small></span>
            </label>
          )}
          {suggestion.followUp && (
            <label>
              <input type="checkbox" checked={accepted.followUp} onChange={e => setAccepted(value => ({ ...value, followUp: e.target.checked }))} />
              <span><strong>Create a follow-up</strong><small>{suggestion.followUp.title} · {suggestion.followUp.dueDate}</small></span>
            </label>
          )}
          {suggestion.ministryTags.length > 0 && <div className="assistant-tags">Mentioned ministries: {suggestion.ministryTags.join(', ')}</div>}
        </div>
      )}
    </Modal>
  );
}
