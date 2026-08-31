# Form Validation - Quick Reference Card

## Import Statements

```javascript
// In any component that needs validation
import { 
  validateEmail,           // Email format check
  validateUrl,             // URL format check
  validateContact,         // For staff/advocates/connections
  validateChurch,          // For churches
  validateCongregant       // For congregants
} from '../data/validation.js';
```

## Validation Functions

### 1. validateEmail(email)
**Returns:** `boolean`

```javascript
validateEmail("john@example.com")  // → true
validateEmail("invalid.email")     // → false
validateEmail("")                  // → false
```

### 2. validateUrl(url)
**Returns:** `boolean`

```javascript
validateUrl("https://example.com")           // → true
validateUrl("http://domain.co.uk/path")      // → true
validateUrl("javascript:alert('xss')")       // → false
validateUrl("ftp://example.com")             // → false
```

### 3. validateContact(data)
**Required:** `name`
**Optional:** `email` (format validated if provided)
**Returns:** `{ isValid: boolean, errors: object }`

```javascript
validateContact({ name: "John", email: "john@example.com" })
// → { isValid: true, errors: {} }

validateContact({ name: "", email: "invalid" })
// → { isValid: false, errors: { name: "Name is required", email: "..." } }
```

### 4. validateChurch(data)
**Required:** `name`
**Optional:** `email`, `website`, `attendanceMin`, `attendanceMax`
**Returns:** `{ isValid: boolean, errors: object }`

```javascript
validateChurch({
  name: "Grace Church",
  email: "contact@gracechurch.com",
  website: "https://gracechurch.com",
  attendanceMin: 50,
  attendanceMax: 100
})
// → { isValid: true, errors: {} }

validateChurch({
  name: "",
  attendanceMin: 100,
  attendanceMax: 50  // min > max
})
// → {
//     isValid: false,
//     errors: {
//       name: "Church name is required",
//       attendanceMin: "Minimum attendance cannot exceed maximum"
//     }
//   }
```

### 5. validateCongregant(data)
**Required:** `name`
**Optional:** `email`
**Returns:** `{ isValid: boolean, errors: object }`

```javascript
validateCongregant({ name: "Jane Smith", email: "jane@example.com" })
// → { isValid: true, errors: {} }
```

## Error Messages

| Field | Error Message |
|-------|---------------|
| name (empty) | "Name is required" |
| church name (empty) | "Church name is required" |
| task title (empty) | "Task title is required" |
| email (invalid) | "Please enter a valid email address" |
| website (invalid) | "Please enter a valid URL (http:// or https://)" |
| attendance (negative) | "[Min\|Max] attendance must be a non-negative number" |
| attendance (min > max) | "Minimum attendance cannot exceed maximum" |
| amount (invalid) | "Amount must be greater than 0" |
| date (missing) | "Date is required" |

## Component Pattern

### State Setup
```javascript
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState('');
```

### Validation Function
```javascript
const validate = () => {
  const result = validateXXX(form);  // Call appropriate validator
  setErrors(result.errors);
  return result.isValid;
};
```

### Save Function
```javascript
const save = async () => {
  if (!validate()) return;           // Stop if invalid
  setLoading(true);
  try {
    // ... save logic ...
    onClose();
  } catch (err) {
    setErrorMessage('Failed to save. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### Field Rendering
```javascript
<Field label="Name" required error={errors.name}>
  <TextInput 
    value={form.name}
    onChange={v => {
      set('name', v);
      if (errors.name) setErrors(e => ({ ...e, name: '' }));
    }}
  />
</Field>
```

### Save Button
```javascript
<button 
  onClick={save} 
  disabled={loading}
  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
>
  {loading && <IconLoader style={{ animation: 'spin 1s linear infinite' }} />}
  Save
</button>
```

### Error Toast
```javascript
<ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
```

## Components Using Validation

| Component | File | Validates |
|-----------|------|-----------|
| StaffModal | EntityModals.jsx | name*, email |
| AdvocateModal | EntityModals.jsx | name*, email |
| ConnectionModal | EntityModals.jsx | name*, email |
| CareCommunityModal | EntityModals.jsx | name* |
| ChurchModal | EntityModals.jsx | name*, email, website, attendance#, date |
| GivingRecordModal | EntityModals.jsx | amount*, date* |
| TaskModal | EntityModals.jsx | title*, date* |
| ChurchForm | Churches.jsx | name*, email, website, attendance# |
| StaffForm | ChurchProfile.jsx | name*, email |
| CongregantForm | ChurchProfile.jsx | name*, email |

Legend: `*` = required, `#` = numeric

## Validation Rules Summary

### Required Fields
- Staff/Advocate/Connection: Name
- Church: Name
- Congregant: Name
- Task: Title, Due Date
- Giving Record: Amount, Date

### Email Validation
- Pattern: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Max length: 254 characters
- Only checked if field has value

### URL Validation
- Protocols allowed: http, https only
- Blocks: javascript, ftp, data protocols
- Only checked if field has value

### Numeric Validation
- Attendance: >= 0 (non-negative)
- Amount: > 0 (strictly positive)
- Min <= Max cross-field check

## Visual States

### Valid State
```
Field Label
[_____________]  ← Normal border
                 ← No error message
```

