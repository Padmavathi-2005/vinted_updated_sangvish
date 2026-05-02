import React from 'react';

const SkeletonCard = () => (
    <div className="vinted-skeleton-card">
        <div className="vinted-skeleton-image" />
        <div className="vinted-skeleton-line" style={{ width: '70%' }} />
        <div className="vinted-skeleton-line" style={{ width: '45%' }} />
    </div>
);

export default SkeletonCard;
