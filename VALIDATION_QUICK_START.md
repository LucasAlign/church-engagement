# Form Validation - Quick Start Guide

## Files Changed

| File | Changes |
|------|---------|
| `/src/data/validation.js` | **NEW** - Core validation module |
| `/src/components/EntityModals.jsx` | Added validation to 8 modal components |
| `/src/pages/Churches.jsx` | Added validation to ChurchForm |
| `/src/pages/ChurchProfile.jsx` | Added validation to StaffForm and CongregantForm |

## What Was Added

### 1. Validation Module (`src/data/validation.js`)

Five validation functions:
- `validateEmail(email)` - Email format check
- `validateUrl(url)` - URL with protocol whitelist
- `validateContact(data)` - Name required, optional email
- `validateChurch(data)` - Name required, email/url/numbers optional
- `validateCongregant(data)` - Name required, optional email

**Usage:**
```javascript
import { validateContact } from '../data/validation.js';

const result = validateContact({ name: "John", email: "john@example.com" });
if (!result.isValid) {
  console.log(result.errors); // { email: "..." }
}
```

### 2. Error Display

**Inline Errors** - Below each field with red highlighting:
```
Email
[________________]
⚠ Please enter a valid email address
```

**Toast Notifications** - Bottom-right corner for save failures:
```
⚠ Failed to save. Please try again.  ×
```

### 3. Loading State

Save button shows spinner while saving:
```
[↻] Save changes  (disabled, spinning icon)
```

### 4. Required Field Indicators

Name field gets red asterisk:
```
Name *
[________________]
```

## Critical Validations (DONE)

✓ Required fields:
  - Contact/Staff: Name
  - Church: Name
  - Congregant: Name
  - Task: Title, Due date
  - Giving: Amount, Date

✓ Email format validation:
  - Pattern: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
  - Works for: john@example.com, user.name+tag@domain.co.uk
  - Rejects: john@example, @domain.com

✓ URL validation:
  - Only http:// and https:// allowed
  - Rejects: javascript:, ftp:, data:

✓ Numeric validation:
  - Attendance: must be >= 0
  - Min <= Max checking
  - Amount: must be > 0

## Implementation Examples

### Adding validation to a new form

1. Import validation function:
```javascript
import { validateContact } from '../data/validation.js';
```

2. Add state:
```javascript
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState('');
```

3. Add validation call:
```javascript
const save = async () => {
  const validation = validateContact(form);
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }
  // ... save logic
};
```

4. Display errors in fields:
```javascript
<Field label="Name" required error={errors.name}>
  <TextInput value={form.name} onChange={...} />
</Field>
```

5. Show loading state:
```javascript
<button onClick={save} disabled={loading}>
  {loading && <IconLoader style={{ animation: 'spin 1s linear infinite' }} />}
  Save
</button>
```

6. Add error toast:
```javascript
<ErrorToast message={errorMessage} onClose={() => setErrorMessage('')} />
```

## Components Updated

### Modal Components (EntityModals.jsx)
1. **StaffModal** - validates name, email
2. **CareCommunityModal** - validates name
3. **AdvocateModal** - validates name, email
4. **ConnectionModal** - validates name, email
5. **ChurchModal** - validates name, email, website, numbers
6. **MinistryModal** - added loading state
7. **GivingRecordModal** - validates amount, date
8. **TaskModal** - validates title, date

### Page Forms
1. **Churches.jsx - ChurchForm** - full validation
2. **ChurchProfile.jsx - StaffForm** - validates name, email
3. **ChurchProfile.jsx - CongregantForm** - validates name, email

## Testing the Validation

### Test Email Validation
```
Valid:   john@example.com, user@domain.co.uk, first.last+tag@example.com
Invalid: john@example (no domain), @example.com (no user), john@.com (no domain name)
```

### Test Name Validation
```
Valid:   "John Smith", "Maria", "III Jr Smith"
Invalid: "" (empty), "   " (whitespace only)
```

