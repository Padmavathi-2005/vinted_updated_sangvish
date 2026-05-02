export const safeString = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'object') {
        // Since admin doesn't have i18next yet, we default to 'en'
        // or just pick the first available key if 'en' is missing
        return val.en || val[Object.keys(val)[0]] || fallback;
    }
    return String(val);
};

export const getImageUrl = (path) => {
    if (!path) return '';
    const pathStr = String(path);
    if (pathStr.startsWith('http')) return pathStr;

    const baseRaw = import.meta.env.VITE_IMAGE_BASE_URL || '/';
    
    // Normalize path: replace backslashes and remove leading slashes
    let cleanPath = pathStr.replace(/\\/g, '/').replace(/^\/+/, '');

    if (baseRaw === '/' || !baseRaw) {
        return `/${cleanPath}`;
    }

    // Remove trailing slashes from BASE_URL to prevent double slashes
    const cleanBase = baseRaw.replace(/\/+$/, '');
    // Ensure we have a leading slash if the base is relative
    const prefix = cleanBase.startsWith('http') ? cleanBase : `/${cleanBase.replace(/^\/+/, '')}`;
    const url = `${prefix}/${cleanPath}`;
    return url.replace(/([^:]\/)\/+/g, "$1"); // Final check to prevent double slashes but preserve protocol
};
