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

    // 2. Check for sequences of 7 or more digits (likely phone numbers)
    // We allow spaces, dashes, and dots between digits but if there's a long sequence it's suspicious
    const digitSequence = trimmed.replace(/[^0-9]/g, '');
    if (digitSequence.length >= 10) {
        return false;
    }

    return true;
};

export const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

export const getTextFieldError = (fieldName) => {
    return `${fieldName} cannot be numeric-only and should not contain phone numbers.`;
};
