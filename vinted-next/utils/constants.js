export const BASE_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || 'https://vinted.sangvish.com';
export const IMAGE_BASE_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_IMAGE_BASE_URL) || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || 'https://vinted.sangvish.com';

export const DEFAULT_IMAGE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMWY1ZjkiIHJ4PSIxMiIvPjxwYXRoIGQ9Ik0zNSAzMGgzMGMyLjc2IDAgNSAyLjI0IDUgNXYzMGMwIDIuNzYtMi4yNCA1LTUgNUgzNWMtMi43NiAwLTUtMi4yNC01LTVWMzVjMC0yLjc2IDIuMjQtNSA1LTV6bTAgM2MtMS4xIDAtMiAuOS0yIDJ2MzBjMCAxLjEuOSAyIDIgMmgzMGMxLjEgMCAyLS45IDItMlYzNWMwLTEuMS0uOS0yLTItMkgzNXptMTcuNSA3LjVsLTguNSAxMC41aDIybC04LjUtMTAuNS01IDQuNS01LTQuNXptLTggNC41YzEuMzggMCAyLjUtMS4xMiAyLjUtMi41cy0xLjEyLTIuNS0yLjUtMi41LTIuNSAxLjEyLTIuNSAyLjUgMS4xMiAyLjUgMi41IDIuNXoiIGZpbGw9IiM5NGEzYjgiLz48L3N2Zz4=';

export const getImageUrl = (path) => {
    if (!path || String(path).includes('not_found.png')) return DEFAULT_IMAGE_PLACEHOLDER;
    let pathStr = String(path).trim();
    if (pathStr.startsWith('data:')) return pathStr;
    if (pathStr.startsWith('http')) return pathStr;
    
    if (pathStr.startsWith('message_image-')) {
        pathStr = 'images/messages/' + pathStr;
    }

    // Robust normalization for frontend
    let clean = pathStr.replace(/\\/g, '/').replace(/^\/+/, '');
    
    // If it already has protocol, return it
    if (clean.startsWith('http')) return clean;

    const base = IMAGE_BASE_URL || '/';

    // Use absolute path from root if base is '/' or empty
    if (base === '/' || !base) {
        return `/${clean}`;
    }

    // Remove trailing slashes from IMAGE_BASE_URL to prevent double slashes
    const cleanBase = base.replace(/\/+$/, '');
    // Ensure we have a leading slash if the base is relative
    const prefix = cleanBase.startsWith('http') ? cleanBase : `/${cleanBase.replace(/^\/+/, '')}`;
    const url = `${prefix}/${clean}`;
    return url.replace(/([^:]\/)\/+/g, "$1"); // Final check to prevent double slashes but preserve protocol
};

export const getItemImageUrl = (path) => {
    if (!path) {
        const fallback = typeof window !== 'undefined' ? sessionStorage.getItem('imageNotFound') : null;
        if (fallback) return getImageUrl(fallback);
        return DEFAULT_IMAGE_PLACEHOLDER;
    }
    return getImageUrl(path);
};

export const safeString = (val, fallback = '', langCode = null) => {
    if (!val) return fallback;
    if (typeof val === 'object' && val !== null) {
        // Try getting from localStorage, default to 'en'
        const activeLang = langCode || (typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || localStorage.getItem('user_language') || 'en').split('-')[0] : 'en');
        const result = val[activeLang] || val.en || val[Object.keys(val)[0]] || fallback;
        return String(result || fallback);
    }
    return String(val || fallback);
};
