import React, { useState, useEffect } from 'react';
import { FaWifi, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import Modal from './Modal';

const NetworkErrorModal = () => {
    const [show, setShow] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleNetworkError = (event) => {
            setErrorMessage(event.detail?.message || 'Connection lost. Please check your internet or if the server is running.');
            setShow(true);
        };

        window.addEventListener('network-error', handleNetworkError);
        return () => window.removeEventListener('network-error', handleNetworkError);
    }, []);

    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <Modal
            show={show}
            onHide={() => setShow(false)}
            title="Network Connection Issue"
            size="md"
            footer={
                <div className="d-flex gap-2 w-100">
                    <button 
                        className="btn btn-outline-secondary flex-grow-1" 
                        onClick={() => setShow(false)}
                        style={{ borderRadius: '10px', padding: '10px' }}
                    >
                        Dismiss
                    </button>
                    <button 
                        className="btn btn-primary flex-grow-1" 
                        onClick={handleRetry}
                        style={{ borderRadius: '10px', padding: '10px' }}
                    >
                        <FaRedo className="me-2" /> Retry
                    </button>
                </div>
            }
        >
            <div className="text-center py-4">
                <div className="mb-4" style={{ position: 'relative', display: 'inline-block' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#fee2e2',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                    }}>
                        <FaWifi style={{ fontSize: '2.5rem', color: '#ef4444' }} />
                    </div>
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        background: 'white',
                        borderRadius: '50%',
                        padding: '4px'
                    }}>
                        <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                    </div>
                </div>
                <h4 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Connection Error</h4>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 auto', maxWidth: '300px' }}>
                    {errorMessage}
                </p>
                <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    <strong>Note:</strong> If this persists, the server might be offline for maintenance.
                </div>
            </div>
        </Modal>
    );
};

export default NetworkErrorModal;
