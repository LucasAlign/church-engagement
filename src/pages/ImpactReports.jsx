import { useRef, useState } from 'react';
import { IconFileTypePdf, IconAlertTriangle, IconCloudUpload, IconUpload } from '@tabler/icons-react';
import db from '../data/db.js';
import {
  getChurchById, getUserById, getMissingReports, addImpactReport,
  replaceImpactReport, addTask, TODAY,
} from '../data/helpers.js';
import { fmtDate } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { useDb } from '../data/store.jsx';

// Seeded reports have no real file behind them; generate a one-page
// placeholder PDF on demand so View/Download still work in the prototype.
function placeholderPdfUrl(title) {
  const text = title.replace(/[()\\]/g, '');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    null, // content stream, built below
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream = `BT /F1 16 Tf 72 720 Td (${text}) Tj 0 -24 Td (Placeholder report for prototype) Tj ET`;
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
}

function reportUrl(report, church) {
  if (report.url && report.url !== '#') return report.url;
  return placeholderPdfUrl(`${church?.name || 'Church'} - ${report.year} impact report`);
}

export default function ImpactReports() {
  const { refresh } = useDb();
  const uploadRef = useRef(null);
  const replaceRef = useRef(null);
  const [churchId, setChurchId] = useState(db.churches[0].id);
  const [year, setYear] = useState('2025');
  const [pendingFile, setPendingFile] = useState(null);
  const [replacing, setReplacing] = useState(null); // report id awaiting a file
  const [requested, setRequested] = useState(new Set());
  const reports = [...db.impactReports].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const missing = getMissingReports(2025);

  const fileMeta = file => ({
    fileName: file.name,
    fileSizeMb: Math.max(Math.round((file.size / 1048576) * 10) / 10, 0.1),
    url: URL.createObjectURL(file),
  });

  const upload = () => {
    if (!pendingFile) {
      uploadRef.current.click();
      return;
    }
    addImpactReport({ churchId, year: Number(year), ...fileMeta(pendingFile) });
    setPendingFile(null);
    refresh();
  };

  const onReplaceFile = file => {
    if (file && replacing) {
      replaceImpactReport(replacing, fileMeta(file));
      refresh();
    }
    setReplacing(null);
  };

  const view = report => {
    window.open(reportUrl(report, getChurchById(report.churchId)), '_blank');
  };

  const download = report => {
    const a = document.createElement('a');
    a.href = reportUrl(report, getChurchById(report.churchId));
    a.download = report.fileName;
    a.click();
  };

  const request = church => {
    addTask({
      churchId: church.id,
      title: 'Request 2025 impact report',
      assignedTo: church.assignedCoordinatorId || 'usr_001',
      dueDate: TODAY,
      priority: 'medium',
    });
    setRequested(prev => new Set(prev).add(church.id));
    refresh();
  };

  return (
    <>
      <Header
        title="Impact reports"
        subtitle={`${reports.length} reports on file · ${missing.length} missing from partner churches`}
      />
      <input
        ref={replaceRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={e => { onReplaceFile(e.target.files[0]); e.target.value = ''; }}
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
                  <button className="btn sm" onClick={() => view(r)}>View</button>
                  <button className="btn sm" onClick={() => download(r)}>Download</button>
                  <button className="btn sm" onClick={() => { setReplacing(r.id); replaceRef.current.click(); }}>Replace</button>
                </div>
              </div>
            );
          })}
          {missing.map(church => (
            <div className="card report-card" key={church.id}>
              <div className="rc-icon warn"><IconAlertTriangle stroke={1.75} /></div>
              <div>
                <div className="rc-title">{church.name} — 2025 impact report</div>
                <div className="rc-meta">
                  {requested.has(church.id)
                    ? 'Request task created for the assigned coordinator'
                    : 'Not yet uploaded — partner church'}
                </div>
              </div>
              <div className="rc-actions">
                <button className="btn sm primary" disabled={requested.has(church.id)} onClick={() => request(church)}>
                  {requested.has(church.id) ? 'Requested' : 'Request'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Upload a report</h3>
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => { setPendingFile(e.target.files[0] || null); e.target.value = ''; }}
          />
          <div
            className="dropzone"
            style={{ marginBottom: 12, cursor: 'pointer' }}
            onClick={() => uploadRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setPendingFile(e.dataTransfer.files[0] || null); }}
          >
            <IconCloudUpload stroke={1.5} />
            <div>{pendingFile ? pendingFile.name : 'Drag and drop a PDF here, or click to browse'}</div>
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
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={upload}>
            <IconUpload stroke={2} /> {pendingFile ? 'Upload report' : 'Choose a PDF'}
          </button>
        </div>
      </div>
    </>
  );
}
