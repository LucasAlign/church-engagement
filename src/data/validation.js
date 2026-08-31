/**
 * Form validation functions for church engagement app
 * Provides RFC-compliant email validation, URL validation, and entity-specific validation
 */

/**
 * Validates email format according to RFC 5322 simplified pattern
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Simplified RFC 5322 pattern that covers most real-world emails
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(trimmed) && trimmed.length <= 254;
}

/**
 * Validates URL format with protocol whitelist
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL with http/https protocol
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates contact data
 * Required: name (non-empty string)
 * Optional: email (must be valid format if provided)
 * @param {object} data - Contact data object
 * @returns {object} Validation result with isValid boolean and errors object
 */
export function validateContact(data) {
  const errors = {};

  // Name is required and must be non-empty
  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required';
  }

  // Email is optional but must be valid format if provided
  if (data.email && data.email.trim()) {
    if (!validateEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates church data
 * Required: name (non-empty string)
 * Optional: email (valid format if provided), website (valid URL if provided)
 * Numeric fields: attendanceMin, attendanceMax must be >= 0
 * @param {object} data - Church data object
 * @returns {object} Validation result with isValid boolean and errors object
 */
export function validateChurch(data) {
  const errors = {};

  // Name is required and must be non-empty
  if (!data.name || !data.name.trim()) {
    errors.name = 'Church name is required';
  }

  // Email is optional but must be valid format if provided
  if (data.email && data.email.trim()) {
    if (!validateEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  // Website is optional but must be valid URL if provided
  if (data.website && data.website.trim()) {
    if (!validateUrl(data.website)) {
      errors.website = 'Please enter a valid URL (http:// or https://)';
    }
  }

  // Numeric fields validation
  if (data.attendanceMin !== undefined && data.attendanceMin !== null && data.attendanceMin !== '') {
    const min = Number(data.attendanceMin);
    if (isNaN(min) || min < 0) {
      errors.attendanceMin = 'Minimum attendance must be a non-negative number';
    }
  }

  if (data.attendanceMax !== undefined && data.attendanceMax !== null && data.attendanceMax !== '') {
    const max = Number(data.attendanceMax);
    if (isNaN(max) || max < 0) {
      errors.attendanceMax = 'Maximum attendance must be a non-negative number';
    }
  }

  // Check min <= max if both provided
  if (data.attendanceMin !== undefined && data.attendanceMax !== undefined &&
      data.attendanceMin !== '' && data.attendanceMax !== '') {
    const min = Number(data.attendanceMin);
    const max = Number(data.attendanceMax);
    if (!isNaN(min) && !isNaN(max) && min >= 0 && max >= 0 && min > max) {
      errors.attendanceMin = 'Minimum attendance cannot exceed maximum';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates congregant data
 * Required: name (non-empty string)
 * Optional: email (valid format if provided)
 * @param {object} data - Congregant data object
 * @returns {object} Validation result with isValid boolean and errors object
 */
export function validateCongregant(data) {
  const errors = {};

  // Name is required and must be non-empty
  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required';
  }

  // Email is optional but must be valid format if provided
  if (data.email && data.email.trim()) {
    if (!validateEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
