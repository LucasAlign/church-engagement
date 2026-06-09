import db from '../data/db.js';
import { PIPELINE_STAGES, getPipelineCounts } from '../data/helpers.js';
import { ENGAGEMENT_STATUS, INTERACTION_TYPE, MINISTRY_TYPE, fmtMoney } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { CSSBarChart } from '../components/shared.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STAGE_COLORS = {
  not_contacted: 'gray', initial_contact: 'blue', interested: 'amber',
  active_partner: 'green', strategic_partner: 'purple', dormant: 'gray',
};

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key == null) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">{title}</div></div>
      <div className="card-pad">{children}</div>
    </div>
  );
}

export default function Analytics() {
  const pipeline = getPipelineCounts();

  const ministryCounts = countBy(
    db.ministryEngagements.filter(m => m.status === 'active'),
    m => m.ministry,
  );
  const ministryData = Object.entries(ministryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ label: MINISTRY_TYPE[key], value }));

  const denomCounts = countBy(db.churches, c => c.denomination);
  const denomData = Object.entries(denomCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const monthCount = 6; // Jan–Jun 2026
  const newByMonth = MONTHS.slice(0, monthCount).map((label, idx) => ({
    label: `${label} 2026`,
    value: db.churches.filter(c => c.firstContactDate.startsWith(`2026-${String(idx + 1).padStart(2, '0')}`)).length,
  }));

  const givingByMonth = MONTHS.slice(0, monthCount).map((label, idx) => ({
    label: `${label} 2026`,
    value: db.givingRecords
      .filter(g => g.date.startsWith(`2026-${String(idx + 1).padStart(2, '0')}`))
      .reduce((s, g) => s + g.amount, 0),
  }));

  const typeCounts = countBy(db.interactions, i => i.type);
  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ label: INTERACTION_TYPE[key].label, value }));

  return (
    <>
      <Header title="Analytics" subtitle="Berks County — aggregate engagement metrics" />
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <ChartCard title="Engagement status distribution">
          <CSSBarChart
            data={pipeline.map(({ stage, count }) => ({
              label: ENGAGEMENT_STATUS[stage].label,
              value: count,
              color: STAGE_COLORS[stage],
            }))}
          />
        </ChartCard>
        <ChartCard title="Ministry participation (active churches)">
          <CSSBarChart color="green" data={ministryData} />
        </ChartCard>
        <ChartCard title="Churches by denomination">
          <CSSBarChart color="purple" data={denomData} />
        </ChartCard>
        <ChartCard title="New relationships by month (2026)">
          <CSSBarChart color="blue" data={newByMonth} />
        </ChartCard>
        <ChartCard title="Giving trends (monthly totals, 2026)">
          <CSSBarChart color="green" data={givingByMonth} format={fmtMoney} />
        </ChartCard>
        <ChartCard title="Interaction volume by type">
          <CSSBarChart color="blue" data={typeData} />
        </ChartCard>
      </div>
    </>
  );
}
