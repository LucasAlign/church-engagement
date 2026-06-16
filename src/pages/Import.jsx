import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCloudUpload, IconFileTypeCsv, IconCircleCheck, IconArrowRight } from '@tabler/icons-react';
import { importChurches } from '../data/helpers.js';
import { ENGAGEMENT_STATUS } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { useDb } from '../data/store.jsx';
import { Badge } from '../components/shared.jsx';

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines[0] && lines[0].charCodeAt(0) === 0xfeff) lines[0] = lines[0].slice(1);

  function parseLine(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let value = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { value += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { value += line[i++]; }
        }
        fields.push(value);
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i).trim()); break; }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return fields;
  }

  if (!lines[0]?.trim()) return [];
  const headers = parseLine(lines[0]).map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, j) => { row[h] = (values[j] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function attendanceDisplay(row) {
  const min = row.attendance_min || row.attendancemin || '';
  const max = row.attendance_max || row.attendancemax || '';
  if (!min && !max) return '—';
  if (min && max) return `${min}–${max}`;
  return min || max;
}

export default function Import() {
  const navigate = useNavigate();
  const { refresh } = useDb();
  const [stage, setStage] = useState('idle');
  const [rows, setRows] = useState([]);
  const [filename, setFilename] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  function loadFile(file) {
    if (!file) return;
    setParseError('');
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please upload a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        const valid = parsed.filter(r => r.name);
        if (!parsed.length) { setParseError('The file appears to be empty or has no header row.'); return; }
        if (!valid.length) { setParseError('No rows with a "name" column found. Check that the CSV header matches the expected format.'); return; }
        setRows(valid);
        setFilename(file.name);
        setStage('preview');
      } catch {
        setParseError('Could not parse the file. Make sure it is a valid CSV.');
      }
    };
    reader.readAsText(file);
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    loadFile(e.dataTransfer.files[0]);
  }, []);

  function handleImport() {
    const count = importChurches(rows);
    setImportedCount(count);
    refresh();
    setStage('success');
  }

  function reset() {
    setRows([]);
    setFilename('');
    setParseError('');
    setStage('idle');
  }

  if (stage === 'success') {
    return (
      <>
        <Header title="Import churches" />
        <div className="card card-pad import-success">
          <div className="import-success-icon">
            <IconCircleCheck stroke={1.5} />
          </div>
          <div className="import-success-count">{importedCount} churches imported</div>
          <div className="import-success-sub">
            Churches are now visible in the Churches directory.
          </div>
          <div className="import-success-actions">
            <button className="btn primary" onClick={() => navigate('/churches')}>
              View Churches <IconArrowRight stroke={2} />
            </button>
            <button className="btn" onClick={reset}>Import another file</button>
          </div>
        </div>
      </>
    );
  }

  if (stage === 'preview') {
    return (
      <>
        <Header
          title="Import churches"
          subtitle={`${rows.length} churches from ${filename} — review before importing`}
        />
        <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Denomination</th>
                  <th>Status</th>
                  <th>Lead pastor</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const statusKey = ENGAGEMENT_STATUS[row.engagement_status]
                    ? row.engagement_status
                    : 'not_contacted';
                  const status = ENGAGEMENT_STATUS[statusKey];
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td className="cell-muted">{row.city || '—'}</td>
                      <td className="cell-muted">{row.denomination || '—'}</td>
                      <td><Badge label={status.label} variant={status.variant} /></td>
                      <td className="cell-muted">{row.lead_pastor || '—'}</td>
                      <td className="cell-muted">{attendanceDisplay(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={reset}>Cancel</button>
          <button className="btn primary" onClick={handleImport}>
            Import {rows.length} churches
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Import churches"
        subtitle="Bulk-import churches from a CSV file"
      />
      <div
        className={`dropzone import-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => loadFile(e.target.files[0])}
        />
        <IconCloudUpload stroke={1.5} />
        <div style={{ fontWeight: 500, marginTop: 8 }}>
          Drag and drop a CSV here, or click to browse
        </div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>
          Supports .csv files exported from Excel or Google Sheets
        </div>
        {parseError && (
          <div className="import-parse-error">{parseError}</div>
        )}
      </div>

      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <IconFileTypeCsv stroke={1.5} style={{ width: 18, height: 18, color: 'var(--text-tertiary)' }} />
          <span className="section-title" style={{ marginBottom: 0 }}>Expected columns</span>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
          name, address, city, state, zip, phone, email, website,<br />
          denomination, lead_pastor, other_staff, attendance_min,<br />
          attendance_max, engagement_status, notes
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <strong>other_staff</strong> — semicolon-separated for multiple people (e.g. <em>Jane Smith; Bob Lee</em>)<br />
          <strong>engagement_status</strong> — one of: not_contacted, initial_contact, interested, active_partner, strategic_partner, dormant
        </div>
      </div>
    </>
  );
}
