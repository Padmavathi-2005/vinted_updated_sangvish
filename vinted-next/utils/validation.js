/**
 * Validates that a string is not just numbers and doesn't look like a phone number.
 * @param {string} str - The string to validate.
 * @returns {boolean} - True if valid, false if invalid.
 */
export const validateTextField = (str) => {
    if (!str) return true;
    const trimmed = str.trim();
    if (!trimmed) return true;

    // 1. Check if it's ONLY numbers
    if (/^\d+$/.test(trimmed)) {
        return false;
    }

    // 2. Check for sequences of 10 or more digits (likely phone numbers)
    const digitSequence = trimmed.replace(/[^0-9]/g, '');
    if (digitSequence.length >= 10) {
        return false;
    }

    return true;
};

/**
 * Validates that a string contains only letters, spaces, and basic punctuation.
 * Used for Names, Cities, States, Countries.
 */
export const validateAlphaField = (str) => {
    if (!str) return true;
    const trimmed = str.trim();
    if (!trimmed) return true;

    // Allow letters, spaces, hyphens, and dots (for things like St. Louis)
    // No numbers allowed.
    return /^[a-zA-Z\s.\-']+$/.test(trimmed);
};

export const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

export const getAlphaError = (fieldName) => {
    return `${fieldName} should only contain letters and spaces. Numbers are not allowed.`;
};

export const getTextFieldError = (fieldName) => {
    return `${fieldName} cannot be numeric-only and should not contain phone numbers.`;
};

