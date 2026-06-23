import db from '../data/db.js';
import { getPipelineCounts } from '../data/helpers.js';
import { ENGAGEMENT_STATUS, ENGAGEMENT_STATUS_ORDER, ENGAGEMENT_MINISTRIES } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { CSSBarChart, EmptyState } from '../components/shared.jsx';

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key == null) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function isNonDenominational(d) {
  return typeof d === 'string' && /non.?denominational/i.test(d.trim());
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
  const hasData = db.churches.length > 0;

  // 1. Church Engagement — counts by engagement status, colored by status variant.
  const pipeline = getPipelineCounts();
  const engagementData = ENGAGEMENT_STATUS_ORDER.map(status => {
    const found = pipeline.find(p => p.stage === status);
    return {
      label: ENGAGEMENT_STATUS[status].label,
      value: found ? found.count : 0,
      color: ENGAGEMENT_STATUS[status].variant,
    };
  });

  // 2. Churches Engaged by Ministry — distinct active churches per program.
  const activeEngagements = db.ministryEngagements.filter(m => m.status === 'active');
  const ministryBars = [];
  const ministryPlaceholders = [];
  for (const program of ENGAGEMENT_MINISTRIES) {
    if (program.matchKeys.length === 0) {
      ministryPlaceholders.push(program);
      continue;
    }
    const churchIds = new Set(
      activeEngagements
        .filter(m => program.matchKeys.includes(m.ministry))
        .map(m => m.churchId),
    );
    ministryBars.push({ label: program.label, value: churchIds.size });
  }
  ministryBars.sort((a, b) => b.value - a.value);

  // 3. Churches by Denomination — non-denominational highlighted + partnering annotation.
  const denomCounts = countBy(db.churches, c => c.denomination);
  const denomData = Object.entries(denomCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => {
      if (isNonDenominational(label)) {
        const partnering = db.churches.filter(
          c => isNonDenominational(c.denomination) && c.engagementStatus === 'partnering',
        ).length;
        return {
          label: `${label} (${partnering} partnering)`,
          value,
          color: 'green',
        };
      }
      return { label, value, color: 'blue' };
    });

  if (!hasData) {
    return (
      <>
        <Header title="Analytics" subtitle="Berks County — aggregate engagement metrics" />
        <EmptyState
          title="No data yet"
          sub="Import church data or create churches manually to see analytics."
        />
      </>
    );
  }

  return (
    <>
      <Header title="Analytics" subtitle="Berks County — aggregate engagement metrics" />
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <ChartCard title="Church Engagement">
          <CSSBarChart data={engagementData} />
        </ChartCard>

        <ChartCard title="Churches Engaged by Ministry">
          <CSSBarChart color="green" data={ministryBars} />
          {ministryPlaceholders.length > 0 && (
            <div className="analytics-placeholders">
              {ministryPlaceholders.map(p => (
                <div className="analytics-chip" key={p.key}>
                  <span className="analytics-chip-label">{p.label}</span>
                  <span className="analytics-chip-sub">feature request — needs data source</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Churches by Denomination (Berks County)">
          <CSSBarChart data={denomData} />
        </ChartCard>

        <ChartCard title="Engagement Map — coming soon">
          <div className="analytics-map-placeholder">
            <div className="analytics-map-title">Berks County engagement map</div>
            <div className="analytics-map-body">
              A planned interactive map of Berks County with partnering churches lit up as
              dots. Toggle by year to visualize how partnerships have grown across the county
              over time. Coming soon.
            </div>
          </div>
        </ChartCard>
      </div>
    </>
  );
}
