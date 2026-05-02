import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaSearch, FaCheck } from 'react-icons/fa';
import { safeString } from '../utils/constants';

const AdminSearchSelect = ({ options, value, onChange, placeholder, searchPlaceholder, error, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) =>
        safeString(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: disabled ? '#f8fafc' : '#fff',
                    border: '1px solid #ced4da',
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    minHeight: '44px',
                    transition: 'all 0.2s',
                    borderColor: error ? '#dc3545' : (isOpen ? 'var(--primary-color)' : '#ced4da'),
                    boxShadow: error ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                    opacity: disabled ? 0.7 : 1
                }}
            >
                <span style={{ color: selectedOption ? '#212529' : '#6c757d', fontSize: '0.95rem' }}>
                    {selectedOption ? safeString(selectedOption.label) : placeholder || 'Select...'}
                </span>
                <FaChevronDown style={{ color: '#6c757d', fontSize: '0.8rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 1050,
                    padding: '8px',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: '0.85rem' }} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder || 'Search...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 36px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        background: value === opt.value ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                                        color: value === opt.value ? 'var(--primary-color)' : '#495057',
                                        fontWeight: value === opt.value ? '600' : '500',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== opt.value) e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== opt.value) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {safeString(opt.label)}
                                    {value === opt.value && <FaCheck style={{ fontSize: '0.8rem' }} />}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSearchSelect;
