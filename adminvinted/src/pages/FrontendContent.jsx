import React, { useState, useEffect } from 'react';
import { Form, Spinner, Row, Col } from 'react-bootstrap';
import {
    FaSave,
    FaGlobe,
    FaSearch,
    FaHistory,
    FaLayerGroup,
    FaChevronDown,
    FaImage
} from 'react-icons/fa';
import axios from '../utils/axios';
import { showToast } from '../utils/swal';
import AdminSearchSelect from '../components/AdminSearchSelect';
import '../styles/FrontendContent.css';
import '../styles/DynamicSettings.css';

const FrontendContent = () => {
    const [languages, setLanguages] = useState([]);
    const [activeLang, setActiveLang] = useState('en');
    const [activeSection, setActiveSection] = useState('home');
    const [content, setContent] = useState([]); // All content from DB
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Search states for dropdowns
    const [langSearch, setLangSearch] = useState('');
    const [sectionSearch, setSectionSearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [langRes, contentRes] = await Promise.all([
                axios.get('/api/admin/languages'),
                axios.get('/api/frontend-content/admin/all')
            ]);
            setLanguages(langRes.data);
            setContent(contentRes.data);

            if (langRes.data.length > 0) {
                const hasEn = langRes.data.find(l => l.code === 'en');
                setActiveLang(hasEn ? 'en' : langRes.data[0].code);
            }
        } catch (error) {
            console.error('Error fetching frontend content:', error);
            showToast('error', 'Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const formatLabel = (key) => {
        return key.replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatSectionTitle = (title) => {
        if (title.toLowerCase() === 'home') return 'Hero Section';

        return title.split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' › ') + ' Section';
    };

    const handleValueChange = (section, key, newValue) => {
        setContent(prev => prev.map(item => {
            if (item.section === section && item.key === key) {
                return {
                    ...item,
                    values: {
                        ...item.values,
                        [activeLang]: newValue
                    }
                };
            }
            return item;
        }));
    };

    const handleImageUpload = async (e, section, key) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await axios.post('/api/frontend-content/admin/upload-image', formData);
            handleValueChange(section, key, data.url);
            showToast('success', 'Image uploaded successfully');
        } catch (error) {
            console.error('Image upload failed', error);
            showToast('error', 'Failed to upload image');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const contentsToUpdate = content.map(item => ({
                section: item.section,
                key: item.key,
                values: item.values
            }));

            await axios.put('/api/frontend-content/admin/bulk-update', { contents: contentsToUpdate });
            showToast('success', `All changes saved successfully!`);
        } catch (error) {
            console.error('Error saving content:', error);
            showToast('error', 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const getImageUrl = (val) => {
        if (!val) return '';
        if (val.startsWith('http')) return val;
        return `${axios.defaults.baseURL}/${val}`;
    };

    const fallbackImage = `${axios.defaults.baseURL}/images/site/not_found.png`;

    const sections = [...new Set(content.map(c => c.section))];

    // Filtered lists for dropdowns
    const filteredSections = sections.filter(s =>
        formatSectionTitle(s).toLowerCase().includes(sectionSearch.toLowerCase())
    );

    const filteredLanguages = languages.filter(l =>
        l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
        l.code.toLowerCase().includes(langSearch.toLowerCase())
    );

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="frontend-content-management">
                <header className="fc-header d-flex flex-column align-items-stretch gap-3">
                    <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-3">
                        <div className="fc-title-group">
                            <h2 className="mb-0">Frontend Content</h2>
                            <p className="mb-0 opacity-75">Customize localized text and visuals for your website.</p>
                        </div>
                        <button
                            className="fc-btn-save shadow-sm py-2 px-4"
                            onClick={handleSave}
                            disabled={saving}
                            style={{ borderRadius: '10px' }}
                        >
                            {saving ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <>
                                    <FaSave className="me-2" />
                                    <span>Save Page</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="d-flex gap-3 justify-content-end align-items-center flex-wrap pt-2">
                        {/* Language Selector Dropdown */}
                        <div className="ds-lang-selector-wrapper" style={{ width: '220px' }}>
                            <AdminSearchSelect
                                options={languages.map(l => ({ label: l.name, value: l.code }))}
                                value={activeLang}
                                onChange={(val) => setActiveLang(val)}
                                placeholder="Select Language..."
                            />
                        </div>

                        {/* Section Selector Dropdown */}
                        <div className="header-localization-dropdown">
                            <button className="header-action-btn select-box section-select-trigger" title="Change Section">
                                <FaLayerGroup className="me-2 opacity-75" />
                                <span className="localization-label">{formatSectionTitle(activeSection).toUpperCase()}</span>
                                <FaChevronDown className="ms-auto opacity-50 chevron-icon" />
                            </button>
                            <div className="localization-menu">
                                <div className="dropdown-header">SELECT SECTION</div>
                                <div className="dropdown-search">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search section..."
                                        value={sectionSearch}
                                        onChange={(e) => setSectionSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="dropdown-list scroll-area">
                                    {filteredSections.length > 0 ? (
                                        filteredSections.map(section => (
                                            <div
                                                key={section}
                                                className={`localization-item ${activeSection === section ? 'active' : ''}`}
                                                onClick={() => { setActiveSection(section); setSectionSearch(''); }}
                                            >
                                                <div className="d-flex flex-column">
                                                    <span className="item-name">{formatSectionTitle(section)}</span>
                                                    <span className="item-tag">{section}</span>
                                                </div>
                                                {activeSection === section && <div className="active-dot"></div>}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-results">No matches</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>


                <div className="fc-main-card">
                    <header className="fc-card-header">
                        <div className="d-flex align-items-center gap-3">
                            <div className="fc-section-icon-box">
                                <FaLayerGroup />
                            </div>
                            <div>
                                <h3 className="mb-0">{formatSectionTitle(activeSection)}</h3>
                                <p className="mb-0 opacity-75">Configure assets and content for this area of the site.</p>
                            </div>
                        </div>
                    </header>

                    <div className="fc-card-body">
                        {activeSection && (() => {
                            const sectionContent = content.filter(item => item.section === activeSection);

                            const isImageField = (key) => key.toLowerCase().includes('image') ||
                                key.toLowerCase().includes('banner') ||
                                key.toLowerCase().includes('logo') ||
                                key.toLowerCase().includes('background');

                            const textItems = sectionContent.filter(item => !isImageField(item.key));
                            const imageItems = sectionContent.filter(item => isImageField(item.key));

                            return (
                                <>
                                    {/* TEXT CONTENT BOXES - 3 PER ROW (md={4}) */}
                                    {textItems.length > 0 && (
                                        <div className={imageItems.length > 0 ? "mb-5" : ""}>
                                            <h5 className="mb-4" style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Text Fields</h5>
                                            <Row className="gy-4 gx-4">
                                                {textItems.map(item => {
                                                    const label = formatLabel(item.key);
                                                    const value = item.values[activeLang] || '';
                                                    const enValue = item.values['en'] || '';
                                                    return (
                                                        <Col md={4} key={`${item.section}-${item.key}`}>
                                                            <div className="fc-field-cluster h-100">
                                                                <label className="fc-label">{label} ({activeLang.toUpperCase()})</label>
                                                                <div className="fc-text-box">
                                                                    <textarea
                                                                        className="fc-textarea-v3"
                                                                        value={value}
                                                                        onChange={(e) => handleValueChange(item.section, item.key, e.target.value)}
                                                                        placeholder={activeLang !== 'en' && enValue ? `Translate: "${enValue}"` : `Enter ${label} text...`}
                                                                        rows={3}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    );
                                                })}
                                            </Row>
                                        </div>
                                    )}

                                    {/* IMAGE CONTENT BOXES - 2 PER ROW (md={6}) */}
                                    {imageItems.length > 0 && (
                                        <div>
                                            <h5 className="mb-4" style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Media Assets</h5>
                                            <Row className="gy-4 gx-4">
                                                {imageItems.map(item => {
                                                    const label = formatLabel(item.key);
                                                    // Images should fallback to 'en' in Admin UI so it doesn't show "Not Found" for other languages
                                                    const value = item.values[activeLang] || item.values['en'] || '';
                                                    const isTranslated = !!item.values[activeLang];

                                                    return (
                                                        <Col md={6} key={`${item.section}-${item.key}`}>
                                                            <div className="fc-field-cluster h-100">
                                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                                    <label className="fc-label mb-0">{label} ({activeLang.toUpperCase()})</label>
                                                                    {activeLang !== 'en' && !isTranslated && value && (
                                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>(Using EN fallback)</span>
                                                                    )}
                                                                </div>

                                                                <div className="fc-image-box">
                                                                    <div className="fc-image-preview-v3">
                                                                        <img
                                                                            src={getImageUrl(value) || fallbackImage}
                                                                            alt="Preview"
                                                                            onError={(e) => {
                                                                                e.target.src = fallbackImage;
                                                                                if (e.target.nextSibling) {
                                                                                    e.target.nextSibling.style.display = 'flex';
                                                                                }
                                                                            }}
                                                                        />
                                                                        <div className="fc-img-error-overlay" style={{ display: (!value ? 'flex' : 'none') }}>
                                                                            <FaImage size={24} className="mb-2" />
                                                                            <span>Image Not Found</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="fc-v3-upload-bar mt-3">
                                                                        <input
                                                                            type="text"
                                                                            className="fc-v3-input"
                                                                            value={value}
                                                                            onChange={(e) => handleValueChange(item.section, item.key, e.target.value)}
                                                                            placeholder={`Enter URL for ${label}...`}
                                                                        />
                                                                        <div className="fc-v3-upload-btn">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.currentTarget.nextSibling.click();
                                                                                }}
                                                                            >
                                                                                Browse
                                                                            </button>
                                                                            <input
                                                                                type="file"
                                                                                onChange={(e) => handleImageUpload(e, item.section, item.key)}
                                                                                accept="image/*"
                                                                                style={{ display: 'none' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    );
                                                })}
                                            </Row>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>

            </div >
        </div >
    );
};

export default FrontendContent;
