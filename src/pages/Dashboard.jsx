import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconMail, IconPhone, IconUsers, IconCalendarEvent, IconPresentation,
  IconHeartHandshake, IconMessageCircle, IconPlus,
} from '@tabler/icons-react';
import {
  getDashboardStats, getPipelineCounts, getRecentActivity, getAttentionFlags,
  getTopGivingPartners, getChurchById, getUserById, isTaskOverdue, TODAY,
} from '../data/helpers.js';
import db from '../data/db.js';
import { ENGAGEMENT_STATUS, INTERACTION_TYPE, TASK_PRIORITY, fmtDate, fmtMoney } from '../data/labels.js';
import { Header } from '../components/layout.jsx';
import { Badge, MetricCard, CSSBarChart } from '../components/shared.jsx';
import LogInteractionModal from '../components/LogInteractionModal.jsx';
import { useDb } from '../data/store.jsx';

const STAGE_FILLS = {
  not_contacted: 'var(--gray-bg)',
  initial_contact: 'var(--blue-bg)',
  interested: 'var(--amber-bg)',
  active_partner: 'var(--green-bg)',
  strategic_partner: 'var(--purple-bg)',
  dormant: 'var(--gray-bg)',
};
const STAGE_TEXT = {
  not_contacted: 'var(--gray-400)',
  initial_contact: 'var(--blue-400)',
  interested: 'var(--amber-600)',
  active_partner: 'var(--green-400)',
  strategic_partner: 'var(--purple-600)',
  dormant: 'var(--gray-400)',
};

const FEED_ICONS = {
  email: IconMail,
  phone_call: IconPhone,
  meeting: IconUsers,
  lunch: IconUsers,
  event_invitation: IconCalendarEvent,
  presentation: IconPresentation,
  stand_sunday: IconPresentation,
  care_community_meeting: IconUsers,
  volunteer_recruitment: IconUsers,
  training: IconPresentation,
  follow_up: IconMessageCircle,
  giving_conversation: IconHeartHandshake,
};

function PipelineWidget() {
  const counts = getPipelineCounts();
  const total = Math.max(counts.reduce((s, c) => s + c.count, 0), 1);
  return (
    <div className="card section">
      <div className="card-header"><div className="card-title">Engagement pipeline</div></div>
      <div className="card-pad">
        <div className="pipeline-bar">
          {counts.map(({ stage, count }) => (
            <div
              key={stage}
              className="pipeline-segment"
              style={{ background: STAGE_FILLS[stage], color: STAGE_TEXT[stage], flex: Math.max(count, 0.6) / total }}
            >
              <span className="seg-count">{count}</span>
            </div>
          ))}
        </div>
        <div className="pipeline-legend">
          {counts.map(({ stage, count }) => (
            <span key={stage} style={{ flex: Math.max(count, 0.6) / total }}>{ENGAGEMENT_STATUS[stage].label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityWidget() {
  const items = getRecentActivity(5);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Recent activity</div>
        <Link className="card-link" to="/interactions">View all</Link>
      </div>
      <div className="feed">
        {items.map(item => {
          const Icon = FEED_ICONS[item.type] || IconMessageCircle;
          const meta = INTERACTION_TYPE[item.type];
          return (
            <div className="feed-item" key={item.id}>
              <div className="feed-icon" style={{ background: `var(--${meta.variant}-bg)`, color: meta.variant === 'amber' ? 'var(--amber-600)' : meta.variant === 'purple' ? 'var(--purple-600)' : `var(--${meta.variant}-400)` }}>
                <Icon stroke={1.75} />
              </div>
              <div className="feed-body">
                <div className="feed-title">
                  <Link to={`/churches/${item.churchId}`}>{item.church?.name}</Link> · {meta.label}
                </div>
                <div className="feed-meta">{fmtDate(item.date)} · {item.user?.name}</div>
                <div className="feed-notes">{item.notes}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PRIORITY_DOTS = { critical: 'var(--red-400)', high: 'var(--red-400)', medium: 'var(--amber-600)', low: 'var(--gray-400)' };

function FollowUpWidget() {
  const tasks = db.tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Upcoming follow-ups</div>
        <Link className="card-link" to="/follow-ups">View all</Link>
      </div>
      <div>
        {tasks.map(task => {
          const overdue = isTaskOverdue(task);
          const church = getChurchById(task.churchId);
          return (
            <div className={`task-card ${overdue ? 'overdue' : ''}`} key={task.id}>
              <span className="priority-dot" style={{ background: PRIORITY_DOTS[task.priority] }} />
              <div style={{ flex: 1 }}>
                <div className="task-church">{church?.name}</div>
                <div className="task-title">{task.title}</div>
                <div className="task-badges">
                  <span className={`due-badge ${overdue ? 'overdue' : ''}`}>Due {fmtDate(task.dueDate)}</span>
                  <Badge label={TASK_PRIORITY[task.priority].label} variant={TASK_PRIORITY[task.priority].variant} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FLAG_ACTIONS = {
  no_recent_contact: 'Log contact',
  no_leadership: 'Add contact',
  missing_report: 'Request',
  no_coordinator: 'Assign',
};

function AttentionWidget() {
  const navigate = useNavigate();
  const flags = getAttentionFlags();
  return (
    <div className="card section">
      <div className="card-header"><div className="card-title">Churches needing attention</div></div>
      <div>
        {flags.map((flag, i) => {
          const church = getChurchById(flag.churchId);
          return (
            <div className="attention-row" key={`${flag.churchId}-${flag.reason}-${i}`}>
              <div>
                <div className="att-church">{church?.name}</div>
                <div className="att-label">{flag.label}</div>
              </div>
              <button className="btn sm att-action" onClick={() => navigate(`/churches/${flag.churchId}`)}>
                {FLAG_ACTIONS[flag.reason]}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GivingBarWidget() {
  const partners = getTopGivingPartners(6);
  return (
    <div className="card section">
      <div className="card-header">
        <div className="card-title">Giving overview — top partners (YTD)</div>
        <Link className="card-link" to="/giving">View all</Link>
      </div>
      <div className="card-pad">
        <CSSBarChart
          color="green"
          data={partners.map(p => ({ label: p.church?.name, value: p.total }))}
          format={fmtMoney}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDb();
  const [logging, setLogging] = useState(false);
  const stats = getDashboardStats();
  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Berks County · ${fmtDate(TODAY)}`}
        actions={
          <button className="btn primary" onClick={() => setLogging(true)}>
            <IconPlus stroke={2} /> Log interaction
          </button>
        }
      />
      <div className="metric-grid">
        <MetricCard label="Total churches" value={stats.totalChurches} />
        <MetricCard label="Active partner churches" value={stats.activePartners} />
        <MetricCard label="Contacted this month" value={stats.contactedThisMonth} />
        <MetricCard label="Need follow-up" value={stats.needFollowUp} />
        <MetricCard label="Giving this year" value={fmtMoney(stats.totalGivingThisYear)} sub={`${stats.givingThisYear} churches giving`} />
        <MetricCard label="Care Communities" value={stats.careCommunitiesActive} />
        <MetricCard label="New relationships" value={stats.newRelationships} sub="Last 90 days" />
        <MetricCard label="Upcoming meetings" value={stats.upcomingMeetings} />
      </div>
      <PipelineWidget />
      <div className="grid-2 section">
        <ActivityWidget />
        <FollowUpWidget />
      </div>
      <AttentionWidget />
      <GivingBarWidget />
      {logging && <LogInteractionModal onClose={() => setLogging(false)} />}
    </>
  );
}
