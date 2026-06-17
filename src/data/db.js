// db.js — in-memory database
// Replace each collection with a Supabase table of the same shape.
const db = {
  churches: [
    { id: 'ch_001', name: 'Covenant Church', city: 'Reading', state: 'PA', zip: '19601', engagementStatus: 'active_partner', lastInteractionDate: '2026-06-09', firstContactDate: '2025-01-15', assignedCoordinatorId: 'usr_001' },
    { id: 'ch_002', name: 'Grace Church Kutztown', city: 'Kutztown', state: 'PA', zip: '19530', engagementStatus: 'active_partner', lastInteractionDate: '2026-06-08', firstContactDate: '2024-11-20', assignedCoordinatorId: 'usr_001' },
    { id: 'ch_003', name: 'Calvary BFC', city: 'Reading', state: 'PA', zip: '19604', engagementStatus: 'strategic_partner', lastInteractionDate: '2026-06-05', firstContactDate: '2024-09-01', assignedCoordinatorId: 'usr_001' },
    { id: 'ch_004', name: 'The Bridge', city: 'Wyomissing', state: 'PA', zip: '19610', engagementStatus: 'interested', lastInteractionDate: '2026-05-20', firstContactDate: '2026-03-15', assignedCoordinatorId: 'usr_001' },
    { id: 'ch_005', name: 'Hope of the Nations', city: 'Exeter', state: 'PA', zip: '19530', engagementStatus: 'active_partner', lastInteractionDate: '2026-06-01', firstContactDate: '2024-12-10', assignedCoordinatorId: 'usr_001' },
    { id: 'ch_006', name: 'Ark Bible Chapel', city: 'Muhlenberg', state: 'PA', zip: '19605', engagementStatus: 'initial_contact', lastInteractionDate: '2026-04-15', firstContactDate: '2026-04-01', assignedCoordinatorId: null },
    { id: 'ch_007', name: 'First Assembly', city: 'Wernersville', state: 'PA', zip: '19565', engagementStatus: 'dormant', lastInteractionDate: '2024-12-01', firstContactDate: '2023-06-20', assignedCoordinatorId: 'usr_001' },
    { id: 'ch_008', name: 'Emmanuel Church', city: 'Hamburg', state: 'PA', zip: '19526', engagementStatus: 'interested', lastInteractionDate: '2026-05-10', firstContactDate: '2026-01-05', assignedCoordinatorId: null },
    { id: 'ch_009', name: 'Trinity Baptist', city: 'Morgantown', state: 'PA', zip: '19543', engagementStatus: 'active_partner', lastInteractionDate: '2026-06-07', firstContactDate: '2024-08-15', assignedCoordinatorId: 'usr_001' },
  ],
  contacts: [
    { id: 'con_001', churchId: 'ch_001', name: 'Pastor Mark Johnson', title: 'Lead Pastor', role: 'pastor', email: 'mark@covenantchurch.org', phone: '610-555-0101', archived: false, createdAt: '2025-01-15' },
    { id: 'con_002', churchId: 'ch_001', name: 'Sarah Williams', title: 'Outreach Director', role: 'staff', email: 'sarah@covenantchurch.org', phone: null, archived: false, createdAt: '2025-02-01' },
    { id: 'con_003', churchId: 'ch_002', name: 'Rev. David Martinez', title: 'Senior Pastor', role: 'pastor', email: 'david@gracekutztown.org', phone: '610-555-0202', archived: false, createdAt: '2024-11-20' },
    { id: 'con_004', churchId: 'ch_003', name: 'Pastor John Smith', title: 'Lead Pastor', role: 'pastor', email: 'john@calvaryreading.org', phone: '610-555-0303', archived: false, createdAt: '2024-09-01' },
  ],
  interactions: [
    { id: 'int_001', churchId: 'ch_001', contactId: 'con_001', type: 'meeting', date: '2026-06-09', userId: 'usr_001', notes: 'Quarterly check-in with Pastor Mark. Discussed Care Community expansion and Stand Sunday for fall.', attendeeCount: 2 },
    { id: 'int_002', churchId: 'ch_002', contactId: 'con_003', type: 'stand_sunday', date: '2026-06-08', userId: 'usr_001', notes: 'Reviewed Stand Sunday participation for fall season.', attendeeCount: null },
    { id: 'int_003', churchId: 'ch_003', contactId: 'con_004', type: 'phone_call', date: '2026-06-05', userId: 'usr_001', notes: 'Follow-up on grant application and partnership opportunities.', attendeeCount: null },
  ],
  tasks: [
    { id: 'tsk_001', churchId: 'ch_003', title: 'Discuss Care Community launch', dueDate: '2026-06-05', priority: 'critical', status: 'overdue', assignedTo: 'usr_001', notes: null },
    { id: 'tsk_002', churchId: 'ch_004', title: 'Send Stand Sunday materials', dueDate: '2026-06-11', priority: 'high', status: 'open', assignedTo: 'usr_001', notes: null },
    { id: 'tsk_003', churchId: 'ch_005', title: 'Volunteer recruitment follow-up', dueDate: '2026-06-20', priority: 'medium', status: 'open', assignedTo: 'usr_001', notes: null },
  ],
  givingRecords: [
    { id: 'giv_001', churchId: 'ch_001', date: '2026-03-15', amount: 2500, type: 'one_time', notes: null },
    { id: 'giv_002', churchId: 'ch_001', date: '2026-06-01', amount: 1200, type: 'monthly', notes: null },
    { id: 'giv_003', churchId: 'ch_003', date: '2026-02-28', amount: 5000, type: 'annual', notes: null },
    { id: 'giv_004', churchId: 'ch_003', date: '2026-05-15', amount: 1500, type: 'one_time', notes: null },
    { id: 'giv_005', churchId: 'ch_005', date: '2026-04-01', amount: 3000, type: 'one_time', notes: null },
    { id: 'giv_006', churchId: 'ch_009', date: '2026-01-10', amount: 2000, type: 'one_time', notes: null },
  ],
  ministryEngagements: [
    { id: 'min_001', churchId: 'ch_001', ministry: 'care_community', status: 'active', startDate: '2025-03-01', notes: null },
    { id: 'min_002', churchId: 'ch_005', ministry: 'care_community', status: 'active', startDate: '2025-06-15', notes: null },
  ],
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
