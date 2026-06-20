// Reusable form modal used by the church profile and church list pages.
// Renders a list of fields (text, email, number, textarea, select, date)
// over the shared Modal shell and reports edits back through onChange.
import { Modal } from './shared.jsx';

function renderField(field, value, onChange) {
  const common = {
    className: 'select',
    value: value ?? '',
    onChange: e => onChange(field.key, e.target.value),
    placeholder: field.placeholder,
  };
  if (field.type === 'textarea') {
    return <textarea {...common} rows={field.rows || 3} />;
  }
  if (field.type === 'select') {
    return (
      <select {...common}>
        {(field.options || []).map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  const type = field.type === 'number' ? 'number'
    : field.type === 'email' ? 'email'
    : field.type === 'date' ? 'date'
    : 'text';
  return <input type={type} {...common} />;
}

export default function FormModal({
  title, fields, formData, onChange, onSave, onCancel, isLoading = false,
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel} disabled={isLoading}>Cancel</button>
          <button className="btn primary" onClick={onSave} disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {fields.map(field => (
        <div className="field" key={field.key}>
          <label className="field-label">
            {field.label}
            {field.required && <span style={{ color: '#dc2626' }}> *</span>}
          </label>
          {renderField(field, formData[field.key], onChange)}
          {field.error && (
            <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{field.error}</div>
          )}
        </div>
      ))}
    </Modal>
  );
}
