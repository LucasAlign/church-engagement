import { useState } from 'react';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import db from '../data/db.js';
import { saveRecord } from '../data/backend.js';
import { genId, TODAY } from '../data/helpers.js';
import { ENGAGEMENT_STATUS_FILTERS } from '../data/labels.js';

const DENOMINATIONS = [
  'Assemblies of God', 'Baptist', 'Baptist (Independent)', 'Baptist (SBC)',
  'Bible Fellowship', 'Bible Fellowship Church', 'Christian / Independent',
  'Church of Christ', 'Church of God', 'Church of the Brethren', 'Church of the Nazarene',
  'Eastern Orthodox (Russian)', 'Episcopal', 'Evangelical Congregational', 'Evangelical/Free',
  'Independent/Bible', 'Lutheran', 'Lutheran (AFLC)', 'Lutheran (ELCA)', 'Lutheran / UCC',
  'Mennonite', 'Mennonite (LMC)', 'Non-denominational', 'Orthodox Jewish',
  'Orthodox Presbyterian (OPC)', 'Presbyterian', 'Presbyterian (PCUSA)', 'Reformed',
  'Roman Catholic', 'Seventh-day Adventist', 'Unitarian Universalist',
  'United Church of Christ', 'United Methodist',
];
const CITIES = ['Bechtelsville', 'Bethel', 'Birdsboro', 'Boyertown', 'Douglassville', 'Fleetwood', 'Hamburg', 'Kutztown', 'Leesport', 'Mohnton', 'Reading', 'Robesonia', 'Shillington', 'Sinking Spring', 'West Reading', 'Womelsdorf', 'Wyomissing'];
const EMPTY_PERSON = { name: '', phone: '', email: '' };
const EMPTY_COMMUNITY = { name: '', lead: '', phone: '', email: '' };

function Field({ label, children, wide = false }) {
  return <label className={'church-form-field' + (wide ? ' wide' : '')}><span>{label}</span>{children}</label>;
}
function Input({ value, onChange, ...props }) {
  return <input className="select" value={value || ''} onChange={e => onChange(e.target.value)} {...props} />;
}
function FlexibleSelect({ value, onChange, options, placeholder }) {
  const custom = Boolean(value) && !options.includes(value);
  return <>
    <select className="select" value={custom ? '__other__' : (value || '')} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
      <option value="__other__">Other — enter a custom value</option>
    </select>
    {(custom || value === '__other__') && <Input autoFocus value={value === '__other__' ? '' : value} onChange={onChange} placeholder="Enter custom value" />}
  </>;
}
function PersonFields({ person, onChange, roleLabel, onRemove }) {
  return <div className="church-person-row">
    <Field label={roleLabel}><Input value={person.name} onChange={value => onChange({ ...person, name: value })} placeholder="Full name" /></Field>
    <Field label="Phone"><Input type="tel" value={person.phone} onChange={value => onChange({ ...person, phone: value })} /></Field>
    <Field label="Email"><Input type="email" value={person.email} onChange={value => onChange({ ...person, email: value })} /></Field>
    {onRemove && <button type="button" className="church-row-remove" onClick={onRemove} aria-label="Remove"><IconTrash /></button>}
  </div>;
}

