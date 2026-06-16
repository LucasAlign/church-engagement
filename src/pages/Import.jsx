import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconUpload, IconFileSpreadsheet, IconCheck, IconX, IconBuildingChurch } from '@tabler/icons-react';
import { Header } from '../components/layout.jsx';
import { Badge } from '../components/shared.jsx';
import { importChurches } from '../data/helpers.js';
import { ENGAGEMENT_STATUS } from '../data/labels.js';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { vals.push(cur); cur = ''; }
      else { cur += ch; }
    }
    vals.push(cur);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  }).filter(r => r.name);
}

function statusBadge(raw) {
  const key = raw || 'not_contacted';
  const st = ENGAGEMENT_STATUS[key];
  return st ? <Badge label={st.label} variant={st.variant} /> : <span className="cell-muted">{raw || '—'}</span>;
}

export default function Import() {
  const navigate = useNavigate();
  const inputRef = useRef();
  const [rows, setRows] = useState(null);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setRows(parseCSV(e.target.result));
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleConfirm() {
    const count = importChurches(rows);
    setImportedCount(count);
    setDone(true);
  }

  if (done) {
    return (
      <>
        <Header title="Import CSV" />
        <div className="card" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IconCheck stroke={2.5} style={{ color: 'var(--green-400)', width: 28, height: 28 }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Import complete</div>
          <div className="cell-muted" style={{ marginBottom: 28 }}>
            {importedCount} {importedCount === 1 ? 'church' : 'churches'} added to Flock.
          </div>
          <button className="btn primary" onClick={() => navigate('/churches')}>View Churches</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Import CSV"
        subtitle="Upload a CSV to add churches and staff in bulk"
      />

      {!rows && (
        <div
          className={`card import-dropzone${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <IconUpload stroke={1.25} style={{ width: 40, height: 40, color: 'var(--text-tertiary)', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop a CSV file here</div>
          <div className="cell-muted" style={{ marginBottom: 20 }}>or click to browse</div>
          <button className="btn sm" onClick={e => { e.stopPropagation(); inputRef.current.click(); }}>
            <IconFileSpreadsheet stroke={1.75} /> Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {rows && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{rows.length} churches ready to import</span>
                <span className="cell-muted" style={{ marginLeft: 10 }}>
                  Staff contacts will be created for each lead pastor and other staff listed.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm" onClick={() => setRows(null)}>
                  <IconX stroke={1.75} /> Cancel
                </button>
                <button className="btn primary sm" onClick={handleConfirm}>
                  <IconBuildingChurch stroke={1.75} /> Import {rows.length} churches
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Church</th>
                  <th>Denomination</th>
                  <th>Attendance</th>
                  <th>Lead Pastor</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <div className="cell-stack">
                        <div className="cell-primary">{r.name}</div>
                        <div className="cell-secondary">{r.city}{r.state ? `, ${r.state}` : ''}</div>
                      </div>
                    </td>
                    <td className="cell-muted">{r.denomination || '—'}</td>
                    <td className="cell-muted">
                      {r.attendance_min && r.attendance_max
                        ? `${r.attendance_min}–${r.attendance_max}`
                        : r.attendance_min || r.attendance_max || '—'}
                    </td>
                    <td className="cell-muted">{r.lead_pastor || '—'}</td>
                    <td>{statusBadge(r.engagement_status)}</td>
                    <td className="cell-muted" style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
