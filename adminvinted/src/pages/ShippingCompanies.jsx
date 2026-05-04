import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTruck, FaTrash, FaEdit, FaLink, FaImage } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { showToast, showConfirm } from '../utils/swal';
import { safeString } from '../utils/constants';

const ShippingCompanies = () => {
    const { t } = useLocalization();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        company_name: '',
        tracking_url: '',
        status: 'active'
    });
    const [errors, setErrors] = useState({});

    const validateField = (name, value) => {
        let error = '';
        if (name === 'company_name') {
            if (!value) error = 'Company name is required';
            else if (/\d/.test(value)) error = 'Company name should not contain numbers';
        } else if (name === 'tracking_url') {
            if (!value) error = 'Tracking URL is required';
            else if (!value.includes('%tracking_id%')) error = 'URL must contain the %tracking_id% placeholder';
            else if (!/^https?:\/\//i.test(value)) error = 'URL must start with http:// or https://';
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/shipping-companies');
            setCompanies(res.data);
        } catch (error) {
            console.error("Error fetching shipping companies", error);
            showToast('error', 'Failed to fetch shipping companies');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredCompanies = Array.isArray(companies) ? companies.filter(c =>
        (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const handleAdd = () => {
        setEditMode(false);
        setFormData({
            company_name: '',
            tracking_url: '',
            status: 'active'
        });
        setErrors({});
        setShowModal(true);
    };

    const handleEdit = (company) => {
        setEditMode(true);
        setSelectedId(company._id);
        setFormData({
            company_name: company.company_name,
            tracking_url: company.tracking_url,
            status: company.status
        });
        setErrors({});
        setShowModal(true);
    };

    const handleDelete = (company) => {
        showConfirm(
            'Delete Company?',
            `Are you sure you want to delete ${company.company_name}?`,
            'Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/shipping-companies/${company._id}`);
                    showToast('success', 'Company deleted successfully');
                    fetchCompanies();
                } catch (error) {
                    showToast('error', 'Failed to delete company');
                }
            }
        });
    };

    const handleStatusToggle = async (company, isChecked) => {
        try {
            const newStatus = isChecked ? 'active' : 'inactive';
            await axios.put(`/api/shipping-companies/${company._id}`, { status: newStatus });
            setCompanies(companies.map(c => 
                c._id === company._id ? { ...c, status: newStatus } : c
            ));
        } catch (error) {
            showToast('error', 'Failed to update status');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const nameErr = validateField('company_name', formData.company_name);
        const urlErr = validateField('tracking_url', formData.tracking_url);

        if (nameErr || urlErr) {
            return showToast('warning', 'Please fix validation errors');
        }

        setSaving(true);
        try {
            if (editMode) {
                await axios.put(`/api/shipping-companies/${selectedId}`, formData);
                showToast('success', 'Company updated successfully');
            } else {
                await axios.post('/api/shipping-companies', formData);
                showToast('success', 'Company added successfully');
            }
            setShowModal(false);
            fetchCompanies();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Error saving company');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            header: 'Logo',
            accessor: 'logo',
            render: (row) => (
                <div className="avatar-small bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <FaTruck className="text-muted" />
                </div>
            )
        },
        {
            header: 'Company Name',
            accessor: 'company_name',
            render: (row) => <div className="fw-bold">{row.company_name}</div>
        },
        {
            header: 'Tracking URL',
            accessor: 'tracking_url',
            render: (row) => (
                <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>
                    {row.tracking_url}
                    <div className="extra-small text-primary opacity-75 mt-1">%tracking_id% {'->'} Placeholder</div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <Toggle 
                    checked={row.status === 'active'}
                    onChange={(checked) => handleStatusToggle(row, checked)}
                    label={row.status === 'active' ? 'Active' : 'Inactive'}
                />
            )
        },
        {
            header: 'Created At',
            accessor: 'created_at',
            render: (row) => <div className="small">{new Date(row.created_at).toLocaleDateString()}</div>
        }
    ];

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                        <div>
                            <h1 className="dashboard-title h3 mb-1 text-primary">Shipping Companies</h1>
                            <p className="text-muted small mb-0">Manage marketplace delivery partners</p>
                        </div>
                        <Button variant="primary" onClick={handleAdd} className="btn-admin-action">
                            <FaPlus /> Add New Company
                        </Button>
                    </div>

                    <div className="mb-4 search-box-container">
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search companies..."
                                className="border-start-0 ps-0"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </InputGroup>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredCompanies}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            pagination={true}
                            emptyMessage="No shipping companies found"
                        />
                    )}
                </Card>

                <Modal 
                    show={showModal} 
                    onHide={() => setShowModal(false)}
                    title={editMode ? 'Edit Shipping Company' : 'Add New Shipping Company'}
                    footer={
                        <>
                            <Button variant="outline-secondary" className="btn-admin-outline" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" className="btn-admin-action" onClick={handleSubmit} disabled={saving}>
                                {saving ? <Spinner size="sm" className="me-2" /> : null}
                                {editMode ? 'Update' : 'Save'}
                            </Button>
                        </>
                    }
                >
                    <Form className="admin-form">
                        <Form.Group className="mb-3">
                            <Form.Label>Company Name</Form.Label>
                            <Form.Control 
                                type="text"
                                name="company_name"
                                placeholder="e.g. DHL Express, FedEx"
                                value={formData.company_name}
                                onChange={handleInputChange}
                                isInvalid={!!errors.company_name}
                            />
                            <Form.Control.Feedback type="invalid">{errors.company_name}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Tracking URL Structure</Form.Label>
                            <Form.Control 
                                type="text"
                                name="tracking_url"
                                placeholder="e.g. https://www.dhl.com/track?id=%tracking_id%"
                                value={formData.tracking_url}
                                onChange={handleInputChange}
                                isInvalid={!!errors.tracking_url}
                            />
                            <Form.Control.Feedback type="invalid">{errors.tracking_url}</Form.Control.Feedback>
                            <Form.Text className="text-muted extra-small">
                                Use <strong>%tracking_id%</strong> where the actual tracking number should be inserted.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Initial Status</Form.Label>
                            <Form.Select 
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default ShippingCompanies;
