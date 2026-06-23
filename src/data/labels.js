// Display labels and badge variants for every enum in the schema.
// Variants map to the badge color system: green | blue | amber | red | purple | gray

// Current engagement taxonomy. Legacy keys (active_partner, strategic_partner,
// interested, initial_contact, not_contacted, dormant) are kept as aliases so
// any un-migrated rows from Supabase still render a correct badge; the
// migration in helpers.js rewrites them to the new keys at load time.
export const ENGAGEMENT_STATUS = {
  partnering:     { label: 'Partnering', variant: 'green' },
  potential:      { label: 'Potential', variant: 'amber' },
  unreached:      { label: 'Unreached', variant: 'gray' },
  unable_to_sign: { label: 'Unable to sign partnership', variant: 'red' },
  // legacy aliases (pre-migration safety) — same display as their new target
  active_partner:    { label: 'Partnering', variant: 'green' },
  strategic_partner: { label: 'Potential', variant: 'amber' },
  interested:        { label: 'Potential', variant: 'amber' },
  initial_contact:   { label: 'Potential', variant: 'amber' },
  not_contacted:     { label: 'Unreached', variant: 'gray' },
  dormant:           { label: 'Unreached', variant: 'gray' },
};

// New statuses in display order + a ready-made filter list (with leading "All").
export const ENGAGEMENT_STATUS_ORDER = ['partnering', 'potential', 'unreached', 'unable_to_sign'];
export const ENGAGEMENT_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  ...ENGAGEMENT_STATUS_ORDER.map(value => ({ value, label: ENGAGEMENT_STATUS[value].label })),
];

// KFA advocate program roles (Advocate tab dropdown on a church profile).
export const ADVOCATE_ROLE = {
  care_communities: { label: 'Care Communities', variant: 'green' },
  awareness:        { label: 'Awareness', variant: 'blue' },
  needbridge:       { label: 'NeedBridge', variant: 'purple' },
};

// Programs tracked on the Analytics "ministries engaged" chart. matchKeys lists
// the ministryEngagements.ministry values that count toward it; an empty
// matchKeys means there is no data source yet -> render a feature-request card.
export const ENGAGEMENT_MINISTRIES = [
  { key: 'care_community',  label: 'Care Communities',        matchKeys: ['care_community'] },
  { key: 'needbridge',      label: 'NeedBridge',              matchKeys: [] },
  { key: 'mentoring',       label: 'Mentoring',               matchKeys: ['mentoring'] },
  { key: 'financial_giving', label: 'Financial Giving',       matchKeys: ['financial_giving'] },
  { key: 'monthly_donor',   label: 'Monthly Donor',           matchKeys: [] },
  { key: 'foster_adoptive', label: 'Foster / Adoptive Parents', matchKeys: ['foster_care_recruitment', 'adoption_support'] },
  { key: 'barton_bags',     label: 'Barton Bags',             matchKeys: [] },
];

export const GIVING_STATUS = {
  none: { label: 'No giving', variant: 'gray' },
  occasional: { label: 'Occasional', variant: 'blue' },
  monthly_partner: { label: 'Monthly partner', variant: 'green' },
  annual_partner: { label: 'Annual partner', variant: 'green' },
  major_partner: { label: 'Major partner', variant: 'purple' },
};

export const GIVING_TYPE = {
  one_time: { label: 'One-time', variant: 'blue' },
  monthly: { label: 'Monthly', variant: 'green' },
  annual: { label: 'Annual', variant: 'purple' },
  special: { label: 'Special campaign', variant: 'amber' },
  sponsorship: { label: 'Sponsorship', variant: 'blue' },
};

export const INTERACTION_TYPE = {
  email: { label: 'Email', variant: 'blue' },
  phone_call: { label: 'Phone call', variant: 'blue' },
  meeting: { label: 'Meeting', variant: 'green' },
  lunch: { label: 'Lunch', variant: 'green' },
  event_invitation: { label: 'Event invitation', variant: 'amber' },
  presentation: { label: 'Presentation', variant: 'purple' },
  stand_sunday: { label: 'Stand Sunday discussion', variant: 'purple' },
  care_community_meeting: { label: 'Care Community meeting', variant: 'green' },
  volunteer_recruitment: { label: 'Volunteer recruitment', variant: 'amber' },
  training: { label: 'Training', variant: 'amber' },
  follow_up: { label: 'Follow-up', variant: 'gray' },
  giving_conversation: { label: 'Giving conversation', variant: 'purple' },
  impact_report: { label: 'Impact Report', variant: 'purple' },
};

