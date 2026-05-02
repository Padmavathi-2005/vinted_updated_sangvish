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
        if (!formData.company_name || !formData.tracking_url) {
            return showToast('warning', 'Please fill all fields');
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
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="dashboard-title h3 mb-1">Shipping Companies</h1>
                            <p className="text-muted small mb-0">Manage marketplace delivery partners</p>
                        </div>
                        <Button variant="primary" onClick={handleAdd} className="btn-admin-action">
                            <FaPlus /> Add New Company
                        </Button>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '400px' }}>
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
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : (editMode ? 'Update' : 'Save')}
                            </Button>
                        </>
                    }
                >
                    <Form className="admin-form">
                        <Form.Group className="mb-3">
                            <Form.Label>Company Name</Form.Label>
                            <Form.Control 
                                type="text"
                                placeholder="e.g. DHL Express, FedEx"
                                value={formData.company_name}
                                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Tracking URL Structure</Form.Label>
                            <Form.Control 
                                type="text"
                                placeholder="e.g. https://www.dhl.com/track?id=%tracking_id%"
                                value={formData.tracking_url}
                                onChange={(e) => setFormData({...formData, tracking_url: e.target.value})}
                            />
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
