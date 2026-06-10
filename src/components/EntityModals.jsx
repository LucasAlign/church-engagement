// Add/edit modals for the church profile tabs: Staff, Care Communities,
// Advocates, and Connections. All write to the in-memory db.
import { useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  addContact, updateContact, addCareCommunity, addAdvocate, addConnection,
} from '../data/helpers.js';
import {
  KFA_ROLE, PREFERRED_CONTACT, CARE_COMMUNITY_STATUS, ADVOCATE_STATUS,
  CONNECTION_TYPE, CONNECTION_STATUS,
} from '../data/labels.js';
import { useDb } from '../data/store.jsx';
import { Modal } from './shared.jsx';

function Field({ label, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
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
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    const values = { ...form, name: form.name.trim(), notes: form.notes.trim() || null };
    if (contact) updateContact(contact.id, values);
    else addContact({ churchId, ...values });
    refresh();
    onClose();
  };

  return (
    <Modal
      title={contact ? 'Edit staff member' : 'Add staff member'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>{contact ? 'Save changes' : 'Add staff member'}</button>
        </>
      }
    >
      <Field label="Name"><TextInput value={form.name} onChange={v => set('name', v)} placeholder="Full name" /></Field>
      <Field label="Position"><TextInput value={form.position} onChange={v => set('position', v)} placeholder="e.g. Lead Pastor" /></Field>
      <Field label="Email"><TextInput value={form.email} onChange={v => set('email', v)} /></Field>
      <Field label="Phone"><TextInput value={form.phone} onChange={v => set('phone', v)} /></Field>
      <Field label="Preferred contact"><EnumSelect map={PREFERRED_CONTACT} value={form.preferredContact} onChange={v => set('preferredContact', v)} /></Field>
      <Field label="KFA role"><EnumSelect map={KFA_ROLE} value={form.kfaRole} onChange={v => set('kfaRole', v)} /></Field>
      <Field label="Notes">
        <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
    </Modal>
  );
}

export function CareCommunityModal({ churchId, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: '', status: 'forming', lead: '', familyServed: '', startDate: '', notes: '',
  });
  const [members, setMembers] = useState([{ name: '', role: '' }]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMember = (i, k, v) => setMembers(m => m.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  const save = () => {
    if (!form.name.trim()) return;
    addCareCommunity({
      churchId,
      name: form.name.trim(),
      status: form.status,
      lead: form.lead.trim() || null,
      familyServed: form.familyServed.trim() || null,
      startDate: form.startDate || null,
      notes: form.notes.trim() || null,
      members: members.filter(m => m.name.trim()).map(m => ({ name: m.name.trim(), role: m.role.trim() })),
    });
    refresh();
    onClose();
  };

  return (
    <Modal
      title="Add care community"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Add care community</button>
        </>
      }
    >
      <Field label="Name"><TextInput value={form.name} onChange={v => set('name', v)} placeholder="e.g. East Wing Care Community" /></Field>
      <Field label="Status"><EnumSelect map={CARE_COMMUNITY_STATUS} value={form.status} onChange={v => set('status', v)} /></Field>
      <Field label="Lead"><TextInput value={form.lead} onChange={v => set('lead', v)} /></Field>
      <Field label="Family served"><TextInput value={form.familyServed} onChange={v => set('familyServed', v)} placeholder="e.g. The Ramirez family" /></Field>
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
  );
}

export function AdvocateModal({ churchId, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: '', status: 'active', trainedDate: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    addAdvocate({
      churchId,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role.trim() || null,
      status: form.status,
      trainedDate: form.trainedDate || null,
      notes: form.notes.trim() || null,
    });
    refresh();
    onClose();
  };

  return (
    <Modal
      title="Add advocate"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Add advocate</button>
        </>
      }
    >
      <Field label="Name"><TextInput value={form.name} onChange={v => set('name', v)} placeholder="Full name" /></Field>
      <Field label="Email"><TextInput value={form.email} onChange={v => set('email', v)} /></Field>
      <Field label="Phone"><TextInput value={form.phone} onChange={v => set('phone', v)} /></Field>
      <Field label="Role"><TextInput value={form.role} onChange={v => set('role', v)} placeholder="e.g. Foster care advocate" /></Field>
      <Field label="Status"><EnumSelect map={ADVOCATE_STATUS} value={form.status} onChange={v => set('status', v)} /></Field>
      <Field label="Trained date">
        <input type="date" className="select" value={form.trainedDate} onChange={e => set('trainedDate', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
    </Modal>
  );
}

export function ConnectionModal({ churchId, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', connectionType: 'attendee', status: 'active', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    addConnection({
      churchId,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      connectionType: form.connectionType,
      status: form.status,
      notes: form.notes.trim() || null,
    });
    refresh();
    onClose();
  };

  return (
    <Modal
      title="Add connection"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Add connection</button>
        </>
      }
    >
      <Field label="Name"><TextInput value={form.name} onChange={v => set('name', v)} placeholder="Full name" /></Field>
      <Field label="Email"><TextInput value={form.email} onChange={v => set('email', v)} /></Field>
      <Field label="Phone"><TextInput value={form.phone} onChange={v => set('phone', v)} /></Field>
      <Field label="Connection type"><EnumSelect map={CONNECTION_TYPE} value={form.connectionType} onChange={v => set('connectionType', v)} /></Field>
      <Field label="Status"><EnumSelect map={CONNECTION_STATUS} value={form.status} onChange={v => set('status', v)} /></Field>
      <Field label="Notes">
        <textarea className="select" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </Field>
    </Modal>
  );
}