export const MINISTRY_TYPE = {
  care_community: 'Care Communities',
  foster_care_recruitment: 'Foster Care Recruitment',
  adoption_support: 'Adoption Support',
  respite_care: 'Respite Care',
  stand_sunday: 'Stand Sunday',
  mentoring: 'Mentoring Program',
  cys_lunches: 'CYS Lunches',
  volunteer_recruitment: 'Volunteer Recruitment',
  prayer_support: 'Prayer Support',
  event_hosting: 'Event Hosting',
  family_support: 'Family Support',
  resource_drives: 'Resource Drives',
  financial_giving: 'Financial Giving',
};

export const MINISTRY_STATUS = {
  active: { label: 'Active', variant: 'green' },
  exploring: { label: 'Exploring', variant: 'amber' },
  not_started: { label: 'Not started', variant: 'gray' },
  inactive: { label: 'Inactive', variant: 'gray' },
};

export const TASK_PRIORITY = {
  low: { label: 'Low', variant: 'gray' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High', variant: 'amber' },
  critical: { label: 'Critical', variant: 'red' },
};

export const TASK_STATUS = {
  open: { label: 'Open', variant: 'blue' },
  in_progress: { label: 'In progress', variant: 'amber' },
  waiting: { label: 'Waiting', variant: 'gray' },
  overdue: { label: 'Overdue', variant: 'red' },
  completed: { label: 'Completed', variant: 'green' },
};

export const KFA_ROLE = {
  champion: { label: 'Champion', variant: 'purple' },
  advocate: { label: 'Advocate', variant: 'blue' },
  primary_contact: { label: 'Primary contact', variant: 'green' },
  admin: { label: 'Admin', variant: 'gray' },
  none: { label: '—', variant: 'gray' },
};

export const CONGREGANT_CATEGORY = {
  business:   { label: 'Business',   variant: 'blue' },
  political:  { label: 'Political',  variant: 'purple' },
  community:  { label: 'Community',  variant: 'green' },
  media:      { label: 'Media',      variant: 'amber' },
  education:  { label: 'Education',  variant: 'blue' },
  healthcare: { label: 'Healthcare', variant: 'green' },
  other:      { label: 'Other',      variant: 'gray' },
};

export const CARE_COMMUNITY_STATUS = {
  active:    { label: 'Active',    variant: 'green' },
  forming:   { label: 'Forming',   variant: 'amber' },
  inactive:  { label: 'Inactive',  variant: 'gray' },
};

export const ADVOCATE_STATUS = {
  active:    { label: 'Active',    variant: 'green' },
  inactive:  { label: 'Inactive',  variant: 'gray' },
  prospect:  { label: 'Prospect',  variant: 'amber' },
};

export const CONNECTION_TYPE = {
  referral:    { label: 'Referral',    variant: 'blue' },
  partnership: { label: 'Partnership', variant: 'green' },
  volunteer:   { label: 'Volunteer',   variant: 'amber' },
  donor:       { label: 'Donor',       variant: 'purple' },
  other:       { label: 'Other',       variant: 'gray' },
};

export const CONNECTION_STATUS = {
  active:   { label: 'Active',   variant: 'green' },
  inactive: { label: 'Inactive', variant: 'gray' },
  pending:  { label: 'Pending',  variant: 'amber' },
};

export const PREFERRED_CONTACT = {
  phone: 'Prefers phone',
  email: 'Prefers email',
  in_person: 'Prefers in person',
  text: 'Prefers text',
};

// ---- formatting utilities ----

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function fmtMoney(n) {
  return '$' + (n || 0).toLocaleString('en-US');
}

export function initialsOf(name) {
  return name
    .split(' ')
    .filter(w => /^[A-Z]/.test(w))
    .map(w => w[0])
    .slice(0, 2)
    .join('') || name.slice(0, 2).toUpperCase();
}
