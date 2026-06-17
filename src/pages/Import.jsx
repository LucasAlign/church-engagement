import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCloudUpload, IconFileTypeCsv, IconCircleCheck, IconArrowRight, IconAlertCircle } from '@tabler/icons-react';
import { importChurches } from '../data/helpers.js';
import { ENGAGEMENT_STATUS } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { useDb } from '../data/store.jsx';
import { Badge } from '../components/shared.jsx';

// ---------------------------------------------------------------------------
// CSV parsing — handles quoted fields, BOM, CRLF
// ---------------------------------------------------------------------------
function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  // Strip UTF-8 BOM
  if (lines.length > 0 && lines[0].charCodeAt(0) === 0xfeff) {
    lines[0] = lines[0].slice(1);
  }

  function parseLine(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let value = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            value += line[i++];
          }
        }
        fields.push(value);
        if (line[i] === ',') i++;
      } else {
        // Unquoted field
        const end = line.indexOf(',', i);
        if (end === -1) {
          fields.push(line.slice(i).trim());
          break;
        }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return fields;
  }

  const headerLine = lines[0]?.trim();
  if (!headerLine) return [];

  const headers = parseLine(headerLine).map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, j) => {
      row[h] = (values[j] !== undefined ? values[j] : '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function attendanceLabel(row) {
  const min = row.attendance_min || '';
  const max = row.attendance_max || '';
  if (min && max) return `${min}–${max}`;
  return min || max || '—';
}

function statusForRow(row) {
  const key = row.engagement_status || '';
  return ENGAGEMENT_STATUS[key] ? ENGAGEMENT_STATUS[key] : ENGAGEMENT_STATUS.not_contacted;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------
function DropZone({ onFile, parseError, dragOver, setDragOver }) {
  const inputRef = useRef();

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) onFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <>
      <div
        className={`dropzone import-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current && inputRef.current.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <IconCloudUpload stroke={1.5} />
        <div style={{ fontWeight: 500, marginTop: 8 }}>
          Drag and drop a CSV here, or click to browse
        </div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>
          Supports .csv files exported from Excel or Google Sheets
        </div>
        {parseError && (
          <div className="import-parse-error">
            <IconAlertCircle stroke={1.75} style={{ width: 14, height: 14, flexShrink: 0 }} />
            {parseError}
          </div>
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
          <strong>engagement_status</strong> — not_contacted, initial_contact, interested, active_partner, strategic_partner, dormant
        </div>
      </div>
    </>
  );
}

function PreviewTable({ rows, filename, onImport, onCancel }) {
  return (
    <>
      <Header
        title="Review import"
        subtitle={`${rows.length} church${rows.length !== 1 ? 'es' : ''} from ${filename}`}
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
              {rows.map((row, idx) => {
                const status = statusForRow(row);
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 500 }}>{row.name || '—'}</td>
                    <td className="cell-muted">{row.city || '—'}</td>
                    <td className="cell-muted">{row.denomination || '—'}</td>
                    <td><Badge label={status.label} variant={status.variant} /></td>
                    <td className="cell-muted">{row.lead_pastor || '—'}</td>
                    <td className="cell-muted">{attendanceLabel(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={onImport}>
          Import {rows.length} church{rows.length !== 1 ? 'es' : ''}
        </button>
      </div>
    </>
  );
}

function SuccessScreen({ count, onReset, onGoToChurches }) {
  return (
    <>
      <Header title="Import complete" />
      <div className="card card-pad import-success">
        <div className="import-success-icon">
          <IconCircleCheck stroke={1.5} />
        </div>
        <div className="import-success-count">
          {count} church{count !== 1 ? 'es' : ''} imported
        </div>
        <div className="import-success-sub">
          They are now visible in the Churches directory.
        </div>
        <div className="import-success-actions">
          <button className="btn primary" onClick={onGoToChurches}>
            View Churches <IconArrowRight stroke={2} />
          </button>
          <button className="btn" onClick={onReset}>Import another file</button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Import() {
  const navigate = useNavigate();
  const { refresh } = useDb();

  const [stage, setStage] = useState('idle'); // 'idle' | 'preview' | 'success'
  const [rows, setRows] = useState([]);
  const [filename, setFilename] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file) {
    setParseError('');
    const reader = new FileReader();
    reader.onerror = () => setParseError('Could not read the file. Please try again.');
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setParseError('The file appears to be empty or has no data rows after the header.');
          return;
        }
        const valid = parsed.filter(r => r.name);
        if (valid.length === 0) {
          setParseError('No "name" column found. Make sure the first row contains column headers including "name".');
          return;
        }
        setRows(valid);
        setFilename(file.name);
        setStage('preview');
      } catch (err) {
        setParseError('Could not parse the file. Make sure it is a valid CSV.');
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    const count = importChurches(rows);
    setImportedCount(count);
    refresh();
    setStage('success');
  }

  function handleReset() {
    setRows([]);
    setFilename('');
    setParseError('');
    setStage('idle');
  }

  if (stage === 'success') {
    return (
      <SuccessScreen
        count={importedCount}
        onReset={handleReset}
        onGoToChurches={() => navigate('/churches')}
      />
    );
  }

  if (stage === 'preview') {
    return (
      <PreviewTable
        rows={rows}
        filename={filename}
        onImport={handleImport}
        onCancel={handleReset}
      />
    );
  }

  return (
    <>
      <Header title="Import churches" subtitle="Bulk-import churches from a CSV file" />
      <DropZone
        onFile={handleFile}
        parseError={parseError}
        dragOver={dragOver}
        setDragOver={setDragOver}
      />
    </>
  );
}
