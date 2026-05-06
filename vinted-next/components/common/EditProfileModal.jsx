import React, { useState, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import axios from '../../utils/axios';
import { FaTimes, FaUser, FaLock, FaPen, FaCamera, FaMapMarkerAlt, FaCity, FaGlobe, FaMapPin, FaSpinner } from 'react-icons/fa';
import '@/app/styles/EditProfileModal.css';
import { getImageUrl } from '../../utils/constants';
import { useTranslation } from 'react-i18next';
import { 
    validateTextField, 
    getTextFieldError, 
    validateAlphaField, 
    getAlphaError 
} from '../../utils/validation';
import ImageCropModal from './ImageCropModal';

const EditProfileModal = ({ user, onClose, onUpdate, inline }) => {
    const { t } = useTranslation();
    const { logout } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
        password: '',
        confirmPassword: '',
        address: {
            full_name: user.address?.full_name || '',
            address_line: user.address?.address_line || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            country: user.address?.country || '',
            pincode: user.address?.pincode || '',
            lat: user.address?.lat || null,
            lng: user.address?.lng || null,
        }
    });

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const suggestionsRef = React.useRef(null);
    const debounceRef = React.useRef(null);
    const usernameDebounceRef = React.useRef(null);
    const [usernameStatus, setUsernameStatus] = useState({ 
        checked: false, 
        available: true, 
        suggestions: [],
        error: '' 
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(getImageUrl(user.profile_image));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [tempFile, setTempFile] = useState(null);

    // Sync state with props when user changes (especially for inline mode)
    React.useEffect(() => {
        setFormData({
            username: user.username || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            bio: user.bio || '',
            password: '',
            confirmPassword: '',
            address: {
                full_name: user.address?.full_name || '',
                address_line: user.address?.address_line || '',
                city: user.address?.city || '',
                state: user.address?.state || '',
                country: user.address?.country || '',
                pincode: user.address?.pincode || '',
                lat: user.address?.lat || null,
                lng: user.address?.lng || null,
            }
        });
        setPreviewUrl(getImageUrl(user.profile_image));
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;

        // Sanitization
        if (name === 'address.pincode' || name === 'pincode') {
            finalValue = value.replace(/\D/g, '').slice(0, 8);
        }

        if (name.startsWith('address.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, [field]: finalValue }
            }));

            // Handle suggestions for address_line
            if (field === 'address_line') {
                handleAddressSearch(finalValue);
            }
        } else if (name === 'username') {
            // Lowercase and remove spaces/special chars for username
            const cleanUsername = finalValue.replace(/\s+/g, '_').toLowerCase();
            setFormData({ ...formData, username: cleanUsername });
            
            clearTimeout(usernameDebounceRef.current);
            usernameDebounceRef.current = setTimeout(() => {
                checkUsernameAvailability(cleanUsername);
            }, 500);
        } else {
            setFormData({ ...formData, [name]: finalValue });
        }
    };

    const handleAddressSearch = (query) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoadingSuggestions(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
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
        }, 500);
    };

    const checkUsernameAvailability = async (username) => {
        if (!username || username.length < 3) {
            setUsernameStatus({ checked: false, available: true, suggestions: [], error: '' });
            return;
        }

        // If it's the same as original username, it's available
        if (username.toLowerCase() === user.username.toLowerCase()) {
            setUsernameStatus({ checked: true, available: true, suggestions: [], error: '' });
            return;
        }

        try {
            const { data } = await axios.get(`/api/users/check-username/${username}?currentUserId=${user.id}`);
            setUsernameStatus({
                checked: true,
                available: data.available,
                suggestions: data.suggestions || [],
                error: data.available ? '' : t('profile.username_taken', 'This name is already taken.')
            });
        } catch (err) {
            console.error('Username check failed:', err);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        const label = suggestion.display_name;
        
        let addrComp = {
            city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || '',
            state: suggestion.address?.state || '',
            country: suggestion.address?.country || '',
            pincode: suggestion.address?.postcode || ''
        };

        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                address_line: label,
                ...addrComp,
                lat,
                lng
            }
        }));
        
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Close suggestions on outside click
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTempFile(file);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setTempImage(reader.result);
                setShowCropModal(true);
            };
        }
    };

    const handleCropComplete = (croppedImageBlob) => {
        if (!croppedImageBlob) {
            if (tempFile) {
                setProfileImage(tempFile);
                setPreviewUrl(URL.createObjectURL(tempFile));
            }
            setShowCropModal(false);
            setTempImage(null);
            setTempFile(null);
            return;
        }
        const file = new File([croppedImageBlob], "profile_image.jpg", { type: 'image/jpeg' });
        setProfileImage(file);
        setPreviewUrl(URL.createObjectURL(croppedImageBlob));
        setShowCropModal(false);
        setTempFile(null);
    };

    const handleCropCancel = () => {
        setShowCropModal(false);
        setTempImage(null);
        setTempFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Custom Validation
        if (formData.first_name && !validateAlphaField(formData.first_name)) return setError(getAlphaError('First Name'));
        if (formData.last_name && !validateAlphaField(formData.last_name)) return setError(getAlphaError('Last Name'));
        
        if (!formData.username) return setError(t('profile.username_required', 'Display name is required'));
        if (!validateTextField(formData.username)) return setError(getTextFieldError('Display Name'));
        if (!usernameStatus.available) return setError(t('profile.username_taken_error', 'Please choose a different display name.'));
        if (formData.bio && !validateTextField(formData.bio)) return setError(getTextFieldError('Bio'));
        
        if (formData.address.full_name && !validateAlphaField(formData.address.full_name)) 
            return setError(getAlphaError('Full Name on Address'));
            
        if (formData.address.city && !validateAlphaField(formData.address.city)) 
            return setError(getAlphaError('City'));
            
        if (formData.address.state && !validateAlphaField(formData.address.state)) 
            return setError(getAlphaError('State'));
            
        if (formData.address.country && !validateAlphaField(formData.address.country)) 
            return setError(getAlphaError('Country'));

        if (formData.address.pincode && formData.address.pincode.length < 4)
            return setError('Pincode should be at least 4 digits');

        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const payload = new FormData();
            payload.append('username', formData.username);
            payload.append('first_name', formData.first_name);
            payload.append('last_name', formData.last_name);
            payload.append('bio', formData.bio);
            payload.append('address', JSON.stringify(formData.address));
            
            if (formData.password) {
                payload.append('password', formData.password);
            }
            if (profileImage) {
                payload.append('profile_image', profileImage);
            }

            console.log('Sending Profile Update request...');
            const { data } = await axios.put('/api/users/profile', payload, config);
            console.log('Profile update response:', data);
            onUpdate(data);
            if (!inline) onClose(); // Only close if modal
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(t('profile.delete_account_confirm', 'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data, listings, and wallet balance will be lost.'));
        
        if (!confirmDelete) return;

        const secondConfirm = window.confirm(t('profile.delete_account_final_confirm', 'THIS IS THE FINAL WARNING: Click OK to PERMANENTLY delete your account.'));
        if (!secondConfirm) return;

        setLoading(true);
        try {
            await axios.delete('/api/users/delete', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert(t('profile.account_deleted', 'Your account has been successfully deleted. We are sorry to see you go.'));
            logout(); // Log out and redirect
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete account');
            setLoading(false);
        }
    };

    const content = (
        <React.Fragment>
            <div className={inline ? "inline-header" : "modal-header"}>
                <h3>{inline ? '' : t('profile.edit_profile', 'Edit Profile')}</h3>
                {!inline && <button onClick={onClose} className="close-btn"><FaTimes /></button>}
            </div>

            <form onSubmit={handleSubmit} className="edit-profile-form">
                {error && <div className="error-message">{error}</div>}

                <div className="form-group" style={{ alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Profile Preview"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                onError={(e) => {
                                    console.warn(`[Profile] Image failed to load at: ${e.target.src}. Falling back to initials.`);
                                    setPreviewUrl(null); // Fallback to initial display (initials)
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                fontSize: '2rem',
                                fontWeight: 'bold'
                            }}>
                                {(formData.username || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <label htmlFor="profile-image-upload" style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            background: '#0ea5e9',
                            color: 'white',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '2px solid white'
                        }}>
                            <FaCamera size={14} />
                        </label>
                        <input
                            id="profile-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{t('profile.first_name', 'First Name')}</label>
                            <div className="input-with-icon">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="e.g. John"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{t('profile.last_name', 'Last Name')}</label>
                            <div className="input-with-icon">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Doe"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('profile.display_name', 'Display Name')}</label>
                    <div className={`input-with-icon ${!usernameStatus.available ? 'input-error' : ''}`}>
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder={t('profile.enter_username', 'Enter display name')}
                            className={!usernameStatus.available ? 'error' : ''}
                        />
                    </div>
                    {usernameStatus.error && (
                        <div className="username-error-text">{usernameStatus.error}</div>
                    )}
                    {!usernameStatus.available && usernameStatus.suggestions.length > 0 && (
                        <div className="username-suggestions">
                            <span>{t('profile.suggestions', 'Try these instead:')}</span>
                            <div className="suggestion-chips">
                                {usernameStatus.suggestions.map((s, i) => (
                                    <button 
                                        key={i} 
                                        type="button" 
                                        className="suggestion-chip"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, username: s }));
                                            setUsernameStatus({ checked: true, available: true, suggestions: [], error: '' });
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <small className="text-muted" style={{ fontSize: '10px', marginTop: '4px', display: 'block' }}>
                        {t('profile.display_name_hint', 'Display name must be unique and will be shown across the platform.')}
                    </small>
                </div>

                <div className="form-group">
                    <label>{t('profile.bio', 'Bio')}</label>
                    <div className="input-with-icon textarea-wrapper">
                        <FaPen className="input-icon" style={{ marginTop: '12px' }} />
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder={t('profile.tell_us_about', 'Tell us about yourself...')}
                            rows="3"
                        />
                    </div>
                </div>

                <div className="form-section-title">{t('profile.shipping_address_orders', 'Shipping Address (For Orders)')}</div>
                
                <div className="form-group">
                    <label>{t('profile.full_name_on_address', 'Full Name on Address')}</label>
                    <div className="input-with-icon">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            name="address.full_name"
                            value={formData.address.full_name}
                            onChange={handleChange}
                            placeholder="e.g. John Doe"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('profile.street_address', 'Street Address')}</label>
                    <div className="input-with-icon" ref={suggestionsRef} style={{ position: 'relative' }}>
                        <FaMapMarkerAlt className="input-icon" />
                        <input
                            type="text"
                            name="address.address_line"
                            value={formData.address.address_line}
                            onChange={handleChange}
                            placeholder="House No, Street, Landmark"
                            autoComplete="off"
                        />
                        {loadingSuggestions && (
                            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                <FaSpinner className="fa-spin" />
                            </div>
                        )}
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="address-suggestions-dropdown">
                                {suggestions.map((s, i) => (
                                    <li key={i} onClick={() => handleSuggestionClick(s)}>
                                        <FaMapMarkerAlt style={{ marginRight: '8px', color: '#64748b' }} />
                                        <span>{s.display_name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{t('profile.city', 'City')}</label>
                            <div className="input-with-icon">
                                <FaCity className="input-icon" />
                                <input
                                    type="text"
                                    name="address.city"
                                    value={formData.address.city}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{t('profile.state', 'State / Province')}</label>
                            <div className="input-with-icon">
                                <FaGlobe className="input-icon" />
                                <input
                                    type="text"
                                    name="address.state"
                                    value={formData.address.state}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{t('profile.country', 'Country')}</label>
                            <div className="input-with-icon">
                                <FaGlobe className="input-icon" />
                                <input
                                    type="text"
                                    name="address.country"
                                    value={formData.address.country}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{t('profile.pincode', 'Pincode / Zip Code')}</label>
                            <div className="input-with-icon">
                                <FaMapPin className="input-icon" />
                                <input
                                    type="text"
                                    name="address.pincode"
                                    value={formData.address.pincode}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-section-title">{t('profile.change_password_opt', 'Change Password (Optional)')}</div>

                <div className="form-group">
                    <label>{t('profile.new_password', 'New Password')}</label>
                    <div className="input-with-icon">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={t('profile.leave_blank_keep', 'Leave blank to keep current')}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('profile.confirm_password', 'Confirm Password')}</label>
                    <div className="input-with-icon">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder={t('profile.confirm_new_password', 'Confirm new password')}
                        />
                    </div>
                </div>

                <div className="modal-actions" style={inline ? { justifyContent: 'flex-start', marginTop: '20px' } : {}}>
                    {!inline && <button type="button" onClick={onClose} className="btn-cancel">{t('common.cancel', 'Cancel')}</button>}
                    <button type="submit" className="btn-save" disabled={loading} style={inline ? { width: 'auto', padding: '10px 30px' } : {}}>
                        {loading ? t('common.saving', 'Saving...') : t('common.save_changes', 'Save Changes')}
                    </button>
                </div>

                <div className="account-closure-section">
                    <h4 className="account-closure-title">{t('profile.account_closure', 'Account Closure & Privacy')}</h4>
                    <p className="account-closure-text">
                        {t('profile.account_deletion_warning', 'Once you close your account, your data will be permanently removed. Please be certain.')}
                    </p>
                    <button 
                        type="button" 
                        className="btn-close-account" 
                        onClick={handleDeleteAccount}
                        disabled={loading}
                    >
                        {t('profile.delete_my_account', 'Delete My Account')}
                    </button>
                </div>
            </form>
        </React.Fragment>
    );

    if (inline) {
        return (
            <div className="edit-profile-inline">
                {content}
                {showCropModal && (
                    <ImageCropModal
                        image={tempImage}
                        onCropComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspect={1}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {content}
                {showCropModal && (
                    <ImageCropModal
                        image={tempImage}
                        onCropComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspect={1}
                    />
                )}
            </div>
        </div>
    );
};

export default EditProfileModal;
