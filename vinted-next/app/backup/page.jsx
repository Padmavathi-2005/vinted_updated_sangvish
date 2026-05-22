
'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from '@/utils/axios';

const BackupPage = () => {
    const [status, setStatus] = useState('starting');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const outputRef = useRef('');

    useEffect(() => {
        const runBackup = async () => {
            try {
                setStatus('running');
                
                const baseURL = axios.defaults.baseURL || '';
                const response = await fetch(`${baseURL}/api/settings/db/backup`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    try {
                        const { value, done } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        outputRef.current += chunk;
                        setOutput(outputRef.current);
                        
                        const pre = document.getElementById('log-output');
                        if (pre) pre.scrollTop = pre.scrollHeight;
                    } catch (readErr) {
                        console.warn('Chunk read error (possibly stream closed):', readErr);
                        break; 
                    }
                }

                if (outputRef.current.includes('successfully')) {
                    setStatus('success');
                } else {
                    setStatus('finished');
                }
            } catch (err) {
                console.error('Streaming Error:', err);
                
                // If we already have the success message in the log, don't show "failed"
                if (outputRef.current.includes('successfully')) {
                    setStatus('success');
                } else {
                    setStatus('failed');
                    setError(err.message);
                }
            }
        };

        runBackup();
    }, []);

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#64748b' }}>
                API Endpoint: {axios.defaults.baseURL || 'Default'} (Robust Streaming Mode)
            </div>
            <h1 style={{ color: '#0ea5e9' }}>💾 Database Backup</h1>
            <div style={{ 
                padding: '20px', 
                borderRadius: '8px', 
                backgroundColor: status === 'success' ? '#f0fdf4' : (status === 'failed' ? '#fef2f2' : '#f0f9ff'),
                border: `1px solid ${status === 'success' ? '#bbf7d0' : (status === 'failed' ? '#fecaca' : '#bae6fd')}`
            }}>
                {status === 'starting' && <p>Initializing backup...</p>}
                {status === 'running' && <p>⏳ Running backup process... reading live stream.</p>}
                {status === 'success' && <p style={{ color: '#166534', fontWeight: 'bold' }}>✅ Backup Successful!</p>}
                {status === 'finished' && <p style={{ color: '#1e293b', fontWeight: 'bold' }}>🏁 Process Finished</p>}
                {status === 'failed' && <p style={{ color: '#991b1b', fontWeight: 'bold' }}>❌ Backup Failed</p>}
                
                {error && <div style={{ color: '#dc2626', marginTop: '10px' }}><strong>Error:</strong> {error}</div>}
                
                {output && (
                    <div style={{ marginTop: '20px' }}>
                        <strong>Live Log Output:</strong>
                        <pre 
                            id="log-output"
                            style={{ 
                                backgroundColor: '#1e293b', 
                                color: '#f8fafc', 
                                padding: '15px', 
                                borderRadius: '4px', 
                                overflowY: 'auto',
                                maxHeight: '400px',
                                fontSize: '13px',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {output}
                        </pre>
                    </div>
                )}
            </div>
            <div style={{ marginTop: '20px' }}>
                <a href="/" style={{ color: '#0ea5e9', textDecoration: 'none' }}>← Back to Home</a>
            </div>
        </div>
    );
};

export default BackupPage;
