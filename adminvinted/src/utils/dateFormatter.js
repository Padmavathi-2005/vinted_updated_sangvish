/**
 * Formats a given date string safely using the global timezone setting.
 * @param {string|Date} dateString - The date to format
 * @param {object} settings - The global settings object containing the timezone
 * @param {object} formatOptions - Override options for Intl.DateTimeFormat
 * @returns {string} The formatted date string
 */
export const formatAdminDate = (dateString, settings = {}, formatOptions = {}) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const defaultOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };

    const options = { ...defaultOptions, ...formatOptions };

    if (settings?.timezone) {
        options.timeZone = settings.timezone;
    }

    try {
        return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (e) {
        // Fallback if timezone is invalid
        if (options.timeZone) {
            delete options.timeZone;
            return new Intl.DateTimeFormat('en-US', options).format(date);
        }
        return date.toLocaleDateString('en-US', options);
    }
};
