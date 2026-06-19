// Add/edit modals for churches and the church profile tabs: Staff,
// Care Communities, Advocates, Connections, Ministry, Giving, and Tasks.
// All write to the in-memory db.
import { useState } from 'react';
import { IconPlus, IconTrash, IconAlertCircle, IconLoader } from '@tabler/icons-react';
import db from '../data/db.js';
import {
  addContact, updateContact, addCareCommunity, updateCareCommunity,
  addAdvocate, updateAdvocate, addConnection, updateConnection,
  addChurch, updateChurch, addMinistryEngagement, updateMinistryEngagement,
  addGivingRecord, updateGivingRecord, addTask, updateTask,
  getContactsByChurch, TODAY,
} from '../data/helpers.js';
import {
  KFA_ROLE, PREFERRED_CONTACT, CARE_COMMUNITY_STATUS, ADVOCATE_STATUS,
  CONNECTION_TYPE, CONNECTION_STATUS, ENGAGEMENT_STATUS, MINISTRY_TYPE,
  MINISTRY_STATUS, GIVING_TYPE, TASK_PRIORITY, TASK_STATUS,
} from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { Modal } from './shared.jsx';
import { validateContact, validateChurch, validateCongregant, validateEmail } from '../data/validation.js';

function Field({ label, children, error, required }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {required && <span style={{ color: 'var(--red-500)' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {children}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            padding: '6px 8px',
            backgroundColor: 'rgba(220, 38, 38, 0.05)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#dc2626',
          }}>
            <IconAlertCircle size={14} stroke={2} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      zIndex: 2000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    }}>
      <IconAlertCircle size={16} />
      {message}
      <button onClick={onClose} style={{
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
      }}>
        <IconAlertCircle size={16} />
      </button>
    </div>
  );
}

function TextInput({ value, onChange, ...props }) {
  return <input type="text" className="select" value={value} onChange={e => onChange(e.target.value)} {...props} />;
}

function EnumSelect({ map, value, onChange }) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
      {Object.entries(map).map(([key, entry]) => (
        <option key={key} value={key}>{typeof entry === 'string' ? entry : entry.label}</option>
      ))}
    </select>
  );
}

