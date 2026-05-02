import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaChevronDown, FaTimes } from 'react-icons/fa';
import CurrencyContext from '../../context/CurrencyContext';
import './FilterPill.css';

const FilterPill = ({ label, options = [], value, onChange, onClear, type, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempMin, setTempMin] = useState('');
    const [tempMax, setTempMax] = useState('');
    const dropdownRef = useRef(null);
    const { currentCurrency } = useContext(CurrencyContext);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    
    // Sync internal inputs with value prop when opened
    useEffect(() => {
        if (isOpen && type === 'price') {
            if (value && typeof value === 'string') {
                if (value.includes('-')) {
                    const [min, max] = value.split('-');
                    setTempMin(min);
                    setTempMax(max);
                } else if (value.startsWith('>')) {
                    setTempMin(value.slice(1));
                    setTempMax('');
                } else if (value.startsWith('<')) {
                    setTempMin('');
                    setTempMax(value.slice(1));
                }
            } else if (!value) {
                setTempMin('');
                setTempMax('');
            }
        }
    }, [isOpen, type, value]);

    const activeOption = options.find(opt => opt.value === value);
    const displayLabel = activeOption ? activeOption.label : value;
    const hasValue = value !== undefined && value !== null && value !== '';

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="filter-pill-container" ref={dropdownRef}>
            <div 
                className={`filter-pill ${hasValue ? 'active' : ''} ${isOpen ? 'open' : ''} ${(!type && options.length === 0) ? 'no-dropdown' : ''}`}
                onClick={() => {
                    if (type === 'price' || options.length > 0) {
                        setIsOpen(!isOpen);
                    }
                }}
            >
                <span className="filter-pill-label">
                    {hasValue ? (type === 'price' ? `${placeholder}: ${displayLabel}` : displayLabel) : label}
                </span>
                {hasValue ? (
                    <FaTimes 
                        className="filter-pill-clear" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }} 
                    />
                ) : (
                    <FaChevronDown className={`filter-pill-arrow ${isOpen ? 'rotated' : ''}`} />
                )}
            </div>

            {isOpen && (
                <div className="filter-pill-dropdown">
                    {type === 'price' ? (
                        <div className="filter-price-custom p-3">
                            <label className="small mb-2 d-block text-muted fw-bold">Price Range</label>
                            <div className="d-flex gap-2 mb-3">
                                <div className="position-relative w-100">
                                    <span className="position-absolute translate-middle-y text-muted small" style={{ top: '50%', left: '8px' }}>
                                        {currentCurrency?.symbol}
                                    </span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="Min" 
                                        className="form-control form-control-sm ps-4"
                                        value={tempMin}
                                        onChange={(e) => setTempMin(Math.max(0, e.target.value))}
                                    />
                                </div>
                                <div className="position-relative w-100">
                                    <span className="position-absolute translate-middle-y text-muted small" style={{ top: '50%', left: '8px' }}>
                                        {currentCurrency?.symbol}
                                    </span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="Max" 
                                        className="form-control form-control-sm ps-4"
                                        value={tempMax}
                                        onChange={(e) => setTempMax(Math.max(0, e.target.value))}
                                    />
                                </div>
                            </div>
                            <button 
                                className="btn btn-primary btn-sm w-100 fw-bold"
                                onClick={() => {
                                    onChange({ min: tempMin, max: tempMax });
                                    setIsOpen(false);
                                }}
                            >
                                Apply
                            </button>
                        </div>
                    ) : (
                        <div className="filter-options-list">
                            {options.map(opt => (
                                <div 
                                    key={opt.value} 
                                    className={`filter-option ${value === opt.value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(opt.value)}
                                >
                                    {type === 'color' && (
                                        <span 
                                            className="color-dot" 
                                            style={{ backgroundColor: opt.value.toLowerCase() }}
                                        ></span>
                                    )}
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterPill;
