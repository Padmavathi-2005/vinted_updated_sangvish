import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner, Table, Row, Col } from 'react-bootstrap';
import { FaSearch, FaArrowLeft, FaLanguage, FaSave } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { showToast } from '../utils/swal';

const LanguageTranslations = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autoTranslating, setAutoTranslating] = useState(false);
    const [masterKeys, setMasterKeys] = useState({});
    const [fileTranslations, setFileTranslations] = useState({});
    const [overrides, setOverrides] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [languageInfo, setLanguageInfo] = useState(null);

    useEffect(() => {
        fetchTranslations();
    }, [id]);

    const fetchTranslations = async () => {
        setLoading(true);
        try {
            // We fetch the language details separately to get its name/code for the header
            const { data: languages } = await axios.get('/api/admin/languages');
            const lang = languages.find(l => l._id === id);
            setLanguageInfo(lang);

            const { data } = await axios.get(`/api/admin/languages/${id}/translations`);
            setMasterKeys(data.masterKeys || {});
            setFileTranslations(data.fileTranslations || {});
            setOverrides(data.overrides || {});
        } catch (error) {
            console.error("Error fetching translations:", error);
            showToast('error', 'Failed to load translations');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/admin/languages/${id}/translations`, overrides);
            console.log("[DB VERIFICATION] Save request completed. The backend has successfully updated the DB with new translations.", overrides);
            showToast('success', 'Translations saved successfully');
            
            // Clean up empty strings before saving (optional, but keeps DB clean)
            const cleanOverrides = { ...overrides };
            Object.keys(cleanOverrides).forEach(key => {
                if (!cleanOverrides[key] || String(cleanOverrides[key]).trim() === '') {
                    delete cleanOverrides[key];
                }
            });
            setOverrides(cleanOverrides);
        } catch (error) {
            console.error("Error saving translations:", error);
            showToast('error', 'Failed to save translations');
        } finally {
            setSaving(false);
        }
    };

    const handleAutoTranslate = async () => {
        try {
            setAutoTranslating(true);
            
            // Gather keys that don't have an override AND (don't have a file translation OR file translation is identical to English)
            const textsToTranslate = [];
            for (const key in masterKeys) {
                if (!overrides[key] && (!fileTranslations[key] || fileTranslations[key] === masterKeys[key])) {
                    textsToTranslate.push({ key, text: masterKeys[key] });
                }
            }

            if (textsToTranslate.length === 0) {
                showToast('info', 'All keys already have translations!');
                return;
            }

            showToast('info', `Auto-translating ${textsToTranslate.length} fields... Please wait.`);
            const { data } = await axios.post(`/api/admin/languages/${id}/auto-translate`, { textsToTranslate });
            
            setOverrides(prev => ({
                ...prev,
                ...data.translated
            }));
            
            showToast('success', 'Auto-translate complete! Review and click Save Translations.');
        } catch (error) {
            console.error("Error auto translating:", error);
            showToast('error', 'Auto-translate failed. Please try again.');
        } finally {
            setAutoTranslating(false);
        }
    };

    const handleOverrideChange = (key, value) => {
        setOverrides(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReset = (key) => {
        setOverrides(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    // Filter logic
    const filteredKeys = Object.keys(masterKeys).filter(key => {
        const search = searchTerm?.toLowerCase();
        const enValue = String(masterKeys[key]).toLowerCase();
        const fileValue = fileTranslations[key] ? String(fileTranslations[key]).toLowerCase() : '';
        const overrideValue = overrides[key] ? String(overrides[key]).toLowerCase() : '';
        return key?.toLowerCase().includes(search) || enValue.includes(search) || fileValue.includes(search) || overrideValue.includes(search);
    });

    return (
        <div className="admin-dashboard p-0">
            <style>
                {`
                .translation-input::placeholder {
                    opacity: 0.4 !important;
                    color: #adb5bd !important;
                    font-style: italic;
                }
                `}
            </style>
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                        <Button 
                            variant="light" 
                            className="me-3" 
                            onClick={() => navigate('/settings/languages')}
                        >
                            <FaArrowLeft /> Back
                        </Button>
                        <div>
                            <h2 className="dashboard-title mb-1 d-flex align-items-center gap-2">
                                <FaLanguage className="text-primary" />
                                Edit Translations: {languageInfo?.name || 'Loading...'} 
                                {languageInfo && languageInfo.code && <span className="badge bg-secondary ms-2">{String(languageInfo.code).toUpperCase()}</span>}
                            </h2>
                            <p className="text-muted small mb-0">
                                Override local translations dynamically. Unchanged inputs fall back to default locales.
                            </p>
                        </div>
                    </div>

                    <Row className="mb-4 align-items-center">
                        <Col md={6} className="mb-3 mb-md-0">
                            <div className="d-flex gap-3 gap-md-4 flex-wrap">
                                <div>
                                    <div className="text-muted small text-uppercase fw-bold">Total Master Keys</div>
                                    <div className="h4 mb-0 fw-bold">{Object.keys(masterKeys).length}</div>
                                </div>
                                <div className="border-start ps-3 ps-md-4">
                                    <div className="text-muted small text-uppercase fw-bold">Custom Overrides</div>
                                    <div className="h4 mb-0 fw-bold text-danger">{Object.keys(overrides).filter(k => overrides[k] && String(overrides[k]).trim() !== '').length}</div>
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="d-flex justify-content-start justify-content-md-end align-items-center gap-2 flex-wrap mt-3 mt-md-0">
                                <Button 
                                    variant="outline-primary" 
                                    className="px-3 fw-bold" 
                                    onClick={handleAutoTranslate} 
                                    disabled={saving || loading || autoTranslating}
                                >
                                    {autoTranslating ? <Spinner animation="border" size="sm" /> : 'AUTO TRANSLATE MISSING'}
                                </Button>
                                <Button 
                                    variant="outline-secondary" 
                                    className="px-4 fw-bold" 
                                    onClick={() => navigate('/settings/languages')}
                                    disabled={autoTranslating}
                                >
                                    CANCEL
                                </Button>
                                <Button 
                                    variant="primary" 
                                    className="px-4 fw-bold shadow-sm text-white"
                                    onClick={handleSave} 
                                    disabled={saving || loading || autoTranslating}
                                >
                                    {saving ? <><Spinner size="sm" className="me-2" /> SAVING...</> : <><FaSave className="me-2" /> SAVE TRANSLATIONS</>}
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    <Card className="border-0 shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
                        <Card.Body className="p-3">
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0 text-muted">
                                    <FaSearch />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search translation keys or text..."
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ boxShadow: 'none' }}
                                />
                            </InputGroup>
                        </Card.Body>
                    </Card>

                    {loading ? (
                        <div className="text-center p-5 mt-4">
                            <Spinner animation="border" variant="primary" />
                            <div className="mt-3 text-muted">Loading Translation Keys...</div>
                        </div>
                    ) : (
                        <div className="table-responsive mt-0 border rounded" style={{ maxHeight: '60vh', overflowY: 'auto', backgroundColor: '#fff' }}>
                            <Table hover className="mb-0 align-middle">
                                <thead className="bg-light sticky-top" style={{ zIndex: 1 }}>
                                    <tr>
                                        <th className="text-uppercase text-muted small fw-bold py-3 px-4" style={{ minWidth: '200px' }}>Translation Key</th>
                                        <th className="text-uppercase text-muted small fw-bold py-3 px-4" style={{ minWidth: '300px' }}>English Reference</th>
                                        <th className="text-uppercase text-muted small fw-bold py-3 px-4" style={{ minWidth: '300px' }}>Translation Override</th>
                                        <th className="text-uppercase text-muted small fw-bold py-3 px-4 text-center" style={{ minWidth: '100px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKeys.length > 0 ? (
                                        filteredKeys.map(key => (
                                            <tr key={key}>
                                                <td className="px-4 py-3">
                                                    <code className="text-dark bg-light px-2 py-1 rounded border">{key}</code>
                                                </td>
                                                <td className="px-4 py-3 text-muted">
                                                    {masterKeys[key]}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Form.Control
                                                        type="text"
                                                        value={overrides[key] || ''}
                                                        onChange={(e) => handleOverrideChange(key, e.target.value)}
                                                        placeholder={fileTranslations[key] || masterKeys[key] || 'Translate...'}
                                                        className={`translation-input ${overrides[key] && String(overrides[key]).trim() !== '' ? 'border-primary shadow-sm fw-bold' : ''}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button 
                                                        variant="outline-secondary" 
                                                        size="sm" 
                                                        onClick={() => handleReset(key)}
                                                        disabled={!overrides[key]}
                                                        className="fw-bold"
                                                        style={{ fontSize: '11px' }}
                                                    >
                                                        RESET
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center p-5 text-muted">
                                                No translation keys found matching "{searchTerm}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card>
            </Container>
        </div>
    );
};

export default LanguageTranslations;
