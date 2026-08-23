// Convert PostgreSQL's snake_case rows into the camelCase objects consumed by
// the frontend. Date-only columns stay date-only so browser timezone parsing
// cannot shift them by a day.
const dateOnly = value => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

export const mapUser = row => ({ ...row });

export const mapChurch = row => ({
  id: row.id, name: row.name, address: row.address, city: row.city,
  state: row.state, zip: row.zip, county: row.county, phone: row.phone,
  email: row.email, website: row.website, denomination: row.denomination,
  attendanceMin: row.attendance_min, attendanceMax: row.attendance_max,
  engagementStatus: row.engagement_status,
  firstContactDate: dateOnly(row.first_contact_date),
  lastInteractionDate: dateOnly(row.last_interaction_date),
  assignedCoordinatorId: row.assigned_coordinator_id,
  hasCareCommunity: row.has_care_community,
  kfaAssociations: row.kfa_associations || [],
  notes: row.notes, createdAt: dateOnly(row.created_at), updatedAt: dateOnly(row.updated_at),
});

export const mapContact = row => ({
  id: row.id, churchId: row.church_id, name: row.name, title: row.position,
  role: 'staff', email: row.email, phone: row.phone,
  preferredContact: row.preferred_contact, kfaRole: row.kfa_role,
  notes: row.notes, archived: row.archived,
});

export const mapInteraction = row => ({
  id: row.id, churchId: row.church_id, contactId: row.contact_id, type: row.type,
  date: dateOnly(row.date), userId: row.user_id, notes: row.notes,
  attendeeCount: row.attendee_count,
});

export const mapTask = row => ({
  id: row.id, churchId: row.church_id, title: row.title,
  assignedTo: row.assigned_to, dueDate: dateOnly(row.due_date),
  priority: row.priority, status: row.status, createdAt: dateOnly(row.created_at),
});

export const mapGivingRecord = row => ({
  id: row.id, churchId: row.church_id, date: dateOnly(row.date),
  amount: row.amount == null ? null : Number(row.amount), fund: row.fund, type: row.type,
});

export const mapMinistryEngagement = row => ({
  id: row.id, churchId: row.church_id, ministry: row.ministry, status: row.status,
  startDate: dateOnly(row.start_date), coordinatorId: row.coordinator_id, notes: row.notes,
});

export const mapImpactReport = row => ({
  id: row.id, churchId: row.church_id, year: row.year, fileName: row.file_name,
  fileType: row.file_type,
  fileSizeMb: row.file_size_mb == null ? null : Number(row.file_size_mb),
  uploadedBy: row.uploaded_by, uploadedAt: dateOnly(row.uploaded_at), url: row.url,
});

export const mapAdvocate = row => ({
  id: row.id, churchId: row.church_id, name: row.name, email: row.email,
  phone: row.phone, role: row.role, status: row.status,
  trainedDate: dateOnly(row.trained_date), notes: row.notes,
});

export const mapCareCommunity = row => ({
  id: row.id, churchId: row.church_id, name: row.name, status: row.status,
  lead: row.lead, familyServed: row.family_served,
  startDate: dateOnly(row.start_date), members: row.members || [], notes: row.notes,
});

export const mapChurchNote = row => ({
  id: row.id, churchId: row.church_id, body: row.body, authorId: row.author_id,
  pinned: row.pinned, internalOnly: row.internal_only, createdAt: dateOnly(row.created_at),
});
