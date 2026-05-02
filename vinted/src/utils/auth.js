export const setAdminCookie = (token) => {
    // In a real app, set httpOnly cookie via backend or secure cookie here
    document.cookie = `adminToken=${token}; path=/; max-age=86400; secure; samesite=strict`;
};

export const getAdminCookie = () => {
    return document.cookie.split('; ').find(row => row.startsWith('adminToken='))?.split('=')[1];
};
