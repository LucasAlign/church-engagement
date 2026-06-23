// Canonical church add/edit form. One field list shared by the home "Add
// church" action and the profile "Edit" button so the form and the profile
// can never drift. Writes through to db + Supabase (saveRecord).
import { useState } from 'react';
import db from '../data/db.js';
import { saveRecord } from '../data/backend.js';
import { TODAY } from '../data/helpers.js';
import { ENGAGEMENT_STATUS_FILTERS } from '../data/labels.js';
import FormModal from './FormModal.jsx';

const STATUS_OPTIONS = ENGAGEMENT_STATUS_FILTERS
  .filter(f => f.value !== 'all')
  .map(f => ({ value: f.value, label: f.label }));

// Mirrors exactly what the church profile displays.
const FIELDS = [
  { label: 'Name', key: 'name', required: true },
  { label: 'Denomination', key: 'denomination' },
  { label: 'County', key: 'county', placeholder: 'Berks' },
  { label: 'City', key: 'city' },
  { label: 'State', key: 'state', placeholder: 'PA' },
  { label: 'Zip', key: 'zip' },
  { label: 'Address', key: 'address' },
  { label: 'Phone', key: 'phone' },
  { label: 'Email', key: 'email', type: 'email' },
  { label: 'Website', key: 'website' },
  { label: 'Min Attendance', key: 'attendanceMin', type: 'number' },
  { label: 'Max Attendance', key: 'attendanceMax', type: 'number' },
  { label: 'Engagement Status', key: 'engagementStatus', type: 'select', options: STATUS_OPTIONS },
  { label: 'Notes', key: 'notes', type: 'textarea' },
];

const toInt = v => (v === '' || v == null ? null : (parseInt(v, 10) || 0));

export default function ChurchForm({ church, onSave, onCancel }) {
  const [formData, setFormData] = useState(church || {});
  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    const r = { ...formData };
    r.name = (r.name || '').trim();
    if (!r.name) return;
    r.county = (r.county || '').trim() || 'Berks';
    r.state = (r.state || '').trim() || 'PA';
    r.engagementStatus = r.engagementStatus || 'unreached';
    r.attendanceMin = toInt(r.attendanceMin);
    r.attendanceMax = toInt(r.attendanceMax);

    if (!r.id) {
      r.id = `ch_${Date.now()}`;
      r.createdAt = TODAY;
      r.firstContactDate = r.firstContactDate || null;
      r.lastInteractionDate = r.lastInteractionDate || null;
      r.assignedCoordinatorId = r.assignedCoordinatorId || null;
    }
    r.updatedAt = TODAY;

    const idx = db.churches.findIndex(c => c.id === r.id);
    if (idx >= 0) db.churches[idx] = r;
    else db.churches.push(r);
    saveRecord('churches', r);
    onSave(r);
  };

  return (
    <FormModal
      title={church?.id ? 'Edit Church' : 'Add Church'}
      fields={FIELDS}
      formData={formData}
      onChange={handleChange}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
}
