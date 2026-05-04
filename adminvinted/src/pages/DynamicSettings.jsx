import React, { useState, useEffect } from 'react';
import { 
    FaCloudUploadAlt, FaSave, FaUndo, FaImage, FaChevronDown, 
    FaCcStripe, FaPaypal, FaChevronRight, FaPlus, FaTrash, 
    FaGoogle, FaFacebookSquare, FaApple, FaGlobe, FaShieldAlt,
    FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube, FaTiktok, FaExternalLinkAlt
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Form, Button, Row, Col, Card, InputGroup, Container, Accordion, Nav } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useLocalization } from '../context/LocalizationContext';
import axios, { imageBaseURL } from '../utils/axios';
import AdminSearchSelect from '../components/AdminSearchSelect';
import Toggle from '../components/Toggle';
import { showToast } from '../utils/swal';
import { PaymentMethodsList } from './PaymentMethods';
import '../styles/DynamicSettings.css';
import '../styles/Settings.css';

const DynamicSettings = () => {
    const [allTimezones, setAllTimezones] = useState([]);
    const { type } = useParams();
    const { getSettingsByType, updateSettingsByType } = useSettings();
    const { t } = useLocalization();

    const [formData, setFormData] = useState({});
    const [previews, setPreviews] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeGlobalLang, setActiveGlobalLang] = useState('en');
    const [settingTypes, setSettingTypes] = useState([]);
    const [expandedGateways, setExpandedGateways] = useState(['stripe', 'paypal', 'google', 'recaptcha']);
    const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'methods'
    const navigate = useNavigate();

    const [languages, setLanguages] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [pages, setPages] = useState([]);

    useEffect(() => {
        fetchData();
    }, [type]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsData, langRes, currRes, pageRes, typesRes, tzRes] = await Promise.all([
                getSettingsByType(type),
                axios.get('/api/admin/languages'),
                axios.get('/api/admin/currencies'),
                axios.get('/api/pages'),
                axios.get('/api/settings/types'),
                axios.get('/api/timezones')
            ]);

            if (settingsData) {
                setFormData(settingsData);
                // Initialize previews
                const previewFields = ['site_logo', 'site_favicon', 'stripe_logo', 'paypal_logo'];
                previewFields.forEach(field => {
                    if (settingsData[field]) {
                        setPreviews(prev => ({ ...prev, [field]: `${imageBaseURL.endsWith('/') ? imageBaseURL.slice(0, -1) : imageBaseURL}/${settingsData[field].startsWith('/') ? settingsData[field].substring(1) : settingsData[field]}` }));
                    }
                });
            }
            setLanguages(langRes.data);
            setCurrencies(currRes.data);
            setPages(pageRes.data);
            setSettingTypes(typesRes.data);
            setAllTimezones(tzRes.data.map(tz => {
                const parts = tz.name.split('/');
                let label = tz.name;
                if (parts.length > 1) {
                    const region = parts[0];
                    const city = parts[parts.length - 1].replace(/_/g, ' ');
                    label = `${city} (${region})`;
                } else if (tz.name === 'UTC') {
                    label = 'UTC (Universal Coordinated Time)';
                }
                return { label, value: tz.name };
            }));
        } catch (error) {
            console.error("Error fetching settings data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'number') {
            const num = parseFloat(value);
            if (num <= 0) return; // Ignore zero or negative
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        const name = e.target.name;
        if (file) {
            setFormData(prev => ({ ...prev, [name]: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [name]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const data = new FormData();
        const skipFields = ['_id', '__v', 'created_at', 'updated_at', 'type', 'general_settings', 'admin_settings'];

        const allowedFields = getFieldsForType(type);

        Object.keys(formData).forEach(key => {
            // Include social link files even if not in allowedFields directly (they are nested in social_links in the model)
            if ((allowedFields.includes(key) || key.startsWith('social_icon_')) && !skipFields.includes(key) && formData[key] !== null && formData[key] !== undefined) {
                const value = formData[key];

                if (value instanceof File) {
                    data.append(key, value);
                } else if (typeof value === 'object' && value !== null) {
                    if (value._id) {
                        data.append(key, value._id);
                    } else {
                        data.append(key, JSON.stringify(value));
                    }
                } else {
                    // Filter out empty strings for ObjectId fields to prevent 500 error
                    if (key.includes('_id')) {
                        if (value === '' || value === null) return;
                        // If it's an object with _id, use _id
                        if (typeof value === 'object' && value._id) {
                            data.append(key, value._id);
                            return;
                        }
                    }
                    data.append(key, value);
                }
            }
        });

        const result = await updateSettingsByType(type, data);
        if (result.success) {
            showToast('success', 'Settings updated successfully!');
        } else {
            showToast('error', 'Error updating settings');
        }
        setSaving(false);
    };

    if (loading) return <div className="p-4 text-center">Loading settings...</div>;

    const handleLocalizedChange = (gatewayId, lang, field, value) => {
        setFormData(prev => {
            const translations = { ...(prev[`${gatewayId}_translations`] || {}) };
            if (!translations[lang]) translations[lang] = {};
            translations[lang][field] = value;
            return { ...prev, [`${gatewayId}_translations`]: translations };
        });
    };

    const handleGenericLocalizedChange = (key, lang, value) => {
        setFormData(prev => {
            const fieldVal = { ...(typeof prev[key] === 'object' ? prev[key] : { [lang]: prev[key] || '' }) };
            fieldVal[lang] = value;
            return { ...prev, [key]: fieldVal };
        });
    };

    const toggleGateway = (id) => {
        setExpandedGateways(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const renderPaymentGateways = () => {
        const gateways = [
            { id: 'stripe', prefix: 'stripe_', name: 'Stripe Checkout', icon: <FaCcStripe className="text-primary" /> },
            { id: 'paypal', prefix: 'paypal_', name: 'PayPal Standard', icon: <FaPaypal className="text-primary" /> }
        ];

        return (
            <div className="payment-gateways-section">
                <p className="ds-section-subtitle mb-4">You can enable and disable your payment gateways from here</p>

                {gateways.map(gw => {
                    const isEnabled = formData[`${gw.prefix}enabled`];
                    const isTestMode = formData[`${gw.prefix}test_mode`];
                    const translations = formData[`${gw.id}_translations`] || {};
                    const preview = previews[`${gw.id}_logo`];
                    const isExpanded = expandedGateways.includes(gw.id);

                    return (
                        <div key={gw.id} className="ds-gateway-card mb-4 border rounded shadow-sm overflow-hidden">
                            <div
                                className="ds-gateway-header d-flex align-items-center justify-content-between p-3 bg-light cursor-pointer"
                                onClick={() => toggleGateway(gw.id)}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    {gw.icon}
                                    <span className="fw-bold">{gw.name}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <span className={`ds-status-badge ${isEnabled ? 'active' : ''}`}>
                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <FaChevronDown
                                        className={`transition-all opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="ds-gateway-body p-4 bg-white">
                                    <Row className="gy-4">
                                        <Col md={12}>
                                            <Toggle
                                                label={`Enable ${gw.name}`}
                                                checked={isEnabled || false}
                                                onChange={(val) => setFormData({ ...formData, [`${gw.prefix}enabled`]: val })}
                                            />
                                        </Col>

                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="form-label-bold">Custom Name ({activeGlobalLang.toUpperCase()})</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    className="ds-input"
                                                    value={translations[activeGlobalLang]?.name || ''}
                                                    onChange={(e) => handleLocalizedChange(gw.id, activeGlobalLang, 'name', e.target.value)}
                                                    placeholder="Enter name (e.g. Credit Card)"
                                                />
                                            </Form.Group>
                                        </Col>

                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="form-label-bold">Description ({activeGlobalLang.toUpperCase()})</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={2}
                                                    className="ds-input"
                                                    value={translations[activeGlobalLang]?.description || ''}
                                                    onChange={(e) => handleLocalizedChange(gw.id, activeGlobalLang, 'description', e.target.value)}
                                                    placeholder="Enter description"
                                                />
                                            </Form.Group>
                                        </Col>

                                        <Col md={12}>
                                            <Form.Label className="form-label-bold">Logo</Form.Label>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="ds-logo-box border p-2 bg-light rounded" style={{ minWidth: '60px', textAlign: 'center' }}>
                                                    {preview ? <img src={preview} alt="Logo" style={{ height: '32px' }} /> : <FaImage size={24} className="text-muted" />}
                                                </div>
                                                <div className="position-relative">
                                                    <Button variant="outline-secondary" size="sm" className="rounded-pill px-3">Browse image</Button>
                                                    <input
                                                        type="file"
                                                        onChange={handleFileChange}
                                                        name={`${gw.id}_logo`}
                                                        className="position-absolute start-0 top-0 w-100 h-100 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </Col>

                                        <Col md={12}>
                                            <div className="bg-light p-3 rounded border">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <span className="fw-bold small text-uppercase">API Credentials</span>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="xx-small text-muted">Test Mode</span>
                                                        <Toggle
                                                            checked={isTestMode || false}
                                                            onChange={(val) => setFormData({ ...formData, [`${gw.prefix}test_mode`]: val })}
                                                            size="sm"
                                                        />
                                                    </div>
                                                </div>
                                                <Row className="gy-3">
                                                    {gw.id === 'stripe' ? (
                                                        isTestMode ? (
                                                            <>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">TEST PUBLIC KEY</Form.Label>
                                                                    <Form.Control type="text" className="ds-input" name="stripe_test_public_key" value={formData.stripe_test_public_key || ''} onChange={handleInputChange} autoComplete="off" />
                                                                </Col>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">TEST SECRET KEY</Form.Label>
                                                                    <Form.Control type="password" name="stripe_test_secret_key" value={formData.stripe_test_secret_key || ''} onChange={handleInputChange} className="ds-input" autoComplete="new-password" />
                                                                </Col>
                                                                <Col md={12}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">TEST WEBHOOK SECRET</Form.Label>
                                                                    <Form.Control type="password" name="stripe_test_webhook_secret" value={formData.stripe_test_webhook_secret || ''} onChange={handleInputChange} className="ds-input" autoComplete="new-password" />
                                                                </Col>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">LIVE PUBLIC KEY</Form.Label>
                                                                    <Form.Control type="text" className="ds-input" name="stripe_live_public_key" value={formData.stripe_live_public_key || ''} onChange={handleInputChange} autoComplete="off" />
                                                                </Col>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">LIVE SECRET KEY</Form.Label>
                                                                    <Form.Control type="password" name="stripe_live_secret_key" value={formData.stripe_live_secret_key || ''} onChange={handleInputChange} className="ds-input" autoComplete="new-password" />
                                                                </Col>
                                                                <Col md={12}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">LIVE WEBHOOK SECRET</Form.Label>
                                                                    <Form.Control type="password" name="stripe_live_webhook_secret" value={formData.stripe_live_webhook_secret || ''} onChange={handleInputChange} className="ds-input" autoComplete="new-password" />
                                                                </Col>
                                                            </>
                                                        )
                                                    ) : (
                                                        // PayPal
                                                        isTestMode ? (
                                                            <>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">SANDBOX CLIENT ID</Form.Label>
                                                                    <Form.Control type="text" className="ds-input" name="paypal_test_client_id" value={formData.paypal_test_client_id || ''} onChange={handleInputChange} autoComplete="off" />
                                                                </Col>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">SANDBOX SECRET KEY</Form.Label>
                                                                    <Form.Control type="password" name="paypal_test_client_secret" value={formData.paypal_test_client_secret || ''} onChange={handleInputChange} className="ds-input" autoComplete="new-password" />
                                                                </Col>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">LIVE CLIENT ID</Form.Label>
                                                                    <Form.Control type="text" className="ds-input" name="paypal_live_client_id" value={formData.paypal_live_client_id || ''} onChange={handleInputChange} autoComplete="off" />
                                                                </Col>
                                                                <Col md={6}>
                                                                    <Form.Label className="xx-small fw-bold text-muted uppercase">LIVE SECRET KEY</Form.Label>
                                                                    <Form.Control type="password" name="paypal_live_client_secret" value={formData.paypal_live_client_secret || ''} onChange={handleInputChange} className="ds-input" autoComplete="new-password" />
                                                                </Col>
                                                            </>
                                                        )
                                                    )}
                                                </Row>
                                                <div className="ds-help-box">
                                                    <span className="ds-help-title">Configuration Help</span>
                                                    <div className="mb-3">
                                                        <span className="ds-help-label">Webhook URL (Copy to {gw.name} Dashboard):</span>
                                                        <div className="ds-url-code">
                                                            <code>
                                                                {formData.site_url ? `${formData.site_url.replace(/\/$/, '')}/api/payments/webhook` : `${window.location.protocol}//${window.location.host}/api/payments/webhook`}
                                                            </code>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="xx-small"
                                                                onClick={() => {
                                                                    const url = formData.site_url ? `${formData.site_url.replace(/\/$/, '')}/api/payments/webhook` : `${window.location.protocol}//${window.location.host}/api/payments/webhook`;
                                                                    navigator.clipboard.writeText(url);
                                                                    showToast('success', 'URL copied to clipboard');
                                                                }}
                                                            >
                                                                Copy
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {gw.id === 'paypal' && (
                                                        <div>
                                                            <span className="ds-help-label">Return URL:</span>
                                                            <div className="ds-url-code">
                                                                <code>
                                                                    {formData.site_url ? `${formData.site_url.replace(/\/$/, '')}/checkout/success` : `${window.location.protocol}//${window.location.host}/checkout/success`}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderRecaptchaSettings = () => {
        const isEnabled = formData.recaptcha_enabled;
        const isExpanded = expandedGateways.includes('recaptcha');

        return (
            <div className="recaptcha-settings-section">
                <div className="ds-section-title mb-1">
                    GOOGLE RECAPTCHA
                </div>
                <p className="ds-section-subtitle mb-4">Protect your forms from automated abuse using invisible bot detection</p>

                <div className="ds-gateway-card mb-4 border rounded shadow-sm overflow-hidden">
                    <div
                        className="ds-gateway-header d-flex align-items-center justify-content-between p-3 bg-light cursor-pointer"
                        onClick={() => toggleGateway('recaptcha')}
                    >
                        <div className="d-flex align-items-center gap-3">
                            <FaGoogle className="text-primary" />
                            <span className="fw-bold">Google reCAPTCHA v3</span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <span className={`ds-status-badge ${isEnabled ? 'active' : ''}`}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <FaChevronDown
                                className={`transition-all opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="ds-gateway-body p-4 bg-white">
                            <Row className="gy-4">
                                <Col md={12}>
                                    <Toggle
                                        label="Enable reCAPTCHA v3"
                                        checked={isEnabled || false}
                                        onChange={(val) => setFormData({ ...formData, recaptcha_enabled: val })}
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-bold">Site Key</Form.Label>
                                        <Form.Control
                                            type="text"
                                            className="ds-input"
                                            name="recaptcha_site_key"
                                            value={formData.recaptcha_site_key || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter your Site Key"
                                            autoComplete="off"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-bold">Secret Key</Form.Label>
                                        <Form.Control
                                            type="password"
                                            className="ds-input"
                                            name="recaptcha_secret_key"
                                            value={formData.recaptcha_secret_key || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter your Secret Key"
                                            autoComplete="new-password"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            
                            <div className="ds-help-box mt-4 bg-light p-3 rounded border">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <FaSave className="text-primary small" />
                                    <h6 className="fw-bold m-0 small text-uppercase">Quick Setup Guide</h6>
                                </div>
                                <p className="xx-small text-muted mb-3">
                                    reCAPTCHA v3 operates in the background and returns a score for each request. 
                                    A score of 1.0 indicates a likely human, while 0.0 indicates a likely bot.
                                </p>
                                <div className="recaptcha-steps">
                                    <div className="fw-bold xx-small text-primary mb-2 text-uppercase tracking-wider">How to get your keys:</div>
                                    <ol className="mb-0 ps-3 xx-small text-muted leading-relaxed">
                                        <li className="mb-1">Go to the <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer" className="text-primary text-decoration-none fw-bold">Google reCAPTCHA Admin Console</a>.</li>
                                        <li className="mb-1">Click the <b>+ (Create)</b> icon to register a new site.</li>
                                        <li className="mb-1">Select <b>reCAPTCHA v3</b> as the type.</li>
                                        <li className="mb-1">Add your domains (e.g., <code>resale.com</code> or <code>localhost</code>).</li>
                                        <li className="mb-1">Accept the terms and click <b>Submit</b>.</li>
                                        <li>Copy the <b>Site Key</b> and <b>Secret Key</b> into the fields above.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSocialLoginSettings = () => {
        const platforms = [
            { id: 'google', name: 'Google Login', icon: <FaGoogle className="text-danger" /> },
            { id: 'facebook', name: 'Facebook Login', icon: <FaFacebookSquare className="text-primary" /> },
            { id: 'twitter', name: 'X (Twitter) Login', icon: <FaXTwitter className="text-dark" /> },
            { id: 'apple', name: 'Apple Login', icon: <FaApple className="text-dark" /> }
        ];

        return (
            <div className="social-login-section">
                <p className="ds-section-subtitle mb-4">Manage Google, Facebook and X (Twitter) authentication settings</p>

                {platforms.map(platform => {
                    const isEnabled = formData[`${platform.id}_enabled`];
                    const isExpanded = expandedGateways.includes(platform.id);

                    return (
                        <div key={platform.id} className="ds-gateway-card mb-4 border rounded shadow-sm overflow-hidden">
                            <div
                                className="ds-gateway-header d-flex align-items-center justify-content-between p-3 bg-light cursor-pointer"
                                onClick={() => toggleGateway(platform.id)}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    {platform.icon}
                                    <span className="fw-bold">{platform.name}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <span className={`ds-status-badge ${isEnabled ? 'active' : ''}`}>
                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <FaChevronDown
                                        className={`transition-all opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="ds-gateway-body p-4 bg-white">
                                    <Row className="gy-4">
                                        <Col md={12}>
                                            <Toggle
                                                label={`Enable ${platform.name}`}
                                                checked={isEnabled || false}
                                                onChange={(val) => setFormData({ ...formData, [`${platform.id}_enabled`]: val })}
                                            />
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="form-label-bold">{platform.name} Client ID</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    className="ds-input"
                                                    name={`${platform.id}_client_id`}
                                                    value={formData[`${platform.id}_client_id`] || ''}
                                                    onChange={handleInputChange}
                                                    placeholder={`Enter ${platform.name} Client ID`}
                                                    autoComplete="off"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="form-label-bold">{platform.name} Client Secret</Form.Label>
                                                <Form.Control
                                                    type="password"
                                                    className="ds-input"
                                                    name={`${platform.id}_client_secret`}
                                                    value={formData[`${platform.id}_client_secret`] || ''}
                                                    onChange={handleInputChange}
                                                    placeholder={`Enter ${platform.name} Client Secret`}
                                                    autoComplete="new-password"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCurrencySection = () => {
        return (
            <div className="currency-settings mb-5 p-4 bg-white shadow-sm rounded">
                <div className="section-header-simple mb-4">
                    <h6 className="fw-bold m-0 border-bottom pb-2">Currency</h6>
                </div>
                <Row className="gy-4">
                    <Col md={12}>
                        <Form.Label className="small fw-bold">Main Currency</Form.Label>
                        <AdminSearchSelect
                            options={currencies.map(c => ({ value: c._id, label: `${c.name} (${c.code})` }))}
                            value={formData.default_currency_id || ''}
                            onChange={(val) => setFormData({ ...formData, default_currency_id: val })}
                        />
                        <Form.Text className="text-muted xx-small">The primary currency for your marketplace.</Form.Text>
                    </Col>

                    <Col md={12} className="border-top pt-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="small fw-bold m-0">Extra Currencies</h6>
                            <Button variant="outline-primary" size="sm" className="xx-small" onClick={() => showToast('info', 'Additional currency management')}><FaPlus /> Add Items</Button>
                        </div>
                        {currencies.filter(c => c._id !== formData.default_currency_id).map(c => (
                            <div key={c._id} className="currency-row p-3 bg-light rounded border mb-2 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                    <span className="fw-bold small">{c.code}</span>
                                    <span className="text-muted small">{c.name}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="xx-small text-muted">Exchange Rate: 1.0</div>
                                    <Button variant="link" className="text-danger p-0"><FaTrash size={12} /></Button>
                                </div>
                            </div>
                        ))}
                    </Col>
                </Row>
            </div>
        );
    };

    const renderSocialLinks = () => {
        const links = formData.social_links || [];

        const handleAddLink = () => {
            setFormData({
                ...formData,
                social_links: [...links, { platform: '', icon: '', url: '' }]
            });
        };

        const handleRemoveLink = (index) => {
            setFormData({
                ...formData,
                social_links: links.filter((_, i) => i !== index)
            });
        };

        const handleLinkChange = (index, field, value) => {
            const newLinks = [...links];
            newLinks[index] = { ...newLinks[index], [field]: value };
            setFormData({ ...formData, social_links: newLinks });
        };

        const renderIcon = (iconName) => {
            if (!iconName) return <FaImage size={14} />;
            
            const iconProps = { size: 18 };
            switch (iconName) {
                case 'FaFacebookF': return <FaFacebookF {...iconProps} style={{ color: '#1877F2' }} />;
                case 'FaXTwitter': return <FaXTwitter {...iconProps} style={{ color: '#000000' }} />;
                case 'FaInstagram': return <FaInstagram {...iconProps} style={{ color: '#E4405F' }} />;
                case 'FaLinkedinIn': return <FaLinkedinIn {...iconProps} style={{ color: '#0A66C2' }} />;
                case 'FaYoutube': return <FaYoutube {...iconProps} style={{ color: '#FF0000' }} />;
                case 'FaTiktok': return <FaTiktok {...iconProps} style={{ color: '#000000' }} />;
                case 'FaExternalLinkAlt': return <FaExternalLinkAlt {...iconProps} />;
                default: return <FaImage size={14} />;
            }
        };

        const handleLinkFileChange = (index, e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => ({ ...prev, [`social_icon_${index}`]: reader.result }));
                    setFormData(prev => ({ ...prev, [`social_icon_${index}`]: file }));
                };
                reader.readAsDataURL(file);
            }
        };

        const icons = [
            { label: 'Select Icon...', value: '' },
            { label: 'Facebook', value: 'FaFacebookF' },
            { label: 'X (Twitter)', value: 'FaXTwitter' },
            { label: 'Instagram', value: 'FaInstagram' },
            { label: 'LinkedIn', value: 'FaLinkedinIn' },
            { label: 'YouTube', value: 'FaYoutube' },
            { label: 'TikTok', value: 'FaTiktok' },
            { label: 'External', value: 'FaExternalLinkAlt' }
        ];

        return (
            <Col key="social_links" md={12} className="mb-4">
                <div className="ds-section-card p-4 border rounded bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="fw-bold text-uppercase small tracking-wider"><FaGlobe className="me-2" /> Social Links & Profiles</div>
                        <Button variant="primary" size="sm" onClick={handleAddLink}>
                            <FaPlus className="me-2" /> Add Social Profile
                        </Button>
                    </div>
                    {links.length === 0 ? (
                        <div className="py-5 text-center bg-light rounded text-muted">
                            No social profiles added yet. Click the button to add.
                        </div>
                    ) : (
                        <Row className="gy-4">
                            {links.map((link, idx) => (
                                <Col key={idx} md={12}>
                                    <div className="p-3 bg-light rounded border-start border-4 border-primary position-relative shadow-sm">
                                        <Row className="gy-3 align-items-center">
                                            <Col md={3}>
                                                <Form.Group>
                                                    <Form.Label className="xx-small fw-bold">Platform Name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        value={link.platform || ''}
                                                        onChange={(e) => handleLinkChange(idx, 'platform', e.target.value)}
                                                        placeholder="e.g. Facebook"
                                                        size="sm"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group>
                                                    <Form.Label className="xx-small fw-bold">Icon (Select or Upload)</Form.Label>
                                                    <div className="d-flex gap-2">
                                                        <Form.Select
                                                            value={link.icon && !link.icon.startsWith('images/') ? link.icon : ''}
                                                            onChange={(e) => handleLinkChange(idx, 'icon', e.target.value)}
                                                            size="sm"
                                                            className="flex-grow-1"
                                                        >
                                                            {icons.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                                                        </Form.Select>
                                                        <div className="social-icon-file-wrapper">
                                                            <input
                                                                type="file"
                                                                id={`social_icon_file_${idx}`}
                                                                style={{ display: 'none' }}
                                                                onChange={(e) => handleLinkFileChange(idx, e)}
                                                                accept="image/*"
                                                            />
                                                            <label
                                                                htmlFor={`social_icon_file_${idx}`}
                                                                className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center p-1"
                                                                style={{ minWidth: '40px', minHeight: '40px' }}
                                                            >
                                                                {previews[`social_icon_${idx}`] || (link.icon && link.icon.startsWith('images/')) ? (
                                                                    <img 
                                                                        src={previews[`social_icon_${idx}`] || `${imageBaseURL}/${link.icon}`} 
                                                                        alt="" 
                                                                        style={{ width: '22px', height: '22px', objectFit: 'cover' }} 
                                                                    />
                                                                ) : renderIcon(link.icon)}
                                                            </label>
                                                        </div>
                                                    </div>
                                                </Form.Group>
                                            </Col>
                                            <Col md={5}>
                                                <Form.Group>
                                                    <Form.Label className="xx-small fw-bold">Profile URL</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        value={link.url || ''}
                                                        onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                                                        placeholder="https://facebook.com/your-page"
                                                        size="sm"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={1} className="text-end pt-3">
                                                <Button variant="link" className="text-danger p-0 mt-1" onClick={() => handleRemoveLink(idx)}>
                                                    <FaTrash size={14} />
                                                </Button>
                                            </Col>
                                        </Row>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>
            </Col>
        );
    };

    const getFieldsForType = (type) => {
        const fieldMap = {
            general_settings: [
                'site_name', 'site_url', 'site_logo', 'site_favicon',
                'primary_color', 'pagination_limit', 'pagination_mode',
                'maintenance_mode',
                'support_email', 'support_phone', 'support_address',
                'timezone', 'admin_commission',
                'default_language_id', 'default_currency_id'
            ],
            cookie_settings: [
                'cookie_heading', 'cookie_message', 'cookie_button_text', 'cookie_page_id'
            ],
            payment_settings: [
                'stripe_enabled', 'stripe_test_mode', 'stripe_test_public_key', 'stripe_test_secret_key', 'stripe_test_webhook_secret',
                'stripe_live_public_key', 'stripe_live_secret_key', 'stripe_live_webhook_secret',
                'paypal_enabled', 'paypal_test_mode', 'paypal_test_client_id', 'paypal_test_client_secret',
                'paypal_live_client_id', 'paypal_live_client_secret'
            ],
            api_settings: [
                'gemini_api_key', 'huggingface_api_key'
            ],
            email_settings: [
                'mail_driver', 'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_address', 'mail_from_name'
            ],
            footer_settings: [
                'footer_tagline', 'footer_copyright', 'social_links'
            ],
            recaptcha_settings: [
                'recaptcha_enabled', 'recaptcha_site_key', 'recaptcha_secret_key'
            ],
            social_login_settings: [
                'google_enabled', 'google_client_id', 'google_client_secret',
                'facebook_enabled', 'facebook_client_id', 'facebook_client_secret',
                'twitter_enabled', 'twitter_client_id', 'twitter_client_secret',
                'apple_enabled', 'apple_client_id', 'apple_client_secret'
            ],
            social_settings: [
                'social_links'
            ]
        };
        return fieldMap[type] || [];
    };

    const renderField = (key) => {
        const value = formData[key];
        // Skip internal/legacy fields
        if (['_id', '__v', 'created_at', 'updated_at', 'type', 'admin_settings', 'general_settings'].includes(key)) return null;


        // Skip gateway fields if we are in payment_settings (they are handled by renderPaymentGateways)
        if (type === 'payment_settings' && (key.startsWith('stripe_') || key.startsWith('paypal_'))) return null;

        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (['site_logo', 'site_favicon'].includes(key)) {
            return (
                <Col key={key} md={12} className="mb-4">
                    <Form.Label className="fw-bold">{label}</Form.Label>
                    <div className="upload-container">
                        <input
                            type="file"
                            name={key}
                            id={key}
                            className="file-input"
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                        <label htmlFor={key} className="upload-label">
                            <div className="preview-area">
                                {previews[key] ? (
                                    <img src={previews[key]} alt="Preview" className="img-preview" />
                                ) : (
                                    <div className="placeholder-preview">
                                        <FaCloudUploadAlt size={40} className="mb-2" />
                                        <span>Click to upload or drag & drop</span>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                </Col>
            );
        }

        if (key === 'pagination_mode') {
            return (
                <Col key={key} md={6} className="mb-4">
                    <Form.Group>
                        <Form.Label className="mb-2">{label}</Form.Label>
                        <AdminSearchSelect
                            options={[
                                { value: 'paginate', label: 'Classic Pagination (Pages)' },
                                { value: 'scroll', label: 'Infinite Scroll' }
                            ]}
                            value={formData[key] || 'paginate'}
                            onChange={(val) => setFormData({ ...formData, [key]: val })}
                            placeholder="Select Pagination Mode..."
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (typeof value === 'boolean') {
            return (
                <Col key={key} md={6} className="mb-4 d-flex justify-content-start flex-column">
                    <Form.Group className="d-flex flex-column h-100 pb-2">
                        {/* Invisible label for spacing consistency with neighbor inputs */}
                        <Form.Label className="invisible mb-2">{label}</Form.Label>
                        <div className="mt-auto">
                            <Toggle
                                label={label}
                                checked={formData[key] || false}
                                onChange={(checked) => setFormData(prev => ({ ...prev, [key]: checked }))}
                            />
                        </div>
                    </Form.Group>
                </Col>
            );
        }

        if (key.includes('color')) {
            return (
                <Col key={key} md={6} className="mb-4">
                    <Form.Group>
                        <Form.Label className="mb-2">{label}</Form.Label>
                        <div className="d-flex gap-3 align-items-center">
                            <div className="color-picker-wrapper">
                                <Form.Control
                                    type="color"
                                    name={key}
                                    value={formData[key] || '#000000'}
                                    onChange={handleInputChange}
                                    className="color-picker"
                                />
                            </div>
                            <Form.Control
                                type="text"
                                name={key}
                                value={formData[key] || '#000000'}
                                onChange={handleInputChange}
                                className="color-input-field"
                                style={{ maxWidth: '150px' }}
                            />
                        </div>
                    </Form.Group>
                </Col>
            );
        }

        if (key === 'admin_commission') {
            return (
                <Col key={key} md={6} className="mb-4">
                    <Form.Group>
                        <Form.Label className="mb-2">{label}</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type="number"
                                name={key}
                                value={formData[key] || 0}
                                onChange={handleInputChange}
                            />
                            <InputGroup.Text className="bg-light fw-bold text-muted">%</InputGroup.Text>
                        </InputGroup>
                    </Form.Group>
                </Col>
            );
        }

        if (key === 'default_language_id') {
            return (
                <Col key={key} md={6} className="mb-4">
                    <Form.Group>
                        <Form.Label className="mb-2">{label}</Form.Label>
                        <AdminSearchSelect
                            options={languages.map(lang => ({ value: lang._id, label: lang.name }))}
                            value={formData[key] || ''}
                            onChange={(val) => setFormData({ ...formData, [key]: val })}
                            placeholder="Select Default Language..."
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (key === 'default_currency_id') {
            return (
                <Col key={key} md={6} className="mb-4">
                    <Form.Group>
                        <Form.Label className="mb-2">{label}</Form.Label>
                        <AdminSearchSelect
                            options={currencies.map(curr => ({ value: curr._id, label: `${curr.name} (${curr.code})` }))}
                            value={formData[key] || ''}
                            onChange={(val) => setFormData({ ...formData, [key]: val })}
                            placeholder="Select Default Currency..."
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (key === 'cookie_page_id') {
            return (
                <Col key={key} md={6} className="mb-4">
                    <Form.Group>
                        <Form.Label className="mb-2">{label}</Form.Label>
                        <AdminSearchSelect
                            options={pages.map(p => ({ value: p._id, label: p.title }))}
                            value={formData[key] || ''}
                            onChange={(val) => setFormData({ ...formData, [key]: val })}
                            placeholder="Select Cookie Policy Page..."
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (['cookie_message', 'footer_tagline', 'footer_copyright'].includes(key)) {
            return (
                <Col key={key} md={12} className="mb-3">
                    <Form.Group>
                        <Form.Label className="fw-bold">{label} ({activeGlobalLang.toUpperCase()})</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name={key}
                            value={(formData[key] && typeof formData[key] === 'object' ? formData[key][activeGlobalLang] : formData[key]) || ''}
                            onChange={(e) => handleGenericLocalizedChange(key, activeGlobalLang, e.target.value)}
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (key === 'social_links') {
            return renderSocialLinks();
        }

        if (typeof value === 'number') {
            return (
                <Col key={key} md={6} className="mb-3">
                    <Form.Group>
                        <Form.Label>{label}</Form.Label>
                        <Form.Control
                            type="number"
                            name={key}
                            value={formData[key] || 0}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (key.startsWith('mail_') || key.startsWith('recaptcha_') || key === 'gemini_api_key' || key === 'huggingface_api_key' || key === 'site_url' || key === 'support_email' || key === 'support_phone' || key === 'support_address' || key === 'body_font_name' || key === 'body_font_url') {
            return (
                <Col key={key} md={6} className="mb-3">
                    <Form.Group>
                        <Form.Label className="fw-bold">{label}</Form.Label>
                        <Form.Control
                            type={key === 'mail_password' || key === 'gemini_api_key' || key === 'huggingface_api_key' || key.toLowerCase().includes('secret') || key.toLowerCase().includes('private_key') ? 'password' : 'text'}
                            name={key}
                            value={formData[key] || ''}
                            onChange={handleInputChange}
                            autoComplete="new-password"
                        />
                    </Form.Group>
                </Col>
            );
        }

        if (key === 'timezone') {
            return (
                <Col key={key} md={6} className="mb-3">
                    <Form.Group>
                        <Form.Label className="fw-bold">{label}</Form.Label>
                        <AdminSearchSelect
                            options={allTimezones}
                            value={formData[key] || 'UTC'}
                            onChange={(val) => handleGenericChange('timezone', val)}
                            placeholder="Search Timezone..."
                        />
                    </Form.Group>
                </Col>
            );
        }

        return (
            <Col key={key} md={6} className="mb-3">
                <Form.Group>
                    <Form.Label className="fw-bold">{label} ({activeGlobalLang.toUpperCase()})</Form.Label>
                    <Form.Control
                        type="text"
                        name={key}
                        value={(formData[key] && typeof formData[key] === 'object' ? formData[key][activeGlobalLang] : formData[key]) || ''}
                        onChange={(e) => handleGenericLocalizedChange(key, activeGlobalLang, e.target.value)}
                    />
                </Form.Group>
            </Col>
        );
    };

    return (
        <div className="dynamic-settings-container">
            <Container fluid className="px-0">
                <div className="ds-header">
                    <div>
                        <div className="ds-breadcrumb">
                            <Link to="/dashboard">Dashboard</Link>
                            <span className="separator"><FaChevronRight size={10} /></span>
                            <span>Setting</span>
                            <span className="separator"><FaChevronRight size={10} /></span>
                            <span>{t(`sidebar.settings.${type}`) !== `sidebar.settings.${type}` ? t(`sidebar.settings.${type}`) : type.replace(/_/g, ' ')}</span>
                        </div>
                        <h2 className="ds-title text-capitalize">{t(`sidebar.settings.${type}`) !== `sidebar.settings.${type}` ? t(`sidebar.settings.${type}`) : type.replace(/_/g, ' ')}</h2>
                    </div>
                    <div className="ds-header-actions d-flex align-items-center gap-3">
                        {type !== 'social_login_settings' && type !== 'api_settings' && type !== 'email_settings' && type !== 'recaptcha_settings' && (
                            <div className="ds-lang-selector-wrapper" style={{ width: '220px' }}>
                                <AdminSearchSelect
                                    options={languages.map(l => ({ label: l.name, value: l.code }))}
                                    value={activeGlobalLang}
                                    onChange={(val) => setActiveGlobalLang(val)}
                                    placeholder="Select Language..."
                                />
                            </div>
                        )}
                        <Button className="ds-btn-save" onClick={handleSubmit} disabled={saving}>
                            {saving ? <div className="spinner-border spinner-border-sm" role="status"></div> : <><FaSave /> Save settings</>}
                        </Button>
                    </div>
                </div>

                {type === 'payment_settings' && (
                    <div className="ds-tabs">
                        <Nav className="ds-nav-pills">
                            <Nav.Item>
                                <Nav.Link
                                    active={activeTab === 'settings'}
                                    onClick={() => setActiveTab('settings')}
                                    className="ds-tab-link"
                                >
                                    Gateway Settings
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link
                                    active={activeTab === 'methods'}
                                    onClick={() => setActiveTab('methods')}
                                    className="ds-tab-link"
                                >
                                    Payment Methods
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </div>
                )}

                <div className="ds-main-card">
                    <Form onSubmit={handleSubmit}>
                        {type === 'payment_settings' ? (
                            activeTab === 'settings' ? renderPaymentGateways() : <PaymentMethodsList isIntegrated={true} activeGlobalLang={activeGlobalLang} />
                        ) : type === 'social_login_settings' ? (
                            <>{renderSocialLoginSettings()}</>
                        ) : type === 'recaptcha_settings' ? (
                            <>{renderRecaptchaSettings()}</>
                        ) : (
                            <Row>
                                {getFieldsForType(type).map((key, index) => (
                                    <React.Fragment key={key}>
                                        {type === 'general_settings' && key === 'primary_color' && (
                                            <Col md={12} className="mb-4 mt-3">
                                                <div className="ds-section-title mb-1">
                                                    THEME & APPEARANCE
                                                </div>
                                                <p className="ds-section-subtitle mb-3">Customize colors and layout settings</p>
                                            </Col>
                                        )}
                                        {renderField(key)}
                                    </React.Fragment>
                                ))}
                            </Row>
                        )}
                        {type === 'api_settings' && (
                            <Row className="api-settings-info mt-3 gy-3">
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded border h-100">
                                        <h6 className="fw-bold mb-2"><FaGoogle className="text-primary me-2" /> Gemini AI Integration</h6>
                                        <p className="small text-muted mb-0">
                                            Enter your Google Gemini API key to enable AI-powered chat and visual search features. 
                                            You can get a key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
                                        </p>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded border h-100">
                                        <h6 className="fw-bold mb-2"><span className="me-2">🤗</span> Hugging Face Integration</h6>
                                        <p className="small text-muted mb-0">
                                            Enter your Hugging Face Access Token to enable fallback AI features and advanced image guardrails. 
                                            You can get a token from your <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">Hugging Face Settings</a>.
                                        </p>
                                    </div>
                                </Col>
                            </Row>
                        )}
                        {type === 'currency_settings' && renderCurrencySection()}
                    </Form>
                </div>
            </Container>
        </div>
    );
};

export default DynamicSettings;