### Required Field
```
Field Label *    ← Red asterisk
[_____________]
```

### Error State
```
Field Label
[_____________]  ← Border unchanged
⚠ Error message  ← Red text, light red background
```

### Loading State
```
[↻ Save]  ← Button disabled with spinner
```

### Toast Error
```
┌─────────────────────────────────────┐
│ ⚠ Failed to save. Please try again. │
│                                  × │
└─────────────────────────────────────┘
Position: Bottom-right, fixed
```

## Testing Checklist

### Required Fields
- [ ] Empty name → "Name is required"
- [ ] Empty title → "Task title is required"
- [ ] Empty amount → "Amount must be greater than 0"

### Email Validation
- [ ] Valid: john@example.com → No error
- [ ] Invalid: john@example → Error shown
- [ ] Invalid: john@.com → Error shown
- [ ] Empty email (optional) → No error

### URL Validation
- [ ] Valid: https://example.com → No error
- [ ] Valid: http://domain.com → No error
- [ ] Invalid: javascript:alert() → Error shown
- [ ] Invalid: ftp://example.com → Error shown
- [ ] Empty website (optional) → No error

### Numeric Validation
- [ ] Min: 0, Max: 100 → No error
- [ ] Min: -1 → Error shown
- [ ] Min: 100, Max: 50 → Error shown

### User Experience
- [ ] Errors clear on keystroke
- [ ] Save button disabled while invalid
- [ ] Spinner shows during save
- [ ] Error toast appears on failure
- [ ] Tab navigation works
- [ ] Mobile responsive

## Common Patterns

### Checking One Field
```javascript
if (!form.email.trim() || !validateEmail(form.email)) {
  setErrors(prev => ({ ...prev, email: 'Invalid email' }));
}
```

### Checking Multiple Fields
```javascript
const result = validateChurch(form);
setErrors(result.errors);
if (!result.isValid) return;
```

### Auto-clear Errors
```javascript
const handleChange = (field, value) => {
  setForm(prev => ({ ...prev, [field]: value }));
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};
```

### Conditional Field Validation
```javascript
if (form.email) {  // Only validate if provided
  if (!validateEmail(form.email)) {
    errors.email = 'Invalid email';
  }
}
```

## Error Handling Pattern

```javascript
const save = async () => {
  // 1. Validate form
  if (!validate()) return;
  
  // 2. Show loading
  setLoading(true);
  
  // 3. Try to save
  try {
    // ... save logic ...
    onClose();  // Close on success
  } 
  // 4. Catch errors
  catch (err) {
    setErrorMessage('Failed to save. Please try again.');
  } 
  // 5. Always hide loading
  finally {
    setLoading(false);
  }
};
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate between fields |
| Enter | (No submit, use Save button) |
| Escape | Close modal |
| Typing | Clears field error |

## CSS Classes & Styles

**Error container:**
- Background: `rgba(220, 38, 38, 0.05)` (light red)
- Border: `rgba(220, 38, 38, 0.3)` (red)
- Text: `#dc2626` (red)

**Error text:**
- Font size: 12px
- Font color: #dc2626
- Icon: AlertCircle (Tabler Icons)

**Toast error:**
- Background: #dc2626 (red)
- Text: white
- Position: fixed bottom-right
- Z-index: 2000
- Padding: 12px 16px

**Loading spinner:**
- Animation: spin (360deg rotation)
- Duration: 1s
- Timing: linear infinite

## API Summary

### Function Signatures
```javascript
validateEmail(email: string): boolean

validateUrl(url: string): boolean

validateContact(data: object): {
  isValid: boolean,
  errors: { [key: string]: string }
}

validateChurch(data: object): {
  isValid: boolean,
  errors: { [key: string]: string }
}

validateCongregant(data: object): {
  isValid: boolean,
  errors: { [key: string]: string }
}
```

### Error Object Structure
```javascript
{
  name: "Name is required",
  email: "Please enter a valid email address",
  website: "Please enter a valid URL (http:// or https://)",
  attendanceMin: "Minimum attendance cannot exceed maximum"
}
```

## Performance Notes

- ✓ Validation only runs on save (not real-time)
- ✓ All checks are synchronous (no network calls)
- ✓ Regex patterns are simple and fast
- ✓ No extra re-renders
- ✓ Button disabled prevents double-submit

## Security Notes

- ✓ Frontend validation ONLY (not secure)
- ✓ Always validate on backend too
- ✓ Email validation prevents basic injections
- ✓ URL protocol whitelist blocks javascript: and data: URLs
- ✓ Whitespace trimmed before storage
- ⚠️ Never trust client-side validation for security

## Migration Guide

To add validation to an existing form:

1. Import validator: `import { validateXXX } from '../data/validation.js'`
2. Add state: `const [errors, loading, errorMessage] = useState(...)`
3. Add validate function: Calls validator and sets errors
4. Update save: Calls validate, manages loading, handles errors
5. Update fields: Pass `error={errors.fieldName}` to Field
6. Add error toast: Wrap component with ErrorToast

**Time to add:** ~30 minutes per component

---

**Reference Version:** 1.0
**Last Updated:** June 19, 2026
**Status:** Production Ready
