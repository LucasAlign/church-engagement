'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  parchmentBright: '#EEE4C4',
  parchmentBody:   '#D2C7A2',
  parchmentDim:    '#9C9272',
  parchmentFaint:  '#6E664C',
  brassBright:     '#D8AA3E',
  brassBody:       '#C89A34',
  brassDeep:       '#9A7420',
  walnut1:         '#5A3A20',
  walnut2:         '#7A4E2C',
  walnut3:         '#9C6840',
  ink:             '#0C0E07',
};

const font = "'Calibri','Segoe UI','Gill Sans MT','Helvetica Neue',sans-serif";

const glass = {
  background: 'linear-gradient(160deg, rgba(12,14,7,0.82) 0%, rgba(30,22,10,0.75) 100%)',
  border: `1px solid rgba(216,170,62,0.18)`,
  borderRadius: 14,
  boxShadow: '0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(216,170,62,0.12)',
  backdropFilter: 'blur(6px)',
  padding: '16px 18px',
};

const CATEGORIES = ['House','Farm','Signs','Wraparound','Kids','Relationship','Family','Personal'];

const DAILY_VERSES = [
  { ref: 'Ephesians 5:25', text: 'Husbands, love your wives, just as Christ loved the church and gave himself up for her.' },
  { ref: 'Proverbs 16:3',  text: 'Commit to the LORD whatever you do, and he will establish your plans.' },
  { ref: 'Colossians 3:23', text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.' },
  { ref: 'Joshua 1:9',     text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.' },
  { ref: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.' },
  { ref: 'Psalm 90:12',    text: 'Teach us to number our days, that we may gain a heart of wisdom.' },
  { ref: 'Proverbs 27:17', text: 'As iron sharpens iron, so one person sharpens another.' },
];

function getDailyVerse() {
  const d = new Date();
  return DAILY_VERSES[(d.getDate() + d.getMonth()) % DAILY_VERSES.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerseCard() {
  const v = getDailyVerse();
  return (
    <div style={{
      ...glass,
      border: `1px solid ${C.brassBright}`,
      boxShadow: `0 0 18px rgba(216,170,62,0.22), 0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(216,170,62,0.2)`,
      textAlign: 'center',
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: C.brassBody, textTransform: 'uppercase', marginBottom: 8 }}>
        Verse of the Day
      </div>
      <div style={{ fontSize: 15, color: C.parchmentBright, lineHeight: 1.55, marginBottom: 8 }}>
        "{v.text}"
      </div>
      <div style={{ fontSize: 12, color: C.brassBody }}>— {v.ref}</div>
    </div>
  );
}

function MarriageCard({ intention, onChange, onSave }) {
  return (
    <div style={{ ...glass, marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: C.brassBody, textTransform: 'uppercase', marginBottom: 8 }}>
        Marriage Intention
      </div>
      <textarea
        value={intention}
        onChange={e => onChange(e.target.value)}
        onBlur={onSave}
        placeholder="How will you love her well today?"
        rows={2}
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          color: C.parchmentBody, fontSize: 14, fontFamily: font,
          resize: 'none', textAlign: 'center', lineHeight: 1.5,
        }}
      />
    </div>
  );
}

function TasksCard({ tasks, onToggle, onAdd }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Personal');
  const [adding, setAdding] = useState(false);

  function handleAdd() {
    if (!text.trim()) return;
    onAdd(text.trim(), category);
    setText('');
    setAdding(false);
  }

  const top3 = tasks.slice(0, 3);
  const rest  = tasks.slice(3);

  return (
    <div style={{ ...glass, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: C.brassBody, textTransform: 'uppercase' }}>Top 3 Today</div>
        <button onClick={() => setAdding(a => !a)} style={{
          background: 'none', border: `1px solid ${C.brassDeep}`, borderRadius: 6,
          color: C.brassBody, fontSize: 11, padding: '2px 8px', cursor: 'pointer', fontFamily: font,
        }}>+ Add</button>
      </div>

      {top3.length === 0 && !adding && (
        <div style={{ color: C.parchmentFaint, fontSize: 13, padding: '6px 0' }}>No open tasks — add one.</div>
      )}

      {top3.map(t => (
        <TaskRow key={t.id} task={t} onToggle={onToggle} />
      ))}

      {rest.length > 0 && (
        <>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: C.parchmentFaint, textTransform: 'uppercase', margin: '10px 0 6px' }}>Coming Up</div>
          {rest.map(t => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} dim />
          ))}
        </>
      )}

      {adding && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="What needs to get done?"
            style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.walnut2}`,
              borderRadius: 6, padding: '7px 10px', color: C.parchmentBody, fontSize: 13,
              fontFamily: font, outline: 'none', width: '100%',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{
              flex: 1, background: 'rgba(0,0,0,0.4)', border: `1px solid ${C.walnut2}`,
              borderRadius: 6, padding: '6px 8px', color: C.parchmentBody, fontSize: 12,
              fontFamily: font, outline: 'none',
            }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleAdd} style={{
              background: C.brassDeep, border: 'none', borderRadius: 6,
              color: C.parchmentBright, fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontFamily: font,
            }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, dim }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid rgba(110,100,76,0.15)` }}>
      <button
        onClick={() => onToggle(task.id, !task.done)}
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1.5px solid ${task.done ? C.brassBright : C.parchmentFaint}`,
          background: task.done ? C.brassDeep : 'transparent',
          cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {task.done && <span style={{ color: C.parchmentBright, fontSize: 10 }}>✓</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13, color: dim ? C.parchmentDim : (task.done ? C.parchmentFaint : C.parchmentBody),
          textDecoration: task.done ? 'line-through' : 'none',
          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{task.text}</span>
      </div>
      <span style={{ fontSize: 10, color: C.parchmentFaint, flexShrink: 0 }}>{task.category}</span>
      {task.partial && <span style={{ fontSize: 9, color: C.brassDeep, background: 'rgba(154,116,32,0.15)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>80%</span>}
    </div>
  );
}

function JournalCard({ reflect, commitText, onReflectChange, onCommitChange, onSave }) {
  return (
    <div style={{ ...glass, marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: C.brassBody, textTransform: 'uppercase', marginBottom: 10 }}>Daily Journal</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: C.parchmentDim, marginBottom: 4 }}>Reflection</div>
        <textarea
          value={reflect}
          onChange={e => onReflectChange(e.target.value)}
          onBlur={onSave}
          placeholder="What's on your mind today?"
          rows={2}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.walnut1}`,
            borderRadius: 6, padding: '8px 10px', color: C.parchmentBody, fontSize: 13,
            fontFamily: font, resize: 'none', outline: 'none', lineHeight: 1.5,
          }}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.parchmentDim, marginBottom: 4 }}>Commitment</div>
        <textarea
          value={commitText}
          onChange={e => onCommitChange(e.target.value)}
          onBlur={onSave}
          placeholder="What are you committing to today?"
          rows={2}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.walnut1}`,
            borderRadius: 6, padding: '8px 10px', color: C.parchmentBody, fontSize: 13,
            fontFamily: font, resize: 'none', outline: 'none', lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}

function ChatCard({ journal }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, todayJournal: journal }),
      });
      const { reply } = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Something went wrong. Try again." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ ...glass, marginBottom: 80 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: C.brassBody, textTransform: 'uppercase', marginBottom: 10 }}>Message Arlo</div>

      {messages.length === 0 && (
        <div style={{ color: C.parchmentFaint, fontSize: 13, marginBottom: 10 }}>
          Talk to Arlo — he remembers what you've shared.
        </div>
      )}

      <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            background: m.role === 'user'
              ? `linear-gradient(135deg, ${C.brassDeep}, ${C.walnut2})`
              : 'rgba(255,255,255,0.06)',
            border: m.role === 'assistant' ? `1px solid rgba(216,170,62,0.15)` : 'none',
            borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding: '8px 12px',
            fontSize: 13,
            color: C.parchmentBody,
            lineHeight: 1.5,
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: C.parchmentFaint, fontSize: 12, padding: '4px 0' }}>
            Arlo is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Say something…"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.walnut2}`,
            borderRadius: 8, padding: '9px 12px', color: C.parchmentBody, fontSize: 13,
            fontFamily: font, outline: 'none',
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: loading ? C.walnut1 : C.brassDeep,
          border: 'none', borderRadius: 8, color: C.parchmentBright,
          fontSize: 13, padding: '9px 16px', cursor: loading ? 'default' : 'pointer', fontFamily: font,
        }}>Send</button>
      </div>
    </div>
  );
}

