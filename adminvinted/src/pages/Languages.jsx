import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit, FaGlobe } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import axios from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';

const Languages = () => {
    const [languages, setLanguages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        native_name: '',
        direction: 'ltr',
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    // Pagination
    const { paginationLimit } = useSettings();


    useEffect(() => {
        fetchLanguages();
    }, []);

    const fetchLanguages = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/languages');
            setLanguages(data);
        } catch (error) {
            console.error("Error fetching languages", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (lang) => {
        setSelectedLanguage(lang);
        setFormData({
            name: lang.name || '',
            code: lang.code || '',
            native_name: lang.native_name || '',
            direction: lang.direction || 'ltr',
            is_active: lang.is_active ?? true
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (selectedLanguage) {
                await axios.put(`/api/admin/languages/${selectedLanguage._id}`, formData);
            } else {
                await axios.post('/api/admin/languages', formData);
            }
            showToast('success', `Language ${selectedLanguage ? 'updated' : 'created'} successfully`);
            setShowModal(false);
            fetchLanguages();
        } catch (error) {
            console.error("Error saving language", error);
            showToast('error', "Failed to save language");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (lang, isActive) => {
        try {
            await axios.put(`/api/admin/languages/${lang._id}`, { is_active: isActive });
            showToast('success', `Language ${isActive ? 'activated' : 'deactivated'}`);
            setLanguages(languages.map(l =>
                l._id === lang._id ? { ...l, is_active: isActive } : l
            ));
        } catch (error) {
            console.error("Error toggling status", error);
            showToast('error', "Failed to update status");
        }
    };

    const handleDelete = (lang) => {
        showConfirm(
            'Delete Language?',
            `Are you sure you want to delete "${lang.name}"?`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/languages/${lang._id}`);
                    showToast('success', 'Language deleted successfully');
                    fetchLanguages();
                } catch (error) {
                    console.error("Error deleting language", error);
                    showToast('error', "Failed to delete language");
                }
            }
        });
    };

    const columns = [
        {
            header: 'Language',
            accessor: 'name',
            render: (row) => (
                <div className="d-flex align-items-center gap-2">
                    <FaGlobe className="text-primary opacity-50" />
                    <div>
                        <div className="fw-bold">{row.name}</div>
                        <div className="small text-muted">{row.native_name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Code',
            accessor: 'code',
            render: (row) => <code className="fw-bold">{row.code.toUpperCase()}</code>
        },
        {
            header: 'Direction',
            accessor: 'direction',
            render: (row) => <span className="text-uppercase small">{row.direction}</span>
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (row) => (
                <Toggle
                    checked={row.is_active}
                    onChange={(checked) => handleStatusToggle(row, checked)}
                    label={row.is_active ? "Active" : "Inactive"}
                />
            )
        }
    ];

    const filteredData = Array.isArray(languages) ? languages.filter(l =>
        (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];




    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Languages</h2>
                            <p className="text-muted small mb-0">Customize portal language options</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => {
                            setSelectedLanguage(null);
                            setFormData({ name: '', code: '', native_name: '', direction: 'ltr', is_active: true });
                            setShowModal(true);
                        }}>
                            <FaPlus className="me-2" /> Add Language
                        </Button>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '300px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search languages..."
                                className="border-start-0 ps-0"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); }}
                            />
                        </InputGroup>
                    </div>

                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredData}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            pagination={true}
                        />
                    )}
                </Card>

                <Modal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    title={selectedLanguage ? "Edit Language" : "Add Language"}
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : "Save Language"}
                            </Button>
                        </>
                    }
                >
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Language Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. English"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Code</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="e.g. en"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Native Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.native_name}
                                onChange={(e) => setFormData({ ...formData, native_name: e.target.value })}
                                placeholder="e.g. English"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Text Direction</Form.Label>
                            <Form.Select
                                value={formData.direction}
                                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                            >
                                <option value="ltr">LTR (Left to Right)</option>
                                <option value="rtl">RTL (Right to Left)</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default Languages;
