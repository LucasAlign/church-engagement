// Shared building blocks: Badge, MetricCard, AvatarInitials, SearchBar,
// FilterPills, CSSBarChart, EmptyState, Modal.
import { IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useId } from 'react';
import { initialsOf } from '../data/labels.js';

// Green dot = contacted within 90 days, red = overdue or never
export function ContactDot({ status, date }) {
  const label = date
    ? `Last contact: ${date}${status === 'red' ? ' (overdue)' : ''}`
    : 'Never contacted';
  return (
    <span
      className={`contact-dot contact-dot-${status}`}
      title={label}
      aria-label={label}
    />
  );
}

export function Badge({ label, variant = 'gray' }) {
  return <span className={`badge ${variant}`}>{label}</span>;
}

export function MetricCard({ label, value, sub }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

const AVATAR_COLORS = ['c-blue', 'c-green', 'c-purple', 'c-amber', 'c-gray'];

export function AvatarInitials({ name, size = 'md', initials }) {
  const text = initials || initialsOf(name || '?');
  const color = AVATAR_COLORS[(name || '').length % AVATAR_COLORS.length];
  return <span className={`avatar ${size} ${color}`}>{text}</span>;
}

export function SearchBar({ placeholder, value, onChange }) {
  return (
    <div className="search-bar">
      <IconSearch />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function FilterPills({ options, active, onChange }) {
  return (
    <div className="filter-pills">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`filter-pill ${active === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function CSSBarChart({ data, color = 'blue', format = v => v }) {
  if (!data || data.length === 0) {
    return (
      <div className="bar-chart">
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          No data available
        </div>
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map(d => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label" title={d.label}>{d.label}</span>
          <div className="bar-track">
            <div
              className={`bar-fill fill-${d.color || color}`}
              style={{ width: `${Math.round((d.value / max) * 100)}%` }}
            />
          </div>
          <span className="bar-value">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="empty-state">
      {Icon && <Icon />}
      <div className="es-title">{title}</div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

export function Modal({ title, onClose, footer, children, wide }) {
  const titleId = useId();
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <div className="modal-title" id={titleId}>{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