export default function ChurchForm({ church, onSave, onCancel }) {
  const [form, setForm] = useState({ county: 'Berks', state: 'PA', engagementStatus: 'unreached', ...church });
  const [leaders, setLeaders] = useState({ pastor: { ...EMPTY_PERSON }, assistant: { ...EMPTY_PERSON }, others: [] });
  const [hasAdvocates, setHasAdvocates] = useState(false);
  const [advocates, setAdvocates] = useState([{ ...EMPTY_PERSON }]);
  const [hasCommunities, setHasCommunities] = useState(false);
  const [communities, setCommunities] = useState([{ ...EMPTY_COMMUNITY }]);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateList = (setter, list, index, value) => setter(list.map((item, i) => i === index ? value : item));
  const removeFrom = (setter, list, index) => setter(list.filter((_, i) => i !== index));

  const saveRelated = churchId => {
    const staff = [
      { ...leaders.pastor, title: 'Pastor' },
      { ...leaders.assistant, title: 'Assistant Pastor' },
      ...leaders.others.map(person => ({ ...person, title: person.title || 'Other' })),
    ].filter(person => person.name.trim());
    staff.forEach(person => {
      const record = { id: genId('con'), churchId, name: person.name.trim(), title: person.title, role: 'staff', email: person.email || null, phone: person.phone || null, archived: false, createdAt: TODAY };
      db.contacts.push(record); saveRecord('contacts', record);
    });
    if (hasAdvocates) advocates.filter(person => person.name.trim()).forEach(person => {
      const record = { id: genId('adv'), churchId, name: person.name.trim(), phone: person.phone || null, email: person.email || null, status: 'active', createdAt: TODAY };
      db.advocates.push(record); saveRecord('advocates', record);
    });
    if (hasCommunities) communities.filter(item => item.name.trim()).forEach(item => {
      const record = { id: genId('cc'), churchId, name: item.name.trim(), lead: item.lead || null, phone: item.phone || null, email: item.email || null, status: 'active', members: [], createdAt: TODAY };
      db.careCommunities.push(record); saveRecord('careCommunities', record);
    });
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    const isNew = !form.id;
    const approx = form.attendanceApprox === '' || form.attendanceApprox == null ? null : Number(form.attendanceApprox);
    const record = {
      ...form, id: form.id || 'ch_' + Date.now(), name: form.name.trim(),
      county: form.county || 'Berks', state: form.state || 'PA',
      denomination: form.denomination === '__other__' ? null : form.denomination || null,
      attendanceMin: approx, attendanceMax: approx,
      engagementStatus: form.engagementStatus || 'unreached',
      firstContactDate: form.firstContactDate || null,
      lastInteractionDate: form.lastInteractionDate || null,
      assignedCoordinatorId: form.assignedCoordinatorId || null,
      createdAt: form.createdAt || TODAY, updatedAt: TODAY,
    };
    delete record.attendanceApprox;
    const index = db.churches.findIndex(item => item.id === record.id);
    if (index >= 0) db.churches[index] = record; else db.churches.push(record);
    saveRecord('churches', record);
    if (isNew) saveRelated(record.id);
    onSave(record);
  };

  return <div className="modal-overlay" onClick={onCancel}>
    <div className="church-form-modal" onClick={e => e.stopPropagation()}>
      <div className="church-form-header"><div><h2>{church?.id ? 'Edit Church' : 'Add Church'}</h2><p>Church details, key contacts, and KeyFam connections</p></div><button onClick={onCancel} aria-label="Close"><IconX /></button></div>
      <div className="church-form-body">
        <section><h3>Church overview</h3><div className="church-form-grid three">
          <Field label="Church name"><Input value={form.name} onChange={value => set('name', value)} required /></Field>
          <Field label="Denomination"><FlexibleSelect value={form.denomination} onChange={value => set('denomination', value)} options={DENOMINATIONS} placeholder="Select denomination" /></Field>
          <Field label="Approx. attendance"><Input type="number" min="0" value={form.attendanceApprox ?? form.attendanceMin ?? ''} onChange={value => set('attendanceApprox', value)} /></Field>
          <Field label="Main phone"><Input type="tel" value={form.phone} onChange={value => set('phone', value)} /></Field>
          <Field label="Main email"><Input type="email" value={form.email} onChange={value => set('email', value)} /></Field>
          <Field label="Website"><Input value={form.website} onChange={value => set('website', value)} /></Field>
        </div></section>
        <section><h3>Location</h3><div className="church-form-grid location">
          <Field label="Street address"><Input value={form.address} onChange={value => set('address', value)} /></Field>
          <Field label="City"><FlexibleSelect value={form.city} onChange={value => set('city', value)} options={CITIES} placeholder="Select city" /></Field>
          <Field label="County"><FlexibleSelect value={form.county} onChange={value => set('county', value)} options={['Berks']} placeholder="Select county" /></Field>
          <Field label="State"><Input value={form.state} onChange={value => set('state', value)} /></Field>
          <Field label="ZIP"><Input value={form.zip} onChange={value => set('zip', value)} /></Field>
        </div></section>
        {!church?.id && <section><h3>Church leadership</h3>
          <PersonFields roleLabel="Pastor" person={leaders.pastor} onChange={person => setLeaders({ ...leaders, pastor: person })} />
          <PersonFields roleLabel="Assistant pastor" person={leaders.assistant} onChange={person => setLeaders({ ...leaders, assistant: person })} />
          {leaders.others.map((person, index) => <PersonFields key={index} roleLabel="Other contact" person={person} onChange={value => updateList(value => setLeaders({ ...leaders, others: value }), leaders.others, index, value)} onRemove={() => removeFrom(value => setLeaders({ ...leaders, others: value }), leaders.others, index)} />)}
          <button type="button" className="btn sm church-add-row" onClick={() => setLeaders({ ...leaders, others: [...leaders.others, { ...EMPTY_PERSON }] })}><IconPlus /> Add another contact</button>
        </section>}
        {!church?.id && <section><div className="church-section-title"><h3>Advocates</h3><label className="church-yes-no"><input type="checkbox" checked={hasAdvocates} onChange={e => setHasAdvocates(e.target.checked)} /> This church has advocates</label></div>
          {hasAdvocates && <>{advocates.map((person, index) => <PersonFields key={index} roleLabel="Advocate name" person={person} onChange={value => updateList(setAdvocates, advocates, index, value)} onRemove={advocates.length > 1 ? () => removeFrom(setAdvocates, advocates, index) : null} />)}<button type="button" className="btn sm church-add-row" onClick={() => setAdvocates([...advocates, { ...EMPTY_PERSON }])}><IconPlus /> Add advocate</button></>}
        </section>}
        {!church?.id && <section><div className="church-section-title"><h3>Care communities</h3><label className="church-yes-no"><input type="checkbox" checked={hasCommunities} onChange={e => setHasCommunities(e.target.checked)} /> This church has care communities</label></div>
          {hasCommunities && <>{communities.map((item, index) => <div className="church-person-row care" key={index}><Field label="Community name"><Input value={item.name} onChange={value => updateList(setCommunities, communities, index, { ...item, name: value })} /></Field><Field label="Lead name"><Input value={item.lead} onChange={value => updateList(setCommunities, communities, index, { ...item, lead: value })} /></Field><Field label="Phone"><Input type="tel" value={item.phone} onChange={value => updateList(setCommunities, communities, index, { ...item, phone: value })} /></Field><Field label="Email"><Input type="email" value={item.email} onChange={value => updateList(setCommunities, communities, index, { ...item, email: value })} /></Field>{communities.length > 1 && <button type="button" className="church-row-remove" onClick={() => removeFrom(setCommunities, communities, index)}><IconTrash /></button>}</div>)}<button type="button" className="btn sm church-add-row" onClick={() => setCommunities([...communities, { ...EMPTY_COMMUNITY }])}><IconPlus /> Add care community</button></>}
        </section>}
        <section><h3>KeyFam relationship & notes</h3><div className="church-form-grid two">
          <Field label="KeyFam association"><select className="select" value={form.kfaAssociation || ''} onChange={e => set('kfaAssociation', e.target.value)}><option value="">No known association</option><option value="partner">Partner church</option><option value="advocate">Has KeyFam advocate(s)</option><option value="care_community">Runs a care community</option><option value="donor">Financial supporter</option><option value="volunteer">Volunteer connection</option><option value="other">Other connection</option></select></Field>
          <Field label="Engagement status"><select className="select" value={form.engagementStatus || 'unreached'} onChange={e => set('engagementStatus', e.target.value)}>{ENGAGEMENT_STATUS_FILTERS.filter(item => item.value !== 'all').map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Other church information" wide><textarea className="select" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Ministries, service times, community involvement, needs, or anything else useful…" /></Field>
        </div></section>
      </div>
      <div className="church-form-footer"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn primary" onClick={handleSave}>{church?.id ? 'Save changes' : 'Add church'}</button></div>
    </div>
  </div>;
}
