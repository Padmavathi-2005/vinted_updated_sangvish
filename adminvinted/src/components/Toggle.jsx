import React from 'react';
import './Toggle.css';

const Toggle = ({ checked, onChange, disabled, label }) => {
    return (
        <label className={`admin-toggle ${disabled ? 'disabled' : ''}`}>
            <div className="admin-toggle-switch">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <span className="admin-toggle-slider"></span>
            </div>
            {label && <span className="admin-toggle-label">{label}</span>}
        </label>
    );
};

export default Toggle;
