import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import '../../styles/Popup.css';

/* -------------------------------------------------------
   Usage:
   import Popup, { usePopup } from '../components/common/Popup';
   const { popup, showPopup, closePopup, PopupComponent } = usePopup();
   showPopup({ type: 'success', title: 'Done!', message: 'Item added to cart.' });
   <PopupComponent />
------------------------------------------------------- */

const iconMap = {
    success: <FaCheckCircle />,
    error: <FaTimesCircle />,
    warning: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
    confirm: <FaExclamationTriangle />,
};

const Popup = ({ popup, onClose, onConfirm }) => {
    if (!popup) return null;

    const { type = 'info', title, message, confirmText = 'Confirm', cancelText = 'Cancel', showCancel } = popup;

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className={`popup-card popup-${type}`} onClick={e => e.stopPropagation()}>
                <button className="popup-close-btn" onClick={onClose}><FaTimes /></button>
                <div className={`popup-icon-ring popup-icon-${type}`}>
                    {iconMap[type] || iconMap.info}
                </div>
                {title && <h3 className="popup-title">{title}</h3>}
                {message && <p className="popup-message">{message}</p>}
                <div className="popup-actions">
                    {(showCancel || type === 'confirm') && (
                        <button className="popup-btn popup-btn-cancel" onClick={onClose}>
                            {cancelText}
                        </button>
                    )}
                    <button
                        className={`popup-btn popup-btn-${type === 'confirm' ? 'confirm' : type}`}
                        onClick={() => { onConfirm?.(); onClose(); }}
                    >
                        {type === 'confirm' ? confirmText : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const usePopup = () => {
    const [popup, setPopup] = useState(null);

    const showPopup = (options, message = '', type = 'info') => {
        if (typeof options === 'string') {
            setPopup({ title: options, message, type });
            return;
        }

        setPopup(options);
        
        // Auto-close if requested
        if (options?.autoClose) {
            setTimeout(() => {
                setPopup((currentPopup) => {
                    // Only close if it's the exact same popup (preventing premature close of a new popup)
                    if (currentPopup && currentPopup.id === options.id) {
                        return null;
                    }
                    return currentPopup;
                });
            }, options.autoCloseDuration || 3000);
        }
    };
    const closePopup = () => setPopup(null);

    const PopupComponent = () => (
        <Popup popup={popup} onClose={closePopup} onConfirm={popup?.onConfirm} />
    );

    return { popup, showPopup, closePopup, PopupComponent };
};

export default Popup;
