// Log Interaction modal — writes to the in-memory db.
import { useState } from 'react';
import { IconSparkles, IconPlus, IconArrowRight, IconCheck } from '@tabler/icons-react';
import db from '../data/db.js';
import { addInteraction, addImpactReport, addTask, updateChurch, addContact, getChurchById, TODAY } from '../data/helpers.js';
import { saveRecord } from '../data/backend.js';
import { INTERACTION_TYPE, ENGAGEMENT_STATUS, TASK_PRIORITY } from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { Modal } from './shared.jsx';

// Turn a "dueInDays" offset into a YYYY-MM-DD date string.
function dateFromNow(days) {
  if (days == null || isNaN(days)) return null;
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export default function LogInteractionModal({ churchId, interaction, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState(interaction || {
    churchId: churchId || db.churches[0]?.id || '',
    type: 'meeting', date: TODAY, notes: '',
  });
  const [reportYear, setReportYear] = useState(2026);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // AI "suggest actions" state.
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [ai, setAi] = useState(null);
  const [applied, setApplied] = useState({}); // key -> true, so buttons show "Added"

  const suggest = async () => {
    if (!form.notes.trim()) return;
    setAiLoading(true); setAiError(''); setAi(null); setApplied({});
    try {
      const res = await fetch('/api/ai/interaction-actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ churchId: form.churchId, notes: form.notes, type: form.type, date: form.date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setAi(await res.json());
    } catch (err) {
      setAiError(err.message || 'Could not get suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  const markApplied = (key) => setApplied(a => ({ ...a, [key]: true }));

  const applyTask = (t, i) => {
    addTask({ churchId: form.churchId, title: t.title, priority: t.priority || 'medium', dueDate: dateFromNow(t.dueInDays) });
    markApplied('task-' + i);
    refresh();
  };
  const applyStatus = () => {
    updateChurch(form.churchId, { engagementStatus: ai.statusSuggestion.value });
    markApplied('status');
    refresh();
  };
  const applyPerson = (p, i) => {
    addContact({ churchId: form.churchId, name: p.name, position: p.role || '' });
    markApplied('person-' + i);
    refresh();
  };

  const save = () => {
    if (!form.churchId || !form.notes.trim()) return;
    if (interaction?.id) {
      const index = db.interactions.findIndex(item => item.id === interaction.id);
      if (index >= 0) db.interactions[index] = { ...interaction, ...form };
      saveRecord('interactions', db.interactions[index]);
    } else addInteraction(form);
    if (!interaction?.id && form.type === 'impact_report') {
      addImpactReport({ churchId: form.churchId, year: Number(reportYear), notes: form.notes });
    }
    refresh();
    onClose();
  };

  const currentStatus = form.churchId ? getChurchById(form.churchId)?.engagementStatus : null;

  return (
    <Modal
      title={interaction?.id ? 'Edit interaction' : 'Log interaction'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>{interaction?.id ? 'Update interaction' : 'Save interaction'}</button>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            type="button"
            className="btn sm"
            onClick={suggest}
            disabled={!form.notes.trim() || aiLoading}
            title="Use AI to suggest follow-up tasks and updates from your note"
          >
            <IconSparkles stroke={1.75} size={15} /> {aiLoading ? 'Thinking…' : 'Suggest actions'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="field" style={{ color: 'var(--danger, #dc2626)', fontSize: 13 }}>{aiError}</div>
      )}

      {ai && (
        <div className="card card-pad" style={{ marginTop: 4, background: 'var(--surface-2, #f8fafc)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
            <IconSparkles stroke={1.75} size={15} /> Suggested actions
          </div>

          {ai.summary && (
            <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-secondary, #475569)' }}>{ai.summary}</div>
          )}

          {ai.tasks && ai.tasks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="field-label" style={{ marginBottom: 4 }}>Follow-up tasks</div>
              {ai.tasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: 13 }}>
                    {t.title}
                    {t.priority && <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}> · {(TASK_PRIORITY[t.priority] || {}).label || t.priority}</span>}
                    {t.dueInDays != null && <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}> · due in {t.dueInDays}d</span>}
                  </span>
                  <button type="button" className="btn sm" disabled={applied['task-' + i]} onClick={() => applyTask(t, i)}>
                    {applied['task-' + i] ? <><IconCheck size={14} /> Added</> : <><IconPlus size={14} /> Add task</>}
                  </button>
                </div>
              ))}
            </div>
          )}

          {ai.statusSuggestion && ai.statusSuggestion.value !== currentStatus && (
            <div style={{ marginBottom: 12 }}>
              <div className="field-label" style={{ marginBottom: 4 }}>Engagement status</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13 }}>
                  Change to <strong>{(ENGAGEMENT_STATUS[ai.statusSuggestion.value] || {}).label || ai.statusSuggestion.value}</strong>
                  {ai.statusSuggestion.reason && <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}> — {ai.statusSuggestion.reason}</span>}
                </span>
                <button type="button" className="btn sm" disabled={applied.status} onClick={applyStatus}>
                  {applied.status ? <><IconCheck size={14} /> Applied</> : <><IconArrowRight size={14} /> Apply</>}
                </button>
              </div>
            </div>
          )}

          {ai.people && ai.people.length > 0 && (
            <div>
              <div className="field-label" style={{ marginBottom: 4 }}>People mentioned</div>
              {ai.people.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: 13 }}>
                    {p.name}{p.role && <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}> · {p.role}</span>}
                  </span>
                  <button type="button" className="btn sm" disabled={applied['person-' + i]} onClick={() => applyPerson(p, i)}>
                    {applied['person-' + i] ? <><IconCheck size={14} /> Added</> : <><IconPlus size={14} /> Add as staff</>}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!ai.summary && !(ai.tasks || []).length && !ai.statusSuggestion && !(ai.people || []).length && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary, #94a3b8)' }}>No actions suggested for this note.</div>
          )}
        </div>
      )}
    </Modal>
  );
}
