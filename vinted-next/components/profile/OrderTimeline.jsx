import React from 'react';
import { FaCheckCircle, FaTruck, FaBox, FaHome, FaClock } from 'react-icons/fa';

const OrderTimeline = ({ status, history = {} }) => {
    const stages = [
        { key: 'pending', label: 'Ordered', icon: <FaClock />, date: history.created_at },
        { key: 'confirmed', label: 'Confirmed', icon: <FaCheckCircle />, date: history.confirmed_at || history.created_at },
        { key: 'packed', label: 'Packed', icon: <FaBox />, date: history.packed_at },
        { key: 'shipped', label: 'Shipped', icon: <FaTruck />, date: history.shipped_at },
        { key: 'delivered', label: 'Delivered', icon: <FaHome />, date: history.delivered_at },
    ];

    // Find the current stage index
    const statusMap = {
        'placed': 0,
        'pending': 0,
        'confirmed': 1,
        'packed': 2,
        'shipped': 3,
        'out_for_delivery': 3,
        'delivered': 4,
    };

    const currentStageIndex = statusMap[status] ?? -1;

    return (
        <div className="order-timeline-container my-4">
            <div className="order-timeline">
                {stages.map((stage, index) => {
                    const isCompleted = index <= currentStageIndex && status !== 'cancelled';
                    const isCurrent = index === currentStageIndex && status !== 'cancelled';
                    
                    return (
                        <div key={stage.key} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                            <div className="step-icon-wrapper">
                                <div className="step-line" />
                                <div className="step-icon">
                                    {stage.icon}
                                </div>
                            </div>
                            <div className="step-content">
                                <span className="step-label">{stage.label}</span>
                                {stage.date && isCompleted && (
                                    <span className="step-date">{new Date(stage.date).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .order-timeline-container {
                    padding: 20px 10px;
                    background: #fff;
                }
                .order-timeline {
                    display: flex;
                    justify-content: space-between;
                    position: relative;
                    width: 100%;
                }
                .timeline-step {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                }
                .step-icon-wrapper {
                    position: relative;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    margin-bottom: 12px;
                }
                .step-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    border: 3px solid #fff;
                    box-shadow: 0 0 0 1px #e2e8f0;
                    transition: all 0.3s ease;
                    z-index: 2;
                }
                .step-line {
                    position: absolute;
                    top: 18px;
                    left: 50%;
                    width: 100%;
                    height: 3px;
                    background: #e2e8f0;
                    z-index: 1;
                }
                .timeline-step:last-child .step-line {
                    display: none;
                }
                .step-content {
                    text-align: center;
                }
                .step-label {
                    display: block;
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .step-date {
                    display: block;
                    font-size: 10px;
                    color: #94a3b8;
                    margin-top: 2px;
                }

                /* Completed State */
                .timeline-step.completed .step-icon {
                    background: #0ea5e9;
                    color: #fff;
                    box-shadow: 0 0 0 1px #0ea5e9;
                }
                .timeline-step.completed .step-line {
                    background: #0ea5e9;
                }
                .timeline-step.completed .step-label {
                    color: #0ea5e9;
                }

                /* Current State */
                .timeline-step.current .step-icon {
                    background: #fff;
                    color: #0ea5e9;
                    border-color: #0ea5e9;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(14, 165, 233, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
                }

                @media (max-width: 576px) {
                    .step-label { font-size: 9px; }
                    .step-icon { width: 30px; height: 30px; font-size: 12px; }
                    .step-line { top: 15px; }
                }
            `}</style>
        </div>
    );
};

export default OrderTimeline;
