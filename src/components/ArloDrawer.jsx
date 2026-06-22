// ArloDrawer — the summonable assistant. Mounted once in the app shell.
// ⌘K / Ctrl-K (or the floating button) toggles it; Esc closes it.
//
// Phase 1 wires three Haiku actions (capture, summarize, daily brief) plus the
// Opus coaching entry point, all against the mock DB through src/ai. Model
// routing is invisible to the user — each action already knows its model.
import { useEffect, useRef, useState } from 'react';
import {
  IconSparkles, IconX, IconCalendarTime, IconBuildingChurch,
  IconClipboardText, IconSend,
} from '@tabler/icons-react';
import db from '../data/db.js';
import { addInteraction } from '../data/helpers.js';
import { useDb } from '../data/store.jsx';
import {
  dailyBrief, summarizeChurch, captureInteraction, coach, MODEL_LABELS, INTERACTION_TYPE,
} from '../ai/arlo.js';

let entrySeq = 0;

export default function ArloDrawer() {
  const { refresh } = useDb();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null); // 'summarize' | 'capture' | null
  const [summChurchId, setSummChurchId] = useState(db.churches[0].id);
  const [note, setNote] = useState('');
  const [captureChurchId, setCaptureChurchId] = useState(db.churches[0].id);
  const [draft, setDraft] = useState(null);
  const [ask, setAsk] = useState('');
  const scrollRef = useRef(null);

  // ⌘K / Ctrl-K toggles, Esc closes.
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the transcript pinned to the latest entry.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries, draft, panel]);

  const addEntry = entry => setEntries(es => [...es, { id: ++entrySeq, ...entry }]);

  const run = async (action, title) => {
    setBusy(true);
    try {
      const res = await action();
      addEntry({ title, model: res.model, body: res.text, placeholder: res.placeholder });
    } finally {
      setBusy(false);
    }
  };

  const onBrief = () => { setPanel(null); run(dailyBrief, 'Today\'s brief'); };

  const onSummarize = () => {
    const name = db.churches.find(c => c.id === summChurchId)?.name;
    setPanel(null);
    run(() => summarizeChurch({ churchId: summChurchId }), `Summary · ${name}`);
  };

  const onStructure = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const d = await captureInteraction({ rawText: note, churchId: captureChurchId });
      setDraft(d);
    } finally {
      setBusy(false);
    }
  };

  const onLog = () => {
    addInteraction({
      churchId: captureChurchId,
      type: draft.type,
      date: draft.date,
      notes: draft.notes,
    });
    refresh();
    const name = db.churches.find(c => c.id === captureChurchId)?.name;
    addEntry({ title: `Logged · ${name}`, body: `${INTERACTION_TYPE[draft.type]?.label} — ${draft.notes}` });
    setDraft(null);
    setNote('');
    setPanel(null);
  };

  const onAsk = () => {
    if (!ask.trim()) return;
    const q = ask.trim();
    setAsk('');
    addEntry({ title: 'You', body: q, mine: true });
    run(() => coach({ question: q }), 'Arlo');
  };

  return (
    <>
      {!open && (
        <button className="arlo-fab" onClick={() => setOpen(true)} aria-label="Open Arlo (⌘K)">
          <IconSparkles stroke={1.75} /> Ask Arlo
        </button>
      )}

      {open && (
        <div className="arlo-drawer">
          <div className="arlo-header">
            <div className="arlo-title">
              <IconSparkles stroke={1.75} /> Arlo
              <span className="arlo-hint">Haiku 4.5 · Opus 4.8</span>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><IconX /></button>
          </div>

          <div className="arlo-body" ref={scrollRef}>
            {entries.length === 0 && !panel && (
              <div className="arlo-intro">
                Your assistant, scheduler, and coach. Pick an action below or ask a question.
              </div>
            )}

            {entries.map(e => (
              <div key={e.id} className={`arlo-entry ${e.mine ? 'mine' : ''}`}>
                <div className="arlo-entry-head">
                  <span className="arlo-entry-title">{e.title}</span>
                  {e.model && <span className="arlo-model">{MODEL_LABELS[e.model] || ''}</span>}
                </div>
                <div className={`arlo-entry-body ${e.placeholder ? 'muted' : ''}`}>{e.body}</div>
              </div>
            ))}

            {panel === 'summarize' && (
              <div className="arlo-panel">
                <label className="field-label">Which church?</label>
                <select className="select" value={summChurchId} onChange={e => setSummChurchId(e.target.value)}>
                  {db.churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="arlo-panel-actions">
                  <button className="btn" onClick={() => setPanel(null)}>Cancel</button>
                  <button className="btn primary" onClick={onSummarize} disabled={busy}>Summarize</button>
                </div>
              </div>
            )}

            {panel === 'capture' && (
              <div className="arlo-panel">
                <label className="field-label">Church</label>
                <select className="select" value={captureChurchId} onChange={e => setCaptureChurchId(e.target.value)}>
                  {db.churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <label className="field-label" style={{ marginTop: 8 }}>Your note</label>
                <textarea
                  className="select"
                  rows={3}
                  placeholder="e.g. Called Pastor Dave, he's keen to discuss Stand Sunday — follow up next week"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                {draft ? (
                  <div className="arlo-draft">
                    <div className="arlo-draft-row">
                      <span className="field-label">Type</span>
                      <select
                        className="select"
                        value={draft.type}
                        onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
                      >
                        {Object.entries(INTERACTION_TYPE).map(([v, { label }]) => (
                          <option key={v} value={v}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="arlo-draft-notes">{draft.notes}</div>
                    {draft.suggestedTask && (
                      <div className="arlo-draft-task">Suggested follow-up: {draft.suggestedTask.title}</div>
                    )}
                    <div className="arlo-panel-actions">
                      <button className="btn" onClick={() => { setDraft(null); setPanel(null); }}>Cancel</button>
                      <button className="btn primary" onClick={onLog}>Log it</button>
                    </div>
                  </div>
                ) : (
                  <div className="arlo-panel-actions">
                    <button className="btn" onClick={() => setPanel(null)}>Cancel</button>
                    <button className="btn primary" onClick={onStructure} disabled={busy || !note.trim()}>
                      Structure with Arlo
                    </button>
                  </div>
                )}
              </div>
            )}

            {busy && <div className="arlo-thinking">Arlo is working…</div>}
          </div>

          <div className="arlo-actions">
            <button className="arlo-chip" onClick={onBrief} disabled={busy}>
              <IconCalendarTime stroke={1.75} /> Today's brief
            </button>
            <button className="arlo-chip" onClick={() => { setDraft(null); setPanel('summarize'); }} disabled={busy}>
              <IconBuildingChurch stroke={1.75} /> Summarize a church
            </button>
            <button className="arlo-chip" onClick={() => { setDraft(null); setPanel('capture'); }} disabled={busy}>
              <IconClipboardText stroke={1.75} /> Capture interaction
            </button>
          </div>

          <div className="arlo-ask">
            <input
              type="text"
              placeholder="Ask Arlo about your portfolio…"
              value={ask}
              onChange={e => setAsk(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAsk()}
            />
            <button className="icon-btn" onClick={onAsk} disabled={busy || !ask.trim()} aria-label="Send">
              <IconSend stroke={1.75} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
