import { Link } from 'react-router-dom';
import db from '../data/db.js';
import { getGivingStats, getTopGivingPartners, getGivingStatusBreakdown, getChurchById } from '../data/helpers.js';
import { GIVING_TYPE, GIVING_STATUS, fmtDate, fmtMoney } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, MetricCard, CSSBarChart } from '../components/shared.jsx';

const TIER_ORDER = ['major_partner', 'annual_partner', 'monthly_partner', 'occasional'];

export default function Giving() {
  const stats = getGivingStats();
  const partners = getTopGivingPartners(8);
  const breakdown = getGivingStatusBreakdown();
  const recent = [...db.givingRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <>
      <Header title="Giving" subtitle="Financial partnership across all churches" />
      <div className="metric-grid">
        <MetricCard label="Total giving YTD" value={fmtMoney(stats.ytdTotal)} />
        <MetricCard label="This month" value={fmtMoney(stats.thisMonthTotal)} />
        <MetricCard
          label="vs prior year"
          value={stats.vsPriorYearPct === null ? '—' : `${stats.vsPriorYearPct > 0 ? '+' : ''}${stats.vsPriorYearPct}%`}
          sub="Year to date vs full prior year"
        />
        <MetricCard label="Average gift size" value={fmtMoney(stats.avgGift)} />
      </div>

      <div className="card section">
        <div className="card-header"><div className="card-title">Top partners (YTD)</div></div>
        <div className="card-pad">
          <CSSBarChart
            color="green"
            data={partners.map(p => ({ label: p.church?.name, value: p.total }))}
            format={fmtMoney}
          />
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Giving status breakdown</h3>
        <div className="tile-row">
          {TIER_ORDER.map(tier => (
            <div className="card status-tile" key={tier}>
              <div className="st-count">{breakdown[tier]}</div>
              <div className="st-label"><Badge label={GIVING_STATUS[tier].label} variant={GIVING_STATUS[tier].variant} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header"><div className="card-title">Recent gifts</div></div>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Church</th><th>Amount</th><th>Type</th></tr>
          </thead>
          <tbody>
            {recent.map(g => {
              const type = GIVING_TYPE[g.type];
              return (
                <tr key={g.id}>
                  <td className="cell-muted">{fmtDate(g.date)}</td>
                  <td><Link to={`/churches/${g.churchId}`}>{getChurchById(g.churchId)?.name}</Link></td>
                  <td style={{ fontWeight: 500 }}>{fmtMoney(g.amount)}</td>
                  <td><Badge label={type.label} variant={type.variant} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
