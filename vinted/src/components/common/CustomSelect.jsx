import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaPlus } from 'react-icons/fa';
import { Modal, Button } from 'react-bootstrap';
import './CustomSelect.css';

const CustomSelect = ({ label, options, value, onChange, placeholder, disabled, searchable, onAddOption }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Do not close the dropdown if a modal is open
            if (document.body.classList.contains('modal-open')) return;
            if (event.target.closest('.modal')) return;

            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        const selected = options.find(opt => opt.value === value);
        // Fallback to value if it's a custom-added string (like custom colors)
        setSelectedLabel(selected ? selected.label : (value || ''));
    }, [value, options]);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        if (!searchTerm.trim()) return;
        setShowConfirm(true); // Open React-Bootstrap modal instead of window.confirm
    };

    const confirmCustomAdd = () => {
        onChange(searchTerm);
        if (onAddOption) onAddOption(searchTerm);
        setIsOpen(false);
        setShowConfirm(false);
        setSearchTerm('');
    };

    const cancelCustomAdd = () => {
        setShowConfirm(false);
    };

    const filteredOptions = searchable
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    const exactMatch = filteredOptions.find(opt => opt.label.toLowerCase() === searchTerm.trim().toLowerCase());

    return (
        <>
            <div className={`custom-select-container ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
                {label && <label className="custom-select-label">{label}</label>}
                <div
                    className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                    onClick={() => {
                        if (!disabled) {
                            setIsOpen(!isOpen);
                            if (!isOpen) setSearchTerm('');
                        }
                    }}
                >
                    {searchable && isOpen ? (
                        <input
                            type="text"
                            className="custom-select-search-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Type to search or add..."
                            autoFocus
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span>{selectedLabel || placeholder || 'Select...'}</span>
                    )}
                    <FaChevronDown className="custom-select-arrow" />
                </div>
                {isOpen && (
                    <div className="custom-select-options">
                        {filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                            </div>
                        ))}
                        {searchable && searchTerm.trim() && !exactMatch && (
                            <div className="custom-select-add-option" onClick={handleAddClick}>
                                <FaPlus style={{ marginRight: '8px' }} /> Add "{searchTerm}"
                            </div>
                        )}
                        {filteredOptions.length === 0 && (!searchable || !searchTerm.trim()) && (
                            <div className="custom-select-option no-results">No options available</div>
                        )}
                    </div>
                )}
            </div>

            <Modal show={showConfirm} onHide={cancelCustomAdd} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add Custom Value</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
                        Are you sure you want to add <strong>"{searchTerm}"</strong> to this field?
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={cancelCustomAdd}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={confirmCustomAdd}>
                        Add Option
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default CustomSelect;
