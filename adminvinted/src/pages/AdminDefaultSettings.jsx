import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Row, Col, Form, Spinner, Image } from 'react-bootstrap';
import { FaSave, FaUndo, FaCloudUploadAlt, FaCogs, FaImage, FaListOl, FaMousePointer } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import axios from '../utils/axios';
import ImageCropModal from '../components/common/ImageCropModal';

const AdminDefaultSettings = () => {
    const {
        paginationLimit,
        paginationMode,
        siteLogo,
        siteName,
        updateGlobalSettings,
        loading
    } = useSettings();

    const [formData, setFormData] = useState({
        site_name: '',
        pagination_limit: 10,
        pagination_mode: 'paginate',
        site_logo: '',
    });

    const [originalData, setOriginalData] = useState({});
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    
    // Crop state
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [tempFile, setTempFile] = useState(null);

    useEffect(() => {
        if (!loading) {
            const data = {
                site_name: siteName || '',
                pagination_limit: paginationLimit || 10,
                pagination_mode: paginationMode || 'paginate',
                site_logo: siteLogo || '',
            };
            setFormData(data);
            setOriginalData(data);
            if (siteLogo) {
                setLogoPreview(`${axios.defaults.baseURL}/${siteLogo}`);
            }
        }
    }, [loading, siteName, paginationLimit, paginationMode, siteLogo]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTempFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempImage(reader.result);
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
            e.target.value = null; // reset input
        }
    };

    const handleCropComplete = (croppedImageBlob) => {
        if (!croppedImageBlob) {
            if (tempFile) {
                setLogoPreview(URL.createObjectURL(tempFile));
                setFormData(prev => ({ ...prev, site_logo_file: tempFile }));
            }
            setShowCropModal(false);
            setTempImage(null);
            setTempFile(null);
            return;
        }
        const file = new File([croppedImageBlob], "site_logo.jpg", { type: 'image/jpeg' });
        setLogoPreview(URL.createObjectURL(croppedImageBlob));
        setFormData(prev => ({ ...prev, site_logo_file: file }));
        setShowCropModal(false);
        setTempFile(null);
    };

    const handleCancel = () => {
        setFormData(originalData);
        if (originalData.site_logo) {
            setLogoPreview(`${axios.defaults.baseURL}/${originalData.site_logo}`);
        } else {
            setLogoPreview(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateGlobalSettings({
                site_name: formData.site_name,
                pagination_limit: parseInt(formData.pagination_limit),
                pagination_mode: formData.pagination_mode
            });

            if (result.success) {
                setOriginalData(formData);
                alert("Settings updated successfully!");
            }
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    const ActionButtons = () => (
        <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handleCancel} className="btn-admin-outline" disabled={saving}>
                <FaUndo className="me-2" /> Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} className="btn-admin-action" disabled={saving}>
                {saving ? <Spinner size="sm" className="me-2" /> : <FaSave className="me-2" />} Save Changes
            </Button>
        </div>
    );

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="h3 mb-1">Admin Settings</h1>
                            <p className="text-muted small mb-0">Configure global application defaults and branding</p>
                        </div>
                        <ActionButtons />
                    </div>

                    <Form>
                        <Row>
                            {/* Branding Section */}
                            <Col lg={6} className="mb-4">
                                <Card className="h-100 border-0 bg-light p-4 rounded-4">
                                    <h5 className="mb-4 d-flex align-items-center">
                                        <FaImage className="me-2 text-primary" /> Branding & Identity
                                    </h5>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold small text-uppercase text-muted">Site Name</Form.Label>
                                        <Form.Control
                                            name="site_name"
                                            value={formData.site_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter portal name..."
                                            className="form-control-lg border-0 shadow-sm"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-0">
                                        <Form.Label className="fw-bold small text-uppercase text-muted">Site Logo</Form.Label>
                                        <div
                                            className="logo-upload-zone"
                                            onClick={() => document.getElementById('logoInput').click()}
                                        >
                                            {logoPreview ? (
                                                <div className="logo-preview-container">
                                                    <Image src={logoPreview} alt="Preview" fluid className="rounded" />
                                                    <div className="overlay">
                                                        <FaCloudUploadAlt />
                                                        <span>Change Image</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="upload-placeholder">
                                                    <FaCloudUploadAlt size={40} className="mb-2 text-primary opacity-50" />
                                                    <p className="mb-0 fw-medium">Click to upload logo</p>
                                                    <span className="text-muted smaller">Dashed border style</span>
                                                </div>
                                            )}
                                            <input
                                                id="logoInput"
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                            />
                                        </div>
                                    </Form.Group>
                                </Card>
                            </Col>

                            {/* Pagination Section */}
                            <Col lg={6} className="mb-4">
                                <Card className="h-100 border-0 bg-light p-4 rounded-4">
                                    <h5 className="mb-4 d-flex align-items-center">
                                        <FaListOl className="me-2 text-primary" /> Display & Pagination
                                    </h5>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold small text-uppercase text-muted">Items Per Page</Form.Label>
                                        <Form.Select
                                            name="pagination_limit"
                                            value={formData.pagination_limit}
                                            onChange={handleInputChange}
                                            className="form-select-lg border-0 shadow-sm"
                                        >
                                            <option value="5">5 Records</option>
                                            <option value="10">10 Records (Recommended)</option>
                                            <option value="20">20 Records</option>
                                            <option value="50">50 Records</option>
                                            <option value="100">100 Records</option>
                                        </Form.Select>
                                        <Form.Text className="text-muted">This limit will apply to all tables globally.</Form.Text>
                                    </Form.Group>

                                    <Form.Group>
                                        <Form.Label className="fw-bold small text-uppercase text-muted">Pagination Mode</Form.Label>
                                        <div className="d-flex gap-3">
                                            <div
                                                className={`mode-selector ${formData.pagination_mode === 'paginate' ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, pagination_mode: 'paginate' }))}
                                            >
                                                <FaListOl className="mb-2" />
                                                <span>Numeric Numbers</span>
                                            </div>
                                            <div
                                                className={`mode-selector ${formData.pagination_mode === 'scroll' ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, pagination_mode: 'scroll' }))}
                                            >
                                                <FaMousePointer className="mb-2" />
                                                <span>Infinite Scroll</span>
                                            </div>
                                        </div>
                                    </Form.Group>
                                </Card>
                            </Col>
                        </Row>

                        {/* Advanced Section */}
                        <Row>
                            <Col xs={12}>
                                <Card className="border-0 bg-light p-4 rounded-4 mb-4">
                                    <h5 className="mb-4 d-flex align-items-center">
                                        <FaCogs className="me-2 text-primary" /> Advanced Admin Settings
                                    </h5>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-medium">Maintenance Mode</Form.Label>
                                                <Form.Check
                                                    type="switch"
                                                    id="maintenance-switch"
                                                    label="Enable maintenance mode for front-end"
                                                    className="custom-switch-lg"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-medium">User Registration</Form.Label>
                                                <Form.Check
                                                    type="switch"
                                                    id="reg-switch"
                                                    label="Allow new users to register"
                                                    defaultChecked
                                                    className="custom-switch-lg"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        </Row>
                    </Form>

                    <div className="d-flex justify-content-end align-items-center mt-2 pt-4 border-top">
                        <ActionButtons />
                    </div>
                </Card>
            </Container>

            <style>{`
                .logo-upload-zone {
                    width: 100%;
                    height: 180px;
                    border: 2px dashed #cbd5e1;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    background: white;
                }

                .logo-upload-zone:hover {
                    border-color: var(--primary-color);
                    background: rgba(14, 165, 233, 0.02);
                }

                .logo-preview-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .logo-preview-container .overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.4);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: all 0.2s ease;
                }

                .logo-preview-container:hover .overlay {
                    opacity: 1;
                }

                .mode-selector {
                    flex: 1;
                    padding: 16px;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: white;
                }

                .mode-selector.active {
                    border-color: var(--primary-color);
                    background: rgba(14, 165, 233, 0.05);
                    color: var(--primary-color);
                }

                .mode-selector span {
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .custom-switch-lg .form-check-input {
                    width: 3rem;
                    height: 1.5rem;
                    cursor: pointer;
                }
            `}</style>
            
            {showCropModal && (
                <ImageCropModal
                    image={tempImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropModal(false);
                        setTempImage(null);
                        setTempFile(null);
                    }}
                    aspect={null} // Default to original ratio
                />
            )}
        </div>
    );
};

export default AdminDefaultSettings;
