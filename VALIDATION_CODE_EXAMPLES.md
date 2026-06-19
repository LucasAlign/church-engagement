# Validation Implementation - Code Examples

## Quick Reference

### Using Validation Functions

```javascript
import { 
  validateContact, 
  validateChurch, 
  validateCongregant,
  validateEmail,
  validateUrl 
} from '../data/validation.js';

// Check if contact is valid
const result = validateContact({
  name: "John Smith",
  email: "john@example.com"
});

if (!result.isValid) {
  console.log(result.errors);
  // { email: "Please enter a valid email address" }
}
```

### Standalone Email Validation

```javascript
validateEmail("user@example.com")  // true
validateEmail("invalid.email")     // false
validateEmail("")                  // false
```

### Standalone URL Validation

```javascript
validateUrl("https://example.com")           // true
validateUrl("http://domain.co.uk/path")      // true
validateUrl("javascript:alert('xss')")       // false
validateUrl("ftp://example.com")             // false
```

## Modal Implementation Pattern

### Basic Structure (all modals follow this pattern)

```javascript
import { validateContact } from '../data/validation.js';

export function StaffModal({ churchId, contact, onClose }) {
  const { refresh } = useDb();
  const [form, setForm] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    // ... other fields
  });
  
  // State for validation and error handling
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Validation function
  const validate = () => {
    const validation = validateContact(form);
    setErrors(validation.errors);
    return validation.isValid;
  };

  // Save with validation and error handling
  const save = async () => {
    if (!validate()) return;  // Stop if validation fails
    
    setLoading(true);
    try {
      const values = { ...form, name: form.name.trim() };
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
            <button className="btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button 
              className="btn primary" 
              onClick={save} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {loading && <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {contact ? 'Save changes' : 'Add staff member'}
            </button>
          </>
        }
      >
        <Field label="Name" required error={errors.name}>
          <TextInput 
            value={form.name} 
            onChange={v => { 
              set('name', v); 
              if (errors.name) setErrors(e => ({ ...e, name: '' })); 
            }} 
            placeholder="Full name" 
          />
        </Field>
        
        <Field label="Email" error={errors.email}>
          <TextInput 
            value={form.email} 
            onChange={v => { 
              set('email', v); 
              if (errors.email) setErrors(e => ({ ...e, email: '' })); 
            }} 
          />
        </Field>

        {/* ... other fields */}
      </Modal>
      
      <ErrorToast 
        message={errorMessage} 
        onClose={() => setErrorMessage('')} 
      />
    </>
  );
}
```

## Enhanced Field Component

```javascript
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
```

## Error Toast Component

```javascript
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
        <IconX size={16} />
      </button>
    </div>
  );
}
```

## Church Form with Validation

```javascript
function ChurchForm({ church, onSave, onCancel }) {
  const [formData, setFormData] = useState(church || {});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    const validation = validateChurch(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      if (!formData.id) {
        formData.id = `ch_${Date.now()}`;
      }
      const existing = db.churches.findIndex(c => c.id === formData.id);
      if (existing >= 0) {
        db.churches[existing] = formData;
      } else {
        db.churches.push(formData);
      }
      saveRecord('churches', formData);
      onSave();
    } catch (err) {
      setErrorMessage('Failed to save church. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Name', key: 'name', required: true, error: errors.name },
    { label: 'Email', key: 'email', type: 'email', error: errors.email },
    { label: 'Website', key: 'website', error: errors.website },
    { 
      label: 'Min Attendance', 
      key: 'attendanceMin', 
      type: 'number', 
      error: errors.attendanceMin 
    },
    { 
      label: 'Max Attendance', 
      key: 'attendanceMax', 
      type: 'number', 
      error: errors.attendanceMax 
    },
  ];

  return (
    <>
      <FormModal
        title={church?.id ? 'Edit Church' : 'Add Church'}
        fields={fields}
        formData={formData}
        onChange={handleChange}
        onSave={handleSave}
        onCancel={onCancel}
        loading={loading}
      />
      <ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
    </>
  );
}
```

## Validation Results Object

```javascript
// Success case
{
  isValid: true,
  errors: {}
}

// Failure case
{
  isValid: false,
  errors: {
    name: "Name is required",
    email: "Please enter a valid email address",
    attendanceMin: "Minimum attendance must be a non-negative number"
  }
}
```

## Integration with Existing Modals

### StaffModal - Before
```javascript
const save = () => {
  if (!form.name.trim()) return;  // Only basic check
  const values = { ...form, name: form.name.trim() };
  if (contact) updateContact(contact.id, values);
  else addContact({ churchId, ...values });
  refresh();
  onClose();
};
```

### StaffModal - After
```javascript
const validate = () => {
  const validation = validateContact(form);
  setErrors(validation.errors);
  return validation.isValid;
};

const save = async () => {
  if (!validate()) return;  // Full validation
  setLoading(true);
  try {
    const values = { ...form, name: form.name.trim() };
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
```

## Export Statements

All validation functions are exported from a single module:

```javascript
// In src/data/validation.js
export function validateEmail(email) { ... }
export function validateUrl(url) { ... }
export function validateContact(data) { ... }
export function validateChurch(data) { ... }
export function validateCongregant(data) { ... }
```

## Import Examples

```javascript
// Import all functions
import {
  validateEmail,
  validateUrl,
  validateContact,
  validateChurch,
  validateCongregant,
} from '../data/validation.js';

// Use in components
import { validateChurch } from '../data/validation.js';
import { validateContact, validateCongregant } from '../data/validation.js';
```

## Key Features Summary

1. **Inline Validation Display** - Errors show below fields with red highlighting
2. **Auto-Clear on Edit** - Errors disappear when user starts typing
3. **Loading State** - Spinner button prevents double-submit
4. **Error Toast** - Catch-all for save failures
5. **Type Checking** - Email, URL, numeric validation
6. **Cross-Field Validation** - min <= max attendance check
7. **RFC Compliance** - Email validation follows RFC 5322 simplified
8. **Security** - URL protocol whitelist blocks injections

## Error States Handled

- Required field empty
- Invalid email format
- Invalid URL format (or wrong protocol)
- Numeric value validation (negative, not a number)
- Cross-field conflicts (min > max)
- Save operation failures
- Network/database errors
