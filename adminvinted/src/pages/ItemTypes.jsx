import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit, FaUpload, FaTags } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import axios from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';
import { getImageUrl } from '../utils/constants';
import '../styles/UnifiedCategories.css';

const ItemTypes = () => {
    const [itemTypes, setItemTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        subcategory_id: '',
        is_active: true,
        description: ''
    });
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Pagination
    const { paginationLimit } = useSettings();


    useEffect(() => {
        fetchOptions();
        fetchItemTypes();
    }, []);

    const fetchOptions = async () => {
        try {
            const { data } = await axios.get('/api/admin/subcategories');
            setSubcategories(data);
        } catch (error) {
            console.error("Error fetching subcategories", error);
        }
    };

    const fetchItemTypes = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/item-types');
            setItemTypes(data);
        } catch (error) {
            console.error("Error fetching item types", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (type) => {
        setSelectedType(type);
        setFormData({
            name: type.name || '',
            slug: type.slug || '',
            subcategory_id: type.subcategory_id?._id || type.subcategory_id || '',
            is_active: type.is_active ?? true,
            description: type.description || '',
            image: type.image || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name) { showToast('warning', 'Name is required'); return; }
        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'category_image' && formData[key]) {
                    data.append('category_image', formData[key]);
                } else if (formData[key] !== undefined) {
                    // Avoid sending objects as values
                    let val = formData[key];
                    if (val && typeof val === 'object' && val._id) val = val._id;
                    data.append(key, val);
                }
            });

            const opts = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (selectedType) {
                await axios.put(`/api/admin/item-types/${selectedType._id}`, data, opts);
            } else {
                await axios.post('/api/admin/item-types', data, opts);
            }
            showToast('success', `Item Type ${selectedType ? 'updated' : 'created'} successfully`);
            setShowModal(false);
            fetchItemTypes();
        } catch (error) {
            console.error("Error saving item type", error);
            showToast('error', error.response?.data?.message || "Failed to save item type");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (type) => {
        showConfirm(
            'Delete Item Type?',
            `Are you sure you want to delete "${type.name}"?`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/item-types/${type._id}`);
                    showToast('success', 'Item Type deleted successfully');
                    fetchItemTypes();
                } catch (error) {
                    console.error("Error deleting item type", error);
                    showToast('error', "Failed to delete item type");
                }
            }
        });
    };

    const columns = [
        {
            header: 'Item Type Name',
            accessor: 'name',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                        {row.image
                            ? <img src={getImageUrl(row.image)} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl('images/site/not_found.png'); }} />
                            : <FaTags />
                        }
                    </div>
                    <div>
                        <div className="fw-bold">{row.name}</div>
                        <code className="small text-muted">{row.slug}</code>
                    </div>
                </div>
            )
        },
        {
            header: 'Subcategory',
            accessor: 'subcategory_id',
            render: (row) => <span className="badge bg-light text-dark border">{row.subcategory_id?.name || 'N/A'}</span>
        },
    ];

    const filteredData = itemTypes.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.subcategory_id?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );




    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Item Types</h2>
                            <p className="text-muted small mb-0">Manage marketplace specific item types</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => {
                            setSelectedType(null);
                            setFormData({ name: '', slug: '', subcategory_id: '', is_active: true, description: '' });
                            setShowModal(true);
                        }}>
                            <FaPlus className="me-2" /> Add Item Type
                        </Button>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '300px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search item types..."
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

                {/* Add/Edit Modal */}
                <Modal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    title={selectedType ? "Edit Item Type" : "Add Item Type"}
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : "Save Changes"}
                            </Button>
                        </>
                    }
                >
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Item Type Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Graphic Tees"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Subcategory</Form.Label>
                            <Form.Select
                                value={formData.subcategory_id}
                                onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                            >
                                <option value="">Select Subcategory...</option>
                                {subcategories.map(sub => (
                                    <option key={sub._id} value={sub._id}>
                                        {sub.name} ({sub.category_id?.name || 'N/A'})
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Slug</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="e.g. graphic-tees"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Icon / Image</Form.Label>
                            <div className="cat-upload-box" onClick={() => fileInputRef.current?.click()}>
                                {(formData.category_image || (formData.image && typeof formData.image === 'string')) ? (
                                    <img
                                        src={formData.category_image ? URL.createObjectURL(formData.category_image) : getImageUrl(formData.image)}
                                        alt="Preview"
                                        className="cat-upload-preview"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="cat-upload-placeholder text-muted">
                                        <FaUpload size={24} className="mb-2" style={{ color: 'var(--primary-color)' }} />
                                        <div className="small fw-bold">Click to upload</div>
                                        <div className="extra-small opacity-75">PNG, JPG or SVG</div>
                                    </div>
                                )}
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setFormData({ ...formData, category_image: e.target.files[0] })} />
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description..."
                            />
                        </Form.Group>

                        <Form.Check
                            type="switch"
                            label="Active"
                            checked={formData.is_active ?? true}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default ItemTypes;