### Test URL Validation
```
Valid:   https://example.com, http://sub.domain.com
Invalid: javascript:alert('xss'), ftp://example.com
```

### Test Numeric Validation
```
Valid:   100, 0, 999999
Invalid: -1 (negative), "abc" (not a number)
```

### Test Min/Max Validation
```
Valid:   Min: 50, Max: 100
Invalid: Min: 100, Max: 50 (min > max)
```

## Error Messages

| Scenario | Message |
|----------|---------|
| Empty name | "Name is required" |
| Invalid email | "Please enter a valid email address" |
| Invalid website | "Please enter a valid URL (http:// or https://)" |
| Negative attendance | "Minimum attendance must be a non-negative number" |
| Min > Max | "Minimum attendance cannot exceed maximum" |
| Zero or negative amount | "Amount must be greater than 0" |
| Empty task title | "Task title is required" |
| Missing date | "Date is required" |

## Features by Form

| Form | Required Fields | Optional Validated | Features |
|------|-----------------|-------------------|----------|
| Staff | Name | Email | Inline errors, loading, toast |
| Church | Name | Email, Website, Attendance# | Inline errors, loading, toast, min≤max check |
| Advocate | Name | Email | Inline errors, loading, toast |
| Connection | Name | Email | Inline errors, loading, toast |
| Congregant | Name | Email | Inline errors, loading, toast |
| Care Community | Name | - | Inline errors, loading, toast |
| Ministry | - | - | Loading state only |
| Giving Record | Amount, Date | - | Inline errors, loading, toast |
| Task | Title, Due Date | - | Inline errors, loading, toast |

## Keyboard Behavior

- **Tab** - Move between fields
- **Enter** - Save (if valid and not loading)
- **Escape** - Close modal (handled by Modal component)
- **Typing** - Clears inline error message

## Accessibility

- Required fields marked with `*` and labeled
- Error messages appear below fields
- Error icons with descriptions
- Toast notifications use role="status"
- Loading state visible with spinner icon

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support
- Requires ES6+ support (Arrow functions, Promises, etc.)

## Performance

- Validation runs on save only (not real-time)
- Error clearing happens instantly on keystroke
- No network calls during validation
- Minimal re-renders with React hooks

## Future Enhancements

Could add these later:
1. Real-time validation (on blur vs save)
2. Async validation (check duplicate emails)
3. Custom validators per field
4. Validation on import
5. Field-level undo/reset buttons
6. Internationalized error messages
7. Aria-live regions for screen readers

## Security Notes

✓ Email format prevents @ injection
✓ URL protocol whitelist prevents javascript: urls
✓ Trim whitespace before saving
✓ Validate on server side too (this is frontend only)
✓ Type coercion handled for numbers

## Debugging

Enable console logs in validation.js:
```javascript
export function validateContact(data) {
  console.log('Validating contact:', data);
  const errors = {};
  // ...
  console.log('Validation result:', { isValid: Object.keys(errors).length === 0, errors });
  return { isValid: ..., errors };
}
```

Check React DevTools:
- Look at `errors` state to see what failed
- Check `loading` state to confirm save is in progress
- Check `errorMessage` for any async errors

## Common Issues

**Issue:** Validation doesn't run
- Check: Is validate() being called before save?
- Fix: Add `if (!validate()) return;` at start of save function

**Issue:** Errors don't display
- Check: Is `error={errors.fieldName}` passed to Field?
- Fix: Ensure Field component receives error prop

**Issue:** Error persists after typing
- Check: Is onChange clearing the error?
- Fix: Add `if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));`

**Issue:** Save button never enables
- Check: Is loading state being cleared?
- Fix: Ensure `finally { setLoading(false); }` in save function

## Next Steps

1. **Test thoroughly** - Try each form with invalid data
2. **Check mobile** - Ensure errors display on small screens
3. **Monitor errors** - Log failed validations for UX improvement
4. **Plan enhancements** - Consider real-time validation
5. **Server validation** - Add backend checks too (this is frontend only)
