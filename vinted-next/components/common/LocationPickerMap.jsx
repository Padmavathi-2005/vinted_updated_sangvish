'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from '@/utils/axios';
import { useTranslation } from 'react-i18next';
import { 
    FaSearch, 
    FaTimes, 
    FaMapMarkerAlt, 
    FaCrosshairs, 
    FaSpinner, 
    FaExclamationTriangle, 
    FaLightbulb,
    FaMap,
    FaLocationArrow
} from 'react-icons/fa';

let L = null;

const LocationPickerMap = ({ onLocationSelect, initialLat, initialLng, initialLabel, readOnly = false }) => {
    const { t } = useTranslation();
    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const markerRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    const [mapProvider, setMapProvider] = useState('openstreetmap');
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState({
        lat: initialLat || null,
        lng: initialLng || null,
        label: initialLabel || ''
    });
    const [loading, setLoading] = useState(true);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState('');

    // Fetch map settings
    useEffect(() => {
        const fetchMapSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                const s = res.data;
                setMapProvider(s.map_provider || 'openstreetmap');
                setGoogleMapsApiKey(s.google_maps_api_key || '');
            } catch {
                setMapProvider('openstreetmap');
            } finally {
                setLoading(false);
            }
        };
        fetchMapSettings();
    }, []);

    // ─── Place marker helper ────────────────────────────────────────────────
    const placeMarker = useCallback((lat, lng, label) => {
        if (!leafletMapRef.current || !L) return;
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(leafletMapRef.current);
            
            // Add dragend listener
            markerRef.current.on('dragend', async (event) => {
                const marker = event.target;
                const position = marker.getLatLng();
                await handleMapInteraction(position.lat, position.lng);
            });
        }
        markerRef.current.bindPopup(label).openPopup();
        leafletMapRef.current.setView([lat, lng], 14);
    }, []);

    const handleMapInteraction = async (lat, lng) => {
        let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        let addrComp = {};

        try {
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                {
                    headers: {
                        'User-Agent': 'VintedClone/1.0'
                    }
                }
            );
            const geoData = await geoRes.json();
            if (geoData?.display_name) label = geoData.display_name;
            if (geoData?.address) {
                addrComp = {
                    city: geoData.address.city || geoData.address.town || geoData.address.village || '',
                    state: geoData.address.state || '',
                    country: geoData.address.country || '',
                    pincode: geoData.address.postcode || ''
                };
            }
        } catch (_) {}

        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            markerRef.current.bindPopup(label).openPopup();
        }
        
        const loc = { lat, lng, label, ...addrComp };
        setSelectedLocation(loc);
        setSearchQuery(label);
        if (onLocationSelect) onLocationSelect(loc);
    };

    // ─── Initialize OpenStreetMap (Leaflet) ─────────────────────────────────
    useEffect(() => {
        if (loading || mapProvider !== 'openstreetmap' || !mapRef.current) return;
        if (leafletMapRef.current) return;

        const initLeaflet = async () => {
            try {
                L = (await import('leaflet')).default;
                await import('leaflet/dist/leaflet.css');

                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                });

                const defaultLat = initialLat || 20.5937;
                const defaultLng = initialLng || 78.9629;

                const map = L.map(mapRef.current).setView([defaultLat, defaultLng], initialLat ? 13 : 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19,
                }).addTo(map);

                if (initialLat && initialLng) {
                    markerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
                    if (initialLabel) markerRef.current.bindPopup(initialLabel).openPopup();

                    markerRef.current.on('dragend', async (event) => {
                        const marker = event.target;
                        const position = marker.getLatLng();
                        await handleMapInteraction(position.lat, position.lng);
                    });
                }

                map.on('click', async (e) => {
                    const { lat, lng } = e.latlng;
                    await handleMapInteraction(lat, lng);
                });

                leafletMapRef.current = map;
            } catch (err) {
                console.error('Leaflet init error:', err);
            }
        };

        initLeaflet();

        return () => {
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
                markerRef.current = null;
            }
        };
    }, [loading, mapProvider]);

    // ─── Initialize Google Maps ─────────────────────────────────────────────
    useEffect(() => {
        if (loading || mapProvider !== 'google' || !googleMapsApiKey || !mapRef.current) return;

        const scriptId = 'google-maps-sdk';

        const initGoogleMap = () => {
            const defaultLat = initialLat || 20.5937;
            const defaultLng = initialLng || 78.9629;
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: defaultLat, lng: defaultLng },
                zoom: initialLat ? 13 : 5,
            });

            let marker = null;
            if (initialLat && initialLng) {
                marker = new window.google.maps.Marker({ position: { lat: initialLat, lng: defaultLng }, map });
            }

            if (!readOnly) {
                map.addListener('click', (e) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                        const label = status === 'OK' && results[0]
                            ? results[0].formatted_address
                            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                        if (marker) marker.setPosition({ lat, lng });
                        else marker = new window.google.maps.Marker({ position: { lat, lng }, map });
                        const loc = { lat, lng, label };
                        setSelectedLocation(loc);
                        setSearchQuery(label);
                        if (onLocationSelect) onLocationSelect(loc);
                    });
                });
            }
        };

        const existing = document.getElementById(scriptId);
        if (existing) {
            if (window.google?.maps) initGoogleMap();
            else existing.addEventListener('load', initGoogleMap);
        } else {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
            script.async = true;
            script.onload = initGoogleMap;
            document.head.appendChild(script);
        }
    }, [loading, mapProvider, googleMapsApiKey]);

    // ─── Autocomplete: debounced Nominatim search ───────────────────────────
    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
        setLoadingSuggestions(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'VintedClone/1.0'
                    }
                }
            );
            const data = await res.json();
            setSuggestions(data || []);
            setShowSuggestions(true);
        } catch {
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    const handleSearchInput = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
    };

    const handleSuggestionClick = (suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        const label = suggestion.display_name;
        
        let addrComp = {};
        if (suggestion.address) {
            addrComp = {
                city: suggestion.address.city || suggestion.address.town || suggestion.address.village || '',
                state: suggestion.address.state || '',
                country: suggestion.address.country || '',
                pincode: suggestion.address.postcode || ''
            };
        }

        setSearchQuery(label);
        setSuggestions([]);
        setShowSuggestions(false);

        placeMarker(lat, lng, label);
        const loc = { lat, lng, label, ...addrComp };
        setSelectedLocation(loc);
        if (onLocationSelect) onLocationSelect(loc);
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Live GPS Location ──────────────────────────────────────────────────
    const handleLiveLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setLocating(true);
        setLocationError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                let addrComp = {};

                // Reverse geocode to get human-readable label
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                        {
                            headers: {
                                'User-Agent': 'VintedClone/1.0'
                            }
                        }
                    );
                    const data = await res.json();
                    if (data?.display_name) label = data.display_name;
                    if (data?.address) {
                        addrComp = {
                            city: data.address.city || data.address.town || data.address.village || '',
                            state: data.address.state || '',
                            country: data.address.country || '',
                            pincode: data.address.postcode || ''
                        };
                    }
                } catch (_) {}

                placeMarker(lat, lng, label);
                setSearchQuery(label);
                const loc = { lat, lng, label, ...addrComp };
                setSelectedLocation(loc);
                if (onLocationSelect) onLocationSelect(loc);
                setLocating(false);
            },
            (err) => {
                setLocating(false);
                if (err.code === 1) setLocationError('Location access denied. Please allow location in your browser.');
                else if (err.code === 2) setLocationError('Location unavailable. Try again.');
                else setLocationError('Could not get your location. Please try again.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ─── Loading / Error states ─────────────────────────────────────────────
    if (loading) {
        return (
            <div style={styles.placeholder}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('sell_item.loading_map')}</span>
            </div>
        );
    }

    if (mapProvider === 'google' && !googleMapsApiKey) {
        return (
            <div style={{ ...styles.placeholder, background: '#fff7ed', borderColor: '#fb923c', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <p style={{ color: '#c2410c', fontWeight: 600, margin: 0 }}>{t('sell_item.google_key_missing')}</p>
                <p style={{ color: '#9a3412', fontSize: '0.8rem', margin: 0 }}>{t('sell_item.google_key_hint')}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!readOnly && (
                <>
                    {/* Search + Live Location row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                        {/* Autocomplete input wrapper */}
                        <div ref={suggestionsRef} style={{ flex: 1, position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
                                <span style={{ padding: '0 12px', color: '#94a3b8', fontSize: '0.9rem' }}><FaSearch /></span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchInput}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    placeholder={t('sell_item.search_location_placeholder')}
                                    style={styles.searchInput}
                                />
                                {loadingSuggestions && (
                                    <span style={{ padding: '0 12px', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        <FaSpinner className="fa-spin" />
                                    </span>
                                )}
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                                        style={{ padding: '0 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', lineHeight: 1 }}
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <ul style={styles.dropdown}>
                                    {suggestions.map((s, i) => (
                                        <li
                                            key={i}
                                            onClick={() => handleSuggestionClick(s)}
                                            style={styles.dropdownItem}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                            <span style={{ marginRight: '8px', fontSize: '0.9rem', color: '#64748b' }}><FaMapMarkerAlt /></span>
                                            <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{s.display_name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Live Location Button */}
                        <button
                            type="button"
                            onClick={handleLiveLocation}
                            disabled={locating}
                            title={t('sell_item.my_location_tooltip')}
                            style={{
                                ...styles.liveBtn,
                                opacity: locating ? 0.7 : 1,
                                cursor: locating ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {locating ? (
                                <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                    <FaSpinner className="fa-spin" />
                                    <span style={{ fontSize: '0.75rem' }}>{t('sell_item.locating')}</span>
                                </span>
                            ) : (
                                <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                    <FaCrosshairs />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{t('sell_item.my_location')}</span>
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Location error */}
                    {locationError && (
                        <div style={styles.errorBox}>
                            <FaExclamationTriangle /> {locationError}
                        </div>
                    )}

                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaLightbulb style={{ color: '#f59e0b' }} /> <strong>{t('sell_item.tip')}</strong> {t('sell_item.location_tip_text')}
                    </p>
                </>
            )}

            {/* Map Container */}
            <div
                ref={mapRef}
                style={{
                    height: readOnly ? '250px' : '360px',
                    width: '100%',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    overflow: 'hidden',
                    background: '#f1f5f9',
                    zIndex: 0,
                }}
            />

            {/* Selected location label */}
            {selectedLocation.label && (
                <div style={styles.locationLabel}>
                    <FaMapMarkerAlt style={{ marginTop: '3px' }} />
                    <span style={{ fontSize: '0.85rem' }}>{selectedLocation.label}</span>
                </div>
            )}

            {!readOnly && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <FaMap /> {mapProvider === 'openstreetmap' ? 'OpenStreetMap' : 'Google Maps'}
                </p>
            )}
        </div>
    );
};

const styles = {
    placeholder: {
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1',
    },
    searchInput: {
        flex: 1,
        padding: '11px 8px',
        border: 'none',
        outline: 'none',
        fontSize: '0.9rem',
        background: 'transparent',
        minWidth: 0,
    },
    liveBtn: {
        padding: '6px 14px',
        borderRadius: '8px',
        border: 'none',
        background: 'var(--primary-color, #0ea5e9)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 6px rgba(14,165,233,0.3)',
        whiteSpace: 'nowrap',
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        background: '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        listStyle: 'none',
        margin: 0,
        padding: '4px 0',
        zIndex: 9999,
        maxHeight: '240px',
        overflowY: 'auto',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'flex-start',
        padding: '10px 14px',
        cursor: 'pointer',
        background: '#fff',
        transition: 'background 0.1s',
        gap: '6px',
        borderBottom: '1px solid #f1f5f9',
    },
    errorBox: {
        padding: '10px 14px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        fontSize: '0.83rem',
        color: '#dc2626',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    locationLabel: {
        padding: '10px 14px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        color: '#166534',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
    },
};

export default LocationPickerMap;
