export const getAdminInfo = () => {
    try {
        const adminData = localStorage.getItem('admin') || sessionStorage.getItem('admin');
        return adminData ? JSON.parse(adminData) : null;
    } catch (error) {
        console.error('Error parsing admin info', error);
        return null;
    }
};

export const setAdminInfo = (adminData, rememberMe = true) => {
    const data = JSON.stringify(adminData);
    if (rememberMe) {
        localStorage.setItem('admin', data);
    }
    sessionStorage.setItem('admin', data);
};

export const clearAdminInfo = () => {
    localStorage.removeItem('admin');
    sessionStorage.removeItem('admin');
};
