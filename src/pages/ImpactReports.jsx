import { useState } from 'react';
import { IconFileTypePdf, IconAlertTriangle, IconCloudUpload, IconUpload } from '@tabler/icons-react';
import db from '../data/db.js';
import { getChurchById, getUserById, getMissingReports } from '../data/helpers.js';
import { fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';

export default function ImpactReports() {
  const [churchId, setChurchId] = useState(db.churches[0].id);
  const [year, setYear] = useState('2025');
  const reports = [...db.impactReports].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const missing = getMissingReports(2025);

  return (
    <>
      <Header
        title="Impact reports"
        subtitle={`${reports.length} reports on file · ${missing.length} missing from partner churches`}
      />
      <div className="grid-2" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>
        <div className="reports-stack">
          {reports.map(r => {
            const church = getChurchById(r.churchId);
            const uploader = getUserById(r.uploadedBy);
            return (
              <div className="card report-card" key={r.id}>
                <div className="rc-icon"><IconFileTypePdf stroke={1.75} /></div>
                <div>
                  <div className="rc-title">{church?.name} — {r.year} impact report</div>
                  <div className="rc-meta">Uploaded {fmtDate(r.uploadedAt)} by {uploader?.name} · {r.fileSizeMb} MB</div>
                </div>
                <div className="rc-actions">
                  <button className="btn sm">View</button>
                  <button className="btn sm">Download</button>
                  <button className="btn sm">Replace</button>
                </div>
              </div>
            );
          })}
          {missing.map(church => (
            <div className="card report-card" key={church.id}>
              <div className="rc-icon warn"><IconAlertTriangle stroke={1.75} /></div>
              <div>
                <div className="rc-title">{church.name} — 2025 impact report</div>
                <div className="rc-meta">Not yet uploaded — partner church</div>
              </div>
              <div className="rc-actions">
                <button className="btn sm primary">Request</button>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Upload a report</h3>
          <div className="dropzone" style={{ marginBottom: 12 }}>
            <IconCloudUpload stroke={1.5} />
            <div>Drag and drop a PDF here, or click to browse</div>
          </div>
          <div className="field">
            <label className="field-label">Church</label>
            <select className="select" value={churchId} onChange={e => setChurchId(e.target.value)}>
              {db.churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Report year</label>
            <select className="select" value={year} onChange={e => setYear(e.target.value)}>
              {['2025', '2024', '2023', '2022'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>
            <IconUpload stroke={2} /> Upload report
          </button>
        </div>
      </div>
    </>
  );
}