function BottomNav({ active, onSelect }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: '☀' },
    { id: 'her',   label: 'Her',   icon: '♡' },
    { id: 'work',  label: 'Work',  icon: '⚒' },
    { id: 'arlo',  label: 'Arlo',  icon: 'A' },
    { id: 'week',  label: 'Week',  icon: '▦' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 440,
      background: 'linear-gradient(0deg, rgba(12,14,7,0.97) 80%, transparent)',
      borderTop: `1px solid rgba(216,170,62,0.12)`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 0 14px', zIndex: 100,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: active === t.id ? C.brassBright : C.parchmentFaint,
          fontFamily: font,
        }}>
          <span style={{
            fontSize: t.id === 'arlo' ? 14 : 16,
            ...(t.id === 'arlo' ? {
              border: `1.5px solid ${active === 'arlo' ? C.brassBright : C.parchmentFaint}`,
              borderRadius: '50%', width: 24, height: 24, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            } : {}),
          }}>{t.icon}</span>
          <span style={{ fontSize: 9, letterSpacing: 0.5 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ArloToday() {
  const [tab, setTab] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [journal, setJournal] = useState({ reflect: '', commit_text: '', reflect_prompt: '', commit_prompt: '' });
  const [marriageIntention, setMarriageIntention] = useState('');
  const saveTimer = useRef(null);

  // Load tasks and today's journal on mount
  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks || []));
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/journal?date=${today}`).then(r => r.json()).then(d => {
      if (d.entry) {
        setJournal({ reflect: d.entry.reflect || '', commit_text: d.entry.commit_text || '' });
        setMarriageIntention(d.entry.commit_prompt || '');
      }
    });
  }, []);

  function saveJournal() {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...journal, commit_prompt: marriageIntention }),
      });
    }, 600);
  }

  async function addTask(text, category) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category }),
    });
    const { task } = await res.json();
    setTasks(t => [...t, task]);
  }

  async function toggleTask(id, done) {
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, done }),
    });
    const { task } = await res.json();
    setTasks(t => t.map(x => x.id === id ? task : x).filter(x => !x.done));
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/woodgrain.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      display: 'flex', justifyContent: 'center',
    }}>
      {/* Vignette overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(12,14,7,0.6) 100%)',
        zIndex: 1,
      }} />

      <div style={{
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 2,
        padding: '20px 16px 0',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.parchmentBright, letterSpacing: 0.5 }}>Arlo</div>
            <div style={{ fontSize: 11, color: C.parchmentFaint, letterSpacing: 1 }}>FOCUSED · FAITHFUL · FREE</div>
          </div>
          <div style={{ fontSize: 12, color: C.parchmentDim, textAlign: 'right' }}>{today}</div>
        </div>

        {tab === 'today' && (
          <>
            <VerseCard />
            <MarriageCard
              intention={marriageIntention}
              onChange={v => { setMarriageIntention(v); saveJournal(); }}
              onSave={saveJournal}
            />
            <TasksCard tasks={tasks} onToggle={toggleTask} onAdd={addTask} />
            <JournalCard
              reflect={journal.reflect}
              commitText={journal.commit_text}
              onReflectChange={v => setJournal(j => ({ ...j, reflect: v }))}
              onCommitChange={v => setJournal(j => ({ ...j, commit_text: v }))}
              onSave={saveJournal}
            />
            <ChatCard journal={journal} />
          </>
        )}

        {tab !== 'today' && (
          <div style={{ ...glass, textAlign: 'center', marginTop: 60, color: C.parchmentFaint }}>
            <div style={{ fontSize: 16, marginBottom: 8, color: C.parchmentDim }}>Coming in Phase 4</div>
            <div style={{ fontSize: 13 }}>Finish Phase 1 first — stay on Today.</div>
          </div>
        )}

        <BottomNav active={tab} onSelect={setTab} />
      </div>
    </div>
  );
}
