'use client';

import React, { useEffect, useState } from 'react';
import axios from '@/utils/axios';

const MailCheckPage = () => {
    const [status, setStatus] = useState('starting');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const runMailCheck = async () => {
            try {
                setStatus('sending');
                
                const baseURL = axios.defaults.baseURL || '';
                const response = await fetch(`${baseURL}/api/mail_check`);
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    setStatus('success');
                    setMessage(data.message);
                    setDetails(data.details);
                } else {
                    setStatus('failed');
                    setError(data.message || data.error || 'Failed to send test email.');
                }
            } catch (err) {
                console.error('Mail Check Error:', err);
                setStatus('failed');
                setError(err.message || 'An error occurred while connecting to the mail service.');
            }
        };

        runMailCheck();
    }, []);

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#64748b' }}>
                API Endpoint: {axios.defaults.baseURL || 'Default'} (SMTP Verification Mode)
            </div>
            <h1 style={{ color: '#0ea5e9' }}>📬 Mail Configuration Test</h1>
            <div style={{ 
                padding: '20px', 
                borderRadius: '8px', 
                backgroundColor: status === 'success' ? '#f0fdf4' : (status === 'failed' ? '#fef2f2' : '#f0f9ff'),
                border: `1px solid ${status === 'success' ? '#bbf7d0' : (status === 'failed' ? '#fecaca' : '#bae6fd')}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                {status === 'starting' && <p>Initializing mail verification...</p>}
                {status === 'sending' && <p>⏳ Connecting to SMTP server and sending test email...</p>}
                
                {status === 'success' && (
                    <div>
                        <p style={{ color: '#166534', fontWeight: 'bold', fontSize: '18px', marginBottom: '15px' }}>
                            ✅ Test Email Dispatched Successfully!
                        </p>
                        <p style={{ color: '#1e293b', margin: '5px 0' }}>{message}</p>
                        {details && (
                            <div style={{ 
                                marginTop: '15px', 
                                padding: '15px', 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '6px' 
                            }}>
                                <strong style={{ color: '#0ea5e9', display: 'block', marginBottom: '8px' }}>Delivery Details:</strong>
                                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '4px 0', fontWeight: 'bold', width: '140px', color: '#475569' }}>Recipient:</td>
                                            <td style={{ padding: '4px 0', color: '#1e293b' }}>{details.recipient}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#475569' }}>Timestamp:</td>
                                            <td style={{ padding: '4px 0', color: '#1e293b' }}>{new Date(details.timestamp).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#475569' }}>Status:</td>
                                            <td style={{ padding: '4px 0', color: '#166534', fontWeight: 'bold' }}>Delivered to Relay</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                
                {status === 'failed' && (
                    <div>
                        <p style={{ color: '#991b1b', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
                            ❌ Mail Check Failed
                        </p>
                        <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#ffffff', 
                            border: '1px solid #fee2e2', 
                            borderRadius: '6px',
                            color: '#b91c1c',
                            fontSize: '14px'
                        }}>
                            <strong>Error Details:</strong>
                            <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error}</p>
                        </div>
                    </div>
                )}
            </div>
            <div style={{ marginTop: '30px', display: 'flex', gap: '20px' }}>
                <a href="/" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: '500' }}>← Back to Home</a>
            </div>
        </div>
    );
};

export default MailCheckPage;
