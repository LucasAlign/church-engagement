import { IconX } from '@tabler/icons-react';

export default function FormModal({
  title,
  fields,
  formData,
  onChange,
  onSave,
  onCancel,
  isLoading = false,
}) {
  const handleFieldChange = (key, value) => {
    onChange(key, value);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {title}
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
            }}
          >
            <IconX stroke={1.5} size={20} />
          </button>
        </div>

        {/* Form Fields */}
        <div style={{ padding: '24px' }}>
          {fields.map(field => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                }}
              >
                {field.label}
                {field.required && <span style={{ color: 'var(--red-500)' }}>*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.key] || ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'auto',
                  }}
                />
              ) : field.type === 'select' ? (
                <>
                <select
                  value={field.allowCustom && formData[field.key] && !field.options?.some(opt => opt.value === formData[field.key]) ? "__custom__" : (formData[field.key] || "")}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'auto',
                  }}
                >
                  <option value="">{field.placeholder || 'Select an option'}</option>
                  {field.options && field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {field.allowCustom && <option value="__custom__">Other — enter a custom value</option>}
                </select>
                {field.allowCustom && formData[field.key] && !field.options?.some(opt => opt.value === formData[field.key]) && (
                  <input
                    autoFocus
                    type="text"
                    value={formData[field.key] === "__custom__" ? "" : formData[field.key]}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder="Enter custom value"
                    disabled={isLoading}
                    style={{
                      width: "100%", marginTop: 8, padding: "8px 12px",
                      border: "1px solid var(--border)", borderRadius: 6,
                      fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                )}
                </>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.key] || ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'auto',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '24px',
            borderTop: '1px solid var(--border)',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary-500)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
