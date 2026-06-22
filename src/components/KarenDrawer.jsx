// KarenDrawer — the summonable assistant. Mounted once in the app shell.
// ⌘K / Ctrl-K (or the floating button) toggles it; Esc closes it.
//
// Wires four Haiku actions (capture, summarize, daily brief, draft follow-up)
// plus Opus coaching, all against the live db through src/ai. Model routing is
// invisible — each action already knows its model. Guards against an empty db
// (the app starts empty and hydrates from Supabase).
import { useEffect, useRef, useState } from 'react';
import {
  IconSparkles, IconX, IconCalendarTime, IconBuildingChurch,
  IconClipboardText, IconSend, IconMailForward, IconCopy, IconCheck,
} from '@tabler/icons-react';
import db from '../data/db.js';
import { addInteraction } from '../data/helpers.js';
import { useDb } from '../data/store.jsx';
import {
  dailyBrief, summarizeChurch, captureInteraction, draftFollowUp, coach,
  MODEL_LABELS, INTERACTION_TYPE,
} from '../ai/karen.js';

let entrySeq = 0;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — no-op */ }
  };
  return (
    <button className="karen-copy" onClick={copy} aria-label="Copy">
      {copied ? <IconCheck stroke={1.75} /> : <IconCopy stroke={1.75} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function KarenDrawer() {
  const { refresh } = useDb();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null); // 'summarize' | 'draft' | 'capture' | null
  const firstChurch = db.churches[0]?.id ?? '';
  const [summChurchId, setSummChurchId] = useState(firstChurch);
  const [draftChurchId, setDraftChurchId] = useState(firstChurch);
  const [captureChurchId, setCaptureChurchId] = useState(firstChurch);
  const [note, setNote] = useState('');
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

  // When churches arrive after hydration, seed the pickers if still empty.
  useEffect(() => {
    if (!summChurchId && firstChurch) {
      setSummChurchId(firstChurch); setDraftChurchId(firstChurch); setCaptureChurchId(firstChurch);
    }
  }, [firstChurch]); // eslint-disable-line react-hooks/exhaustive-deps

  const churches = db.churches;
  const hasChurches = churches.length > 0;
  const churchName = id => churches.find(c => c.id === id)?.name;

  const addEntry = entry => setEntries(es => [...es, { id: ++entrySeq, ...entry }]);

  const run = async (action, title, opts = {}) => {
    setBusy(true);
    try {
      const res = await action();
      addEntry({ title, model: res.model, body: res.text, copyable: opts.copyable });
    } finally {
      setBusy(false);
    }
  };

  const onBrief = () => { setPanel(null); run(dailyBrief, 'Today\'s brief'); };

  const onSummarize = () => {
    if (!summChurchId) return;
    setPanel(null);
    run(() => summarizeChurch({ churchId: summChurchId }), `Summary · ${churchName(summChurchId)}`);
  };

  const onDraft = () => {
    if (!draftChurchId) return;
    setPanel(null);
    run(() => draftFollowUp({ churchId: draftChurchId }), `Draft · ${churchName(draftChurchId)}`, { copyable: true });
  };

  const onStructure = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      setDraft(await captureInteraction({ rawText: note, churchId: captureChurchId }));
    } finally {
      setBusy(false);
    }
  };

  const onLog = () => {
    if (!captureChurchId) return;
    addInteraction({ churchId: captureChurchId, type: draft.type, date: draft.date, notes: draft.notes });
    refresh();
    addEntry({ title: `Logged · ${churchName(captureChurchId)}`, body: `${INTERACTION_TYPE[draft.type]?.label} — ${draft.notes}` });
    setDraft(null); setNote(''); setPanel(null);
  };

  const onAsk = () => {
    if (!ask.trim()) return;
    const q = ask.trim();
    setAsk('');
    addEntry({ title: 'You', body: q, mine: true });
    run(() => coach({ question: q }), 'Karen');
  };

  const ChurchSelect = ({ value, onChange }) => (
    hasChurches ? (
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    ) : (
      <div className="karen-empty">No churches loaded yet.</div>
    )
  );

  return (
    <>
      {!open && (
        <button className="karen-fab" onClick={() => setOpen(true)} aria-label="Open Karen (⌘K)">
          <IconSparkles stroke={1.75} /> Ask Karen
        </button>
      )}

      {open && (
        <div className="karen-drawer">
          <div className="karen-header">
            <div className="karen-title">
              <IconSparkles stroke={1.75} /> Karen
              <span className="karen-hint">Haiku 4.5 · Opus 4.8</span>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><IconX /></button>
          </div>

          <div className="karen-body" ref={scrollRef}>
            {entries.length === 0 && !panel && (
              <div className="karen-intro">
                Your assistant, scheduler, and coach. Pick an action below or ask a question.
              </div>
            )}

            {entries.map(e => (
              <div key={e.id} className={`karen-entry ${e.mine ? 'mine' : ''}`}>
                <div className="karen-entry-head">
                  <span className="karen-entry-title">{e.title}</span>
                  {e.model && <span className="karen-model">{MODEL_LABELS[e.model] || ''}</span>}
                </div>
                <div className="karen-entry-body">{e.body}</div>
                {e.copyable && <CopyButton text={e.body} />}
              </div>
            ))}

            {panel === 'summarize' && (
              <div className="karen-panel">
                <label className="field-label">Which church?</label>
                <ChurchSelect value={summChurchId} onChange={setSummChurchId} />
                <div className="karen-panel-actions">
                  <button className="btn" onClick={() => setPanel(null)}>Cancel</button>
                  <button className="btn primary" onClick={onSummarize} disabled={busy || !hasChurches}>Summarize</button>
                </div>
              </div>
            )}

            {panel === 'draft' && (
              <div className="karen-panel">
                <label className="field-label">Draft a follow-up for</label>
                <ChurchSelect value={draftChurchId} onChange={setDraftChurchId} />
                <div className="karen-panel-actions">
                  <button className="btn" onClick={() => setPanel(null)}>Cancel</button>
                  <button className="btn primary" onClick={onDraft} disabled={busy || !hasChurches}>Draft it</button>
                </div>
              </div>
            )}

            {panel === 'capture' && (
              <div className="karen-panel">
                <label className="field-label">Church</label>
                <ChurchSelect value={captureChurchId} onChange={setCaptureChurchId} />
                <label className="field-label" style={{ marginTop: 8 }}>Your note</label>
                <textarea
                  className="select"
                  rows={3}
                  placeholder="e.g. Called Pastor Dave, he's keen to discuss Stand Sunday — follow up next week"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                {draft ? (
                  <div className="karen-draft">
                    <div className="karen-draft-row">
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
                    <div className="karen-draft-notes">{draft.notes}</div>
                    {draft.suggestedTask && (
                      <div className="karen-draft-task">Suggested follow-up: {draft.suggestedTask.title}</div>
                    )}
                    <div className="karen-panel-actions">
                      <button className="btn" onClick={() => { setDraft(null); setPanel(null); }}>Cancel</button>
                      <button className="btn primary" onClick={onLog} disabled={!hasChurches}>Log it</button>
                    </div>
                  </div>
                ) : (
                  <div className="karen-panel-actions">
                    <button className="btn" onClick={() => setPanel(null)}>Cancel</button>
                    <button className="btn primary" onClick={onStructure} disabled={busy || !note.trim()}>
                      Structure with Karen
                    </button>
                  </div>
                )}
              </div>
            )}

            {busy && <div className="karen-thinking">Karen is working…</div>}
          </div>

          <div className="karen-actions">
            <button className="karen-chip" onClick={onBrief} disabled={busy}>
              <IconCalendarTime stroke={1.75} /> Today's brief
            </button>
            <button className="karen-chip" onClick={() => { setDraft(null); setPanel('summarize'); }} disabled={busy}>
              <IconBuildingChurch stroke={1.75} /> Summarize a church
            </button>
            <button className="karen-chip" onClick={() => { setDraft(null); setPanel('draft'); }} disabled={busy}>
              <IconMailForward stroke={1.75} /> Draft follow-up
            </button>
            <button className="karen-chip" onClick={() => { setDraft(null); setPanel('capture'); }} disabled={busy}>
              <IconClipboardText stroke={1.75} /> Capture interaction
            </button>
          </div>

          <div className="karen-ask">
            <input
              type="text"
              placeholder="Ask Karen about your portfolio…"
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