export function StaffModal({ churchId, contact, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: contact?.name || '',
    position: contact?.position || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    preferredContact: contact?.preferredContact || 'email',
    kfaRole: contact?.kfaRole || 'none',
    notes: contact?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const validation = validateContact(form);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const values = { ...form, name: form.name.trim(), notes: form.notes.trim() || null };
      if (contact) updateContact(contact.id, values);
      else addContact({ churchId, ...values });
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save staff member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={contact ? 'Edit staff member' : 'Add staff member'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {contact ? 'Save changes' : 'Add staff member'}
            </button>
          </>
        }
      >
        <Field label="Name" required error={errors.name}>
          <TextInput value={form.name} onChange={v => { set('name', v); if (errors.name) setErrors(e => ({ ...e, name: '' })); }} placeholder="Full name" />
        </Field>
        <Field label="Position">
          <TextInput value={form.position} onChange={v => set('position', v)} placeholder="e.g. Lead Pastor" />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextInput value={form.email} onChange={v => { set('email', v); if (errors.email) setErrors(e => ({ ...e, email: '' })); }} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.phone} onChange={v => set('phone', v)} />
        </Field>
        <Field label="Preferred contact">
          <EnumSelect map={PREFERRED_CONTACT} value={form.preferredContact} onChange={v => set('preferredContact', v)} />
        </Field>
        <Field label="KFA role">
          <EnumSelect map={KFA_ROLE} value={form.kfaRole} onChange={v => set('kfaRole', v)} />
        </Field>
        <Field label="Notes">
          <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </Modal>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function CareCommunityModal({ churchId, community, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: community?.name || '',
    status: community?.status || 'forming',
    lead: community?.lead || '',
    familyServed: community?.familyServed || '',
    startDate: community?.startDate || '',
    notes: community?.notes || '',
  });
  const [members, setMembers] = useState(
    community?.members.length ? community.members.map(m => ({ ...m })) : [{ name: '', role: '' }]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMember = (i, k, v) => setMembers(m => m.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  const validate = () => {
    const validation = validateContact(form);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const values = {
        name: form.name.trim(),
        status: form.status,
        lead: form.lead.trim() || null,
        familyServed: form.familyServed.trim() || null,
        startDate: form.startDate || null,
        notes: form.notes.trim() || null,
        members: members.filter(m => m.name.trim()).map(m => ({ name: m.name.trim(), role: m.role.trim() })),
      };
      if (community) updateCareCommunity(community.id, values);
      else addCareCommunity({ churchId, ...values });
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save care community. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={community ? 'Edit care community' : 'Add care community'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {community ? 'Save changes' : 'Add care community'}
            </button>
          </>
        }
      >
        <Field label="Name" required error={errors.name}>
          <TextInput value={form.name} onChange={v => { set('name', v); if (errors.name) setErrors(e => ({ ...e, name: '' })); }} placeholder="e.g. East Wing Care Community" />
        </Field>
        <Field label="Status">
          <EnumSelect map={CARE_COMMUNITY_STATUS} value={form.status} onChange={v => set('status', v)} />
        </Field>
        <Field label="Lead">
          <TextInput value={form.lead} onChange={v => set('lead', v)} />
        </Field>
        <Field label="Family served">
          <TextInput value={form.familyServed} onChange={v => set('familyServed', v)} placeholder="e.g. The Ramirez family" />
        </Field>
        <Field label="Start date">
          <input type="date" className="select" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </Field>
        <Field label="Team members">
          {members.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <TextInput value={m.name} onChange={v => setMember(i, 'name', v)} placeholder="Name" />
              <TextInput value={m.role} onChange={v => setMember(i, 'role', v)} placeholder="Role" />
              <button className="icon-btn" aria-label="Remove member" onClick={() => setMembers(rows => rows.filter((_, j) => j !== i))}>
                <IconTrash />
              </button>
            </div>
          ))}
          <button className="btn sm" onClick={() => setMembers(m => [...m, { name: '', role: '' }])}>
            <IconPlus stroke={2} /> Add member
          </button>
        </Field>
        <Field label="Notes">
          <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function AdvocateModal({ churchId, advocate, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: advocate?.name || '',
    email: advocate?.email || '',
    phone: advocate?.phone || '',
    role: advocate?.role || '',
    status: advocate?.status || 'active',
    trainedDate: advocate?.trainedDate || '',
    notes: advocate?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const validation = validateContact(form);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const values = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        status: form.status,
        trainedDate: form.trainedDate || null,
        notes: form.notes.trim() || null,
      };
      if (advocate) updateAdvocate(advocate.id, values);
      else addAdvocate({ churchId, ...values });
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save advocate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={advocate ? 'Edit advocate' : 'Add advocate'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {advocate ? 'Save changes' : 'Add advocate'}
            </button>
          </>
        }
      >
        <Field label="Name" required error={errors.name}>
          <TextInput value={form.name} onChange={v => { set('name', v); if (errors.name) setErrors(e => ({ ...e, name: '' })); }} placeholder="Full name" />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextInput value={form.email} onChange={v => { set('email', v); if (errors.email) setErrors(e => ({ ...e, email: '' })); }} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.phone} onChange={v => set('phone', v)} />
        </Field>
        <Field label="Role">
          <TextInput value={form.role} onChange={v => set('role', v)} placeholder="e.g. Foster care advocate" />
        </Field>
        <Field label="Status">
          <EnumSelect map={ADVOCATE_STATUS} value={form.status} onChange={v => set('status', v)} />
        </Field>
        <Field label="Trained date">
          <input type="date" className="select" value={form.trainedDate} onChange={e => set('trainedDate', e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function ConnectionModal({ churchId, connection, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: connection?.name || '',
    email: connection?.email || '',
    phone: connection?.phone || '',
    connectionType: connection?.connectionType || 'attendee',
    status: connection?.status || 'active',
    notes: connection?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const validation = validateContact(form);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const values = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        connectionType: form.connectionType,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (connection) updateConnection(connection.id, values);
      else addConnection({ churchId, ...values });
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={connection ? 'Edit connection' : 'Add connection'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {connection ? 'Save changes' : 'Add connection'}
            </button>
          </>
        }
      >
        <Field label="Name" required error={errors.name}>
          <TextInput value={form.name} onChange={v => { set('name', v); if (errors.name) setErrors(e => ({ ...e, name: '' })); }} placeholder="Full name" />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextInput value={form.email} onChange={v => { set('email', v); if (errors.email) setErrors(e => ({ ...e, email: '' })); }} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.phone} onChange={v => set('phone', v)} />
        </Field>
        <Field label="Connection type">
          <EnumSelect map={CONNECTION_TYPE} value={form.connectionType} onChange={v => set('connectionType', v)} />
        </Field>
        <Field label="Status">
          <EnumSelect map={CONNECTION_STATUS} value={form.status} onChange={v => set('status', v)} />
        </Field>
        <Field label="Notes">
          <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function ChurchModal({ church, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: church?.name || '',
    address: church?.address || '',
    city: church?.city || '',
    state: church?.state || 'PA',
    zip: church?.zip || '',
    county: church?.county || 'Berks',
    phone: church?.phone || '',
    email: church?.email || '',
    website: church?.website || '',
    denomination: church?.denomination || '',
    attendanceMin: church?.attendanceMin ?? '',
    attendanceMax: church?.attendanceMax ?? '',
    engagementStatus: church?.engagementStatus || 'not_contacted',
    firstContactDate: church?.firstContactDate || TODAY,
    assignedCoordinatorId: church?.assignedCoordinatorId || '',
    hasCareCommmunity: church?.hasCareCommmunity || false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const validation = validateChurch(form);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const values = {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        county: form.county.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        denomination: form.denomination.trim(),
        attendanceMin: Number(form.attendanceMin) || 0,
        attendanceMax: Number(form.attendanceMax) || 0,
        firstContactDate: form.firstContactDate || null,
        assignedCoordinatorId: form.assignedCoordinatorId || null,
      };
      if (church) updateChurch(church.id, values);
      else addChurch(values);
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save church. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const two = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

  return (
    <>
      <Modal
        title={church ? 'Edit church' : 'Add church'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {church ? 'Save changes' : 'Add church'}
            </button>
          </>
        }
      >
        <Field label="Name" required error={errors.name}>
          <TextInput value={form.name} onChange={v => { set('name', v); if (errors.name) setErrors(e => ({ ...e, name: '' })); }} placeholder="Church name" />
        </Field>
        <Field label="Address">
          <TextInput value={form.address} onChange={v => set('address', v)} />
        </Field>
        <div style={two}>
          <Field label="City">
            <TextInput value={form.city} onChange={v => set('city', v)} />
          </Field>
          <Field label="State">
            <TextInput value={form.state} onChange={v => set('state', v)} />
          </Field>
        </div>
        <div style={two}>
          <Field label="Zip">
            <TextInput value={form.zip} onChange={v => set('zip', v)} />
          </Field>
          <Field label="County">
            <TextInput value={form.county} onChange={v => set('county', v)} />
          </Field>
        </div>
        <div style={two}>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={v => set('phone', v)} />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput value={form.email} onChange={v => { set('email', v); if (errors.email) setErrors(e => ({ ...e, email: '' })); }} />
          </Field>
        </div>
        <Field label="Website" error={errors.website}>
          <TextInput value={form.website} onChange={v => { set('website', v); if (errors.website) setErrors(e => ({ ...e, website: '' })); }} />
        </Field>
        <Field label="Denomination">
          <TextInput value={form.denomination} onChange={v => set('denomination', v)} />
        </Field>
        <div style={two}>
          <Field label="Attendance min" error={errors.attendanceMin}>
            <input type="number" className="select" value={form.attendanceMin} onChange={e => { set('attendanceMin', e.target.value); if (errors.attendanceMin) setErrors(err => ({ ...err, attendanceMin: '' })); }} />
          </Field>
          <Field label="Attendance max" error={errors.attendanceMax}>
            <input type="number" className="select" value={form.attendanceMax} onChange={e => { set('attendanceMax', e.target.value); if (errors.attendanceMax) setErrors(err => ({ ...err, attendanceMax: '' })); }} />
          </Field>
        </div>
        <Field label="Engagement status">
          <EnumSelect map={ENGAGEMENT_STATUS} value={form.engagementStatus} onChange={v => set('engagementStatus', v)} />
        </Field>
        <Field label="First contact date">
          <input type="date" className="select" value={form.firstContactDate} onChange={e => set('firstContactDate', e.target.value)} />
        </Field>
        <Field label="Assigned coordinator">
          <select className="select" value={form.assignedCoordinatorId} onChange={e => set('assignedCoordinatorId', e.target.value)}>
            <option value="">No coordinator</option>
            {db.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" className="checkbox" checked={form.hasCareCommmunity} onChange={e => set('hasCareCommmunity', e.target.checked)} />
          Has a Care Community
        </label>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function MinistryModal({ churchId, engagement, onClose }) {
  const { refresh } = useDb();
  const contacts = getContactsByChurch(churchId);
  const [form, setForm] = useState({
    ministry: engagement?.ministry || 'care_community',
    status: engagement?.status || 'exploring',
    startDate: engagement?.startDate || '',
    coordinatorId: engagement?.coordinatorId || '',
    notes: engagement?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setLoading(true);
    try {
      const values = {
        ministry: form.ministry,
        status: form.status,
        startDate: form.startDate || null,
        coordinatorId: form.coordinatorId || null,
        notes: form.notes.trim() || null,
      };
      if (engagement) updateMinistryEngagement(engagement.id, values);
      else addMinistryEngagement({ churchId, ...values });
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save ministry engagement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={engagement ? 'Edit ministry engagement' : 'Add ministry engagement'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {engagement ? 'Save changes' : 'Add ministry'}
            </button>
          </>
        }
      >
        <Field label="Ministry">
          <EnumSelect map={MINISTRY_TYPE} value={form.ministry} onChange={v => set('ministry', v)} />
        </Field>
        <Field label="Status">
          <EnumSelect map={MINISTRY_STATUS} value={form.status} onChange={v => set('status', v)} />
        </Field>
        <Field label="Start date">
          <input type="date" className="select" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </Field>
        <Field label="Coordinator">
          <select className="select" value={form.coordinatorId} onChange={e => set('coordinatorId', e.target.value)}>
            <option value="">No coordinator</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function GivingRecordModal({ churchId, record, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    date: record?.date || TODAY,
    amount: record?.amount ?? '',
    fund: record?.fund || '',
    type: record?.type || 'one_time',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const errs = {};
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      errs.amount = 'Amount must be greater than 0';
    }
    if (!form.date) {
      errs.date = 'Date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const amount = Number(form.amount);
      const values = { date: form.date, amount, fund: form.fund.trim() || 'General operations', type: form.type };
      if (record) updateGivingRecord(record.id, values);
      else addGivingRecord({ churchId, ...values });
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save gift record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={record ? 'Edit gift' : 'Record gift'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {record ? 'Save changes' : 'Record gift'}
            </button>
          </>
        }
      >
        <Field label="Date" required error={errors.date}>
          <input type="date" className="select" value={form.date} onChange={e => { set('date', e.target.value); if (errors.date) setErrors(err => ({ ...err, date: '' })); }} />
        </Field>
        <Field label="Amount" required error={errors.amount}>
          <input type="number" min="0" step="0.01" className="select" value={form.amount} onChange={e => { set('amount', e.target.value); if (errors.amount) setErrors(err => ({ ...err, amount: '' })); }} placeholder="0.00" />
        </Field>
        <Field label="Fund">
          <TextInput value={form.fund} onChange={v => set('fund', v)} placeholder="e.g. General operations" />
        </Field>
        <Field label="Type">
          <EnumSelect map={GIVING_TYPE} value={form.type} onChange={v => set('type', v)} />
        </Field>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}

export function TaskModal({ churchId, task, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    churchId: task?.churchId || churchId || db.churches[0].id,
    title: task?.title || '',
    assignedTo: task?.assignedTo || db.users[0].id,
    dueDate: task?.dueDate || TODAY,
    priority: task?.priority || 'medium',
    status: task?.status || 'open',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) {
      errs.title = 'Task title is required';
    }
    if (!form.dueDate) {
      errs.dueDate = 'Due date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const values = { ...form, title: form.title.trim() };
      if (task) updateTask(task.id, values);
      else addTask(values);
      refresh();
      onClose();
    } catch (err) {
      setErrorMessage('Failed to save task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={task ? 'Edit task' : 'New task'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {task ? 'Save changes' : 'Add task'}
            </button>
          </>
        }
      >
        {!churchId && (
          <Field label="Church">
            <select className="select" value={form.churchId} onChange={e => set('churchId', e.target.value)}>
              {db.churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Task" required error={errors.title}>
          <TextInput value={form.title} onChange={v => { set('title', v); if (errors.title) setErrors(err => ({ ...err, title: '' })); }} placeholder="What needs to happen?" />
        </Field>
        <Field label="Assigned to">
          <select className="select" value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
            {db.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Due date" required error={errors.dueDate}>
          <input type="date" className="select" value={form.dueDate} onChange={e => { set('dueDate', e.target.value); if (errors.dueDate) setErrors(err => ({ ...err, dueDate: '' })); }} />
        </Field>
        <Field label="Priority">
          <EnumSelect map={TASK_PRIORITY} value={form.priority} onChange={v => set('priority', v)} />
        </Field>
        <Field label="Status">
          <EnumSelect map={TASK_STATUS} value={form.status} onChange={v => set('status', v)} />
        </Field>
      </Modal>
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}
