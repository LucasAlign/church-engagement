// Export and import modals for the full church data set (Excel workbook or
// per-type CSV). Import shows a preview of every parsed row so the user can
// choose exactly which adds/updates to apply.
import { useRef, useState } from 'react';
import { IconFileSpreadsheet, IconUpload } from '@tabler/icons-react';
import { ENTITIES, exportExcel, exportCsv, parseImportFile, applyImport } from '../data/transfer.js';
import { useDb } from '../data/store.jsx';
import { Badge, Modal } from './shared.jsx';

export function ExportModal({ onClose }) {
  const [format, setFormat] = useState('xlsx');
  const [entityKey, setEntityKey] = useState('churches');

  const download = () => {
    if (format === 'xlsx') exportExcel();
    else exportCsv(entityKey);
    onClose();
  };

  return (
    <Modal
      title="Export church data"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={download}>Download</button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">Format</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: 13 }}>
          <input type="radio" name="export-format" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
          Excel workbook — all data, one sheet per type
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <input type="radio" name="export-format" checked={format === 'csv'} onChange={() => setFormat('csv')} />
          CSV — a single data type
        </label>
      </div>
      {format === 'csv' && (
        <div className="field">
          <label className="field-label">Data type</label>
          <select className="select" value={entityKey} onChange={e => setEntityKey(e.target.value)}>
            {ENTITIES.map(ent => <option key={ent.key} value={ent.key}>{ent.sheet}</option>)}
          </select>
        </div>
      )}
    </Modal>
  );
}

const ACTION_BADGE = {
  new: { label: 'New', variant: 'green' },
  update: { label: 'Update', variant: 'blue' },
  unchanged: { label: 'No change', variant: 'gray' },
  error: { label: 'Skipped', variant: 'red' },
};

const rowKey = (group, item) => `${group.sheetName}:${item.idx}`;

export function ImportModal({ onClose }) {
  const { refresh } = useDb();
  const fileRef = useRef(null);
  const [groups, setGroups] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const choose = async file => {
    if (!file) return;
    try {
      const parsed = await parseImportFile(file);
      const defaults = new Set();
      for (const group of parsed) {
        for (const item of group.items) {
          if (item.action === 'new' || item.action === 'update') defaults.add(rowKey(group, item));
        }
      }
      setGroups(parsed);
      setSelected(defaults);
      setError(parsed.some(g => g.items.length) ? null : 'No importable rows found in that file.');
    } catch {
      setError('Could not read that file. Use a .xlsx or .csv exported from this app.');
    }
  };

  const toggle = key => setSelected(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const toggleGroup = group => {
    const keys = group.items
      .filter(i => i.action === 'new' || i.action === 'update')
      .map(i => rowKey(group, i));
    const allOn = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      for (const k of keys) allOn ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const apply = () => {
    const summary = applyImport(groups, selected);
    refresh();
    setResult(summary);
  };

  if (result) {
    return (
      <Modal title="Import complete" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
        <p style={{ fontSize: 13.5 }}>
          Added {result.created} {result.created === 1 ? 'record' : 'records'} and
          updated {result.updated} {result.updated === 1 ? 'record' : 'records'}.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Import church data"
      onClose={onClose}
      wide={!!groups}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          {groups && (
            <button className="btn primary" onClick={apply} disabled={selected.size === 0}>
              Import {selected.size} {selected.size === 1 ? 'row' : 'rows'}
            </button>
          )}
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => choose(e.target.files[0])}
      />
      {!groups && (
        <div
          className="dropzone"
          style={{ cursor: 'pointer' }}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}
        >
          <IconUpload stroke={1.5} />
          <div>Drop a .xlsx or .csv file here, or click to browse.</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>
            Use the Export button to download a template with the expected columns.
          </div>
        </div>
      )}
      {error && <p style={{ color: 'var(--red-600, #c0392b)', fontSize: 13, marginTop: 10 }}>{error}</p>}
      {groups && groups.map(group => (
        <div key={group.sheetName} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <IconFileSpreadsheet stroke={1.5} style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {group.entity ? group.entity.sheet : group.sheetName}
            </span>
            <span className="text-secondary" style={{ fontSize: 12 }}>
              {group.error || `${group.items.length} ${group.items.length === 1 ? 'row' : 'rows'}`}
            </span>
            {group.entity && group.items.some(i => i.action === 'new' || i.action === 'update') && (
              <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => toggleGroup(group)}>
                Toggle all
              </button>
            )}
          </div>
          {group.items.length > 0 && (
            <table className="data-table">
              <tbody>
                {group.items.map(item => {
                  const key = rowKey(group, item);
                  const badge = ACTION_BADGE[item.action];
                  const selectable = item.action === 'new' || item.action === 'update';
                  return (
                    <tr key={key}>
                      <td style={{ width: 32 }}>
                        <input
                          type="checkbox"
                          className="checkbox"
                          disabled={!selectable}
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.label}</td>
                      <td style={{ width: 90 }}><Badge label={badge.label} variant={badge.variant} /></td>
                      <td className="cell-muted" style={{ fontSize: 12 }}>
                        {item.action === 'update' && `Changes: ${item.changes.join(', ')}`}
                        {item.action === 'error' && item.reason}
                        {item.action === 'new' && item.churchName && `New church: ${item.churchName}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </Modal>
  );
}

export default function ImportExportModals({ mode, onClose }) {
  return mode === 'import' ? <ImportModal onClose={onClose} /> : <ExportModal onClose={onClose} />;
}
