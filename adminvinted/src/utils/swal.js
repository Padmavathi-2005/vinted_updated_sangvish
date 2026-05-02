import Swal from 'sweetalert2';
import '../styles/Swal.css';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

export const showToast = (icon, title) => {
    Toast.fire({
        icon: icon, // 'success', 'error', 'warning', 'info', 'question'
        title: title
    });
};

export const showAlert = (icon, title, text) => {
    return Swal.fire({
        icon: icon,
        title: title,
        text: text,
        confirmButtonColor: 'var(--primary-color)',
        customClass: {
            popup: 'premium-swal-popup',
            title: 'premium-swal-title',
            confirmButton: 'premium-swal-confirm'
        }
    });
};

export const showConfirm = (title, text, confirmButtonText = 'Yes, delete it!') => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'premium-swal-popup',
            confirmButton: 'premium-swal-confirm',
            cancelButton: 'premium-swal-cancel'
        }
    });
};

export default Swal;
