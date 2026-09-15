// One-time compatibility bridge for the normalized PostgreSQL schema used by
// earlier Engage deployments. Newer builds store frontend-shaped JSON records
// in `records`; when that store is empty, preserve the existing production
// data by importing every row from the legacy tables transactionally.

const dateOnly = value => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const LEGACY_COLLECTIONS = [
  {
    collection: 'users', table: 'users', map: row => ({ ...row }),
  },
  {
    collection: 'churches', table: 'churches', map: row => ({
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
    }),
  },
  {
    collection: 'contacts', table: 'contacts', map: row => ({
      id: row.id, churchId: row.church_id, name: row.name, title: row.position,
      role: 'staff', email: row.email, phone: row.phone,
      preferredContact: row.preferred_contact, kfaRole: row.kfa_role,
      notes: row.notes, archived: row.archived,
    }),
  },
  {
    collection: 'interactions', table: 'interactions', map: row => ({
      id: row.id, churchId: row.church_id, contactId: row.contact_id, type: row.type,
      date: dateOnly(row.date), userId: row.user_id, notes: row.notes,
      attendeeCount: row.attendee_count,
    }),
  },
  {
    collection: 'tasks', table: 'tasks', map: row => ({
      id: row.id, churchId: row.church_id, title: row.title,
      assignedTo: row.assigned_to, dueDate: dateOnly(row.due_date),
      priority: row.priority, status: row.status, createdAt: dateOnly(row.created_at),
    }),
  },
  {
    collection: 'givingRecords', table: 'giving_records', map: row => ({
      id: row.id, churchId: row.church_id, date: dateOnly(row.date),
      amount: row.amount == null ? null : Number(row.amount), fund: row.fund, type: row.type,
    }),
  },
  {
    collection: 'ministryEngagements', table: 'ministry_engagements', map: row => ({
      id: row.id, churchId: row.church_id, ministry: row.ministry, status: row.status,
      startDate: dateOnly(row.start_date), coordinatorId: row.coordinator_id, notes: row.notes,
    }),
  },
  {
    collection: 'impactReports', table: 'impact_reports', map: row => ({
      id: row.id, churchId: row.church_id, year: row.year, fileName: row.file_name,
      fileType: row.file_type,
      fileSizeMb: row.file_size_mb == null ? null : Number(row.file_size_mb),
      uploadedBy: row.uploaded_by, uploadedAt: dateOnly(row.uploaded_at), url: row.url,
    }),
  },
  {
    collection: 'churchNotes', table: 'church_notes', map: row => ({
      id: row.id, churchId: row.church_id, body: row.body, authorId: row.author_id,
      pinned: row.pinned, internalOnly: row.internal_only, createdAt: dateOnly(row.created_at),
    }),
  },
  {
    collection: 'advocates', table: 'advocates', map: row => ({
      id: row.id, churchId: row.church_id, name: row.name, email: row.email,
      phone: row.phone, role: row.role, status: row.status,
      trainedDate: dateOnly(row.trained_date), notes: row.notes,
    }),
  },
  {
    collection: 'careCommunities', table: 'care_communities', map: row => ({
      id: row.id, churchId: row.church_id, name: row.name, status: row.status,
      lead: row.lead, familyServed: row.family_served,
      startDate: dateOnly(row.start_date), members: row.members || [], notes: row.notes,
    }),
  },
];

export async function migrateLegacyData(pool) {
  const connection = typeof pool.connect === 'function' ? await pool.connect() : pool;
  try {
    await connection.query('begin');
    await connection.query("select pg_advisory_xact_lock(hashtext('engage_legacy_records_migration'))");

    const existing = await connection.query('select count(*)::int as count from records');
    if (Number(existing.rows[0]?.count || 0) > 0) {
      await connection.query('commit');
      return 0;
    }

    const tableNames = LEGACY_COLLECTIONS.map(item => item.table);
    const available = await connection.query(
      `select table_name from information_schema.tables
       where table_schema = current_schema() and table_name = any($1::text[])`,
      [tableNames],
    );
    const availableTables = new Set(available.rows.map(row => row.table_name));
    let migrated = 0;

    for (const descriptor of LEGACY_COLLECTIONS) {
      if (!availableTables.has(descriptor.table)) continue;
      // Table names come exclusively from the fixed allowlist above.
      const { rows } = await connection.query(`select * from "${descriptor.table}" order by id`);
      for (const row of rows) {
        const data = descriptor.map(row);
        if (data.id == null) continue;
        await connection.query(
          `insert into records (collection, id, data, updated_at)
           values ($1, $2, $3::jsonb, now())
           on conflict (collection, id) do nothing`,
          [descriptor.collection, String(data.id), JSON.stringify(data)],
        );
        migrated += 1;
      }
    }

    await connection.query('commit');
    return migrated;
  } catch (error) {
    await connection.query('rollback').catch(() => {});
    throw error;
  } finally {
    connection.release?.();
  }
}
