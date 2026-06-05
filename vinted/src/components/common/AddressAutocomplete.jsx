import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaMapMarkerAlt, FaSpinner, FaCrosshairs, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const AddressAutocomplete = ({ initialValue, onSelect }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState(initialValue || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (initialValue && !query) {
            setQuery(initialValue);
        }
    }, [initialValue]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (searchText) => {
        if (!searchText || searchText.length < 3) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&limit=5&addressdetails=1`);
            const data = await res.json();
            setSuggestions(data || []);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 500);
    };

    const parseAddress = (item) => {
        const addr = item.address || {};
        return {
            address_line: item.display_name || '',
            city: addr.city || addr.town || addr.village || '',
            state: addr.state || '',
            country: addr.country || '',
            pincode: addr.postcode || '',
            lat: item.lat,
            lng: item.lon
        };
    };

    const handleSelect = (item) => {
        const structured = parseAddress(item);
        setQuery(item.display_name);
        setShowSuggestions(false);
        if (onSelect) onSelect(structured);
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert(t('profile.geolocation_not_supported', 'Geolocation is not supported by your browser'));
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
                    const data = await res.json();
                    if (data && !data.error) {
                        const structured = parseAddress(data);
                        setQuery(data.display_name);
                        if (onSelect) onSelect(structured);
                    }
                } catch (err) {
                    console.error("Reverse geocoding error:", err);
                } finally {
                    setLocating(false);
                }
            },
            (err) => {
                console.error("Geolocation error:", err);
                alert(t('profile.geolocation_error', 'Unable to retrieve your location'));
                setLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flex: 1, 
                    border: '1px solid #ced4da', 
                    borderRadius: '0.25rem',
                    background: '#fff',
                    padding: '0 10px',
                    position: 'relative'
                }}>
                    <FaSearch style={{ color: '#6c757d' }} />
                    <input 
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        placeholder={t('profile.search_address', 'Search address...')}
                        style={{
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            padding: '10px',
                            background: 'transparent'
                        }}
                    />
                    {loading && <FaSpinner className="fa-spin" style={{ color: '#6c757d', marginLeft: '5px' }} />}
                    {query && !loading && (
                        <FaTimes 
                            style={{ cursor: 'pointer', color: '#6c757d', marginLeft: '5px' }} 
                            onClick={() => {
                                setQuery('');
                                setSuggestions([]);
                                setShowSuggestions(false);
                            }}
                        />
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleCurrentLocation}
                    disabled={locating}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0 15px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ced4da',
                        borderRadius: '0.25rem',
                        cursor: locating ? 'not-allowed' : 'pointer',
                        color: '#495057',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {locating ? <FaSpinner className="fa-spin" /> : <FaCrosshairs />}
                    {t('profile.current_location', 'Current Location')}
                </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    marginTop: '4px'
                }}>
                    {suggestions.map((s, i) => (
                        <li 
                            key={i} 
                            onClick={() => handleSelect(s)}
                            style={{
                                padding: '10px 15px',
                                cursor: 'pointer',
                                borderBottom: i < suggestions.length - 1 ? '1px solid #eee' : 'none',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <FaMapMarkerAlt style={{ color: '#6c757d', marginTop: '2px', flexShrink: 0 }} />
                            <span>{s.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AddressAutocomplete;
