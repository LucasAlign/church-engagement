import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconDownload, IconPrinter } from '@tabler/icons-react';
import { compileAnnualImpactReport, TODAY } from '../data/helpers.js';
import { fmtMoney } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, EmptyState, MetricCard } from '../components/shared.jsx';
import { useDb } from '../data/store.jsx';

const currentYear = Number(TODAY.slice(0, 4));

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCompilation(compilation) {
  const headings = ['Church', 'Status', 'Interactions', 'Active ministries', 'Care communities', 'Active advocates', 'Giving', 'Summary', 'Highlights'];
  const rows = compilation.churches.map(item => [
    item.church.name,
    item.report ? 'Complete' : 'Missing',
    item.interactions,
    item.ministries,
    item.careCommunities,
    item.advocates,
    item.giving,
    item.report?.summary || item.report?.notes || '',
    item.report?.highlights || '',
  ]);
  const csv = [headings, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `impact-report-${compilation.year}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ImpactReports() {
  useDb();
  const [year, setYear] = useState(currentYear - 1);
  const compilation = compileAnnualImpactReport(year);
  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);
  const completion = compilation.churches.length
    ? Math.round((compilation.completed / compilation.churches.length) * 100)
    : 0;

  return (
    <>
      <Header
        title="Impact reports"
        subtitle="Annual church impact, compiled automatically from church records"
        actions={(
          <>
            <label className="report-year-picker">
              <span>Reporting year</span>
              <select className="select" value={year} onChange={event => setYear(Number(event.target.value))}>
                {years.map(option => <option value={option} key={option}>{option}</option>)}
              </select>
            </label>
            <button className="btn" type="button" onClick={() => window.print()}><IconPrinter /> Print</button>
            <button className="btn primary" type="button" onClick={() => downloadCompilation(compilation)} disabled={!compilation.churches.length}>
              <IconDownload /> Export CSV
            </button>
          </>
        )}
      />

      {!compilation.churches.length ? (
        <div className="card"><EmptyState title="No churches to report on" sub="Add churches first, then their yearly impact will appear here automatically." /></div>
      ) : (
        <>
          <div className="metric-grid impact-overview">
            <MetricCard label="Church reports complete" value={`${compilation.completed}/${compilation.churches.length}`} sub={`${completion}% complete`} />
            <MetricCard label="Interactions" value={compilation.interactions} sub={`During ${year}`} />
            <MetricCard label="Active ministries" value={compilation.ministries} sub="Across all churches" />
            <MetricCard label="Total giving" value={fmtMoney(compilation.giving)} sub={`Recorded in ${year}`} />
          </div>

          <section className="card impact-compilation" aria-label={`${year} church impact compilation`}>
            <div className="card-header impact-compilation-header">
              <div>
                <div className="card-title">{year} church reports</div>
                <div className="card-subtitle">{compilation.missing} still need a church summary</div>
              </div>
              <div className="impact-progress" aria-label={`${completion}% complete`}>
                <span style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CHURCH</th>
                    <th>STATUS</th>
                    <th>INTERACTIONS</th>
                    <th>MINISTRIES</th>
                    <th>CARE COMMUNITIES</th>
                    <th>ADVOCATES</th>
                    <th>GIVING</th>
                  </tr>
                </thead>
                <tbody>
                  {compilation.churches.map(item => (
                    <tr key={item.church.id}>
                      <td>
                        <Link className="table-primary" to={`/churches/${item.church.id}`}>{item.church.name}</Link>
                        <div className="cell-muted impact-summary-preview">
                          {item.report?.summary || item.report?.notes || 'Add the annual summary from the church profile.'}
                        </div>
                      </td>
                      <td><Badge label={item.report ? 'Complete' : 'Missing'} variant={item.report ? 'green' : 'amber'} /></td>
                      <td>{item.interactions}</td>
                      <td>{item.ministries}</td>
                      <td>{item.careCommunities}</td>
                      <td>{item.advocates}</td>
                      <td>{fmtMoney(item.giving)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
