'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MessagesRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/profile?tab=messages');
    }, [router]);

    return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-white">
            <div className="text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <div style={{ color: '#64748b', fontWeight: '500' }}>Opening your messages...</div>
            </div>
        </div>
    );
}
