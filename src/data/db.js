// db.js — in-memory database
// Replace each collection with a Supabase table of the same shape.
const db = {
  churches: [],
  contacts: [],
  interactions: [],
  tasks: [],
  givingRecords: [],
  ministryEngagements: [],
  careCommunities: [],
  advocates: [],
  connections: [],
  impactReports: [],
  churchNotes: [],
  notableCongregants: [],
  users: [
    { id: 'usr_001', name: 'Sarah Chen', role: 'County Coordinator', email: 's.chen@keystonefamilyalliance.org', county: 'Berks', initials: 'SC' },
  ],
};

export default db;
