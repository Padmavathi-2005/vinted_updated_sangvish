import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner, Badge, Nav } from 'react-bootstrap';
import { FaPlus, FaSearch, FaFolder, FaLayerGroup, FaTags, FaUpload } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import axios, { imageBaseURL } from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';
import { safeString, getImageUrl } from '../utils/constants';
import '../styles/UnifiedCategories.css';

const AVATAR = (image, fallback) => {
    return (
        <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
            {image
                ? <img src={getImageUrl(image)} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl('images/site/not_found.png'); }} />
                : fallback
            }
        </div>
    );
};

const UnifiedCategories = () => {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);

    const [activeTab, setActiveTab] = useState('categories');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCatFilter, setSelectedCatFilter] = useState('');
    const [selectedSubFilter, setSelectedSubFilter] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('category');
    const [modalMode, setModalMode] = useState('add');
    const [formData, setFormData] = useState({});
    const fileInputRef = useRef(null);

    useEffect(() => { fetchAllData(); }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [catsRes, subsRes, typesRes] = await Promise.all([
                axios.get('/api/admin/categories'),
                axios.get('/api/admin/subcategories'),
                axios.get('/api/admin/item-types')
            ]);
            setCategories(catsRes.data);
            setSubcategories(subsRes.data);
            setItemTypes(typesRes.data);
        } catch (e) {
            showToast('error', 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (type, mode, data = null) => {
        setModalType(type);
        setModalMode(mode);
        if (mode === 'edit' && data) {
            // Populate ID strings from objects
            const cleaned = { ...data };
            if (cleaned.category_id && typeof cleaned.category_id === 'object') cleaned.category_id = cleaned.category_id._id;
            if (cleaned.subcategory_id && typeof cleaned.subcategory_id === 'object') cleaned.subcategory_id = cleaned.subcategory_id._id;
            setFormData(cleaned);
        } else {
            setFormData({ name: '', slug: '', is_active: true });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name) { showToast('warning', 'Name is required'); return; }
        setSaving(true);
        const apiPath = modalType === 'category' ? 'categories' : (modalType === 'subcategory' ? 'subcategories' : 'item-types');
        try {
            if (modalType === 'category' || modalType === 'subcategory' || modalType === 'itemType') {
                const data = new FormData();
                Object.keys(formData).forEach(key => {
                    if (key === 'category_image' && formData[key]) {
                        data.append('category_image', formData[key]);
                    } else if (formData[key] !== undefined) {
                        // Ensure we don't send objects (populated fields) that become "[object Object]"
                        let val = formData[key];
                        if (val && typeof val === 'object' && val._id) val = val._id;
                        data.append(key, val);
                    }
                });
                const opts = { headers: { 'Content-Type': 'multipart/form-data' } };
                if (modalMode === 'edit') await axios.put(`/api/admin/${apiPath}/${formData._id}`, data, opts);
                else await axios.post(`/api/admin/${apiPath}`, data, opts);
            } else {
                if (modalMode === 'edit') await axios.put(`/api/admin/${apiPath}/${formData._id}`, formData);
                else await axios.post(`/api/admin/${apiPath}`, formData);
            }
            showToast('success', 'Saved successfully');
            setShowModal(false);
            fetchAllData();
        } catch (e) {
            showToast('error', e.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (type, id, name) => {
        const apiPath = type === 'category' ? 'categories' : (type === 'subcategory' ? 'subcategories' : 'item-types');
        showConfirm(`Delete ${type}?`, `Delete "${name}"?`, 'Yes, Delete').then(async (r) => {
            if (r.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/${apiPath}/${id}`);
                    showToast('success', 'Deleted');
                    fetchAllData();
                } catch { showToast('error', 'Failed to delete'); }
            }
        });
    };

    // ---- Table Columns ----
    const categoryColumns = [
        {
            header: 'Category', accessor: 'name',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    {AVATAR(row.image, <FaFolder />)}
                    <div>
                        <div className="fw-bold">{safeString(row.name)}</div>
                        <div className="text-muted small font-monospace">{row.slug}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Subcategories', accessor: '_id',
            render: (row) => (
                <Badge bg="light" text="dark" className="border">
                    {subcategories.filter(s => s.category_id?._id === row._id || s.category_id === row._id).length}
                </Badge>
            )
        },
        {
            header: 'Status', accessor: 'is_active',
            render: (row) => (
                <span className={`badge ${row.is_active !== false ? 'bg-success' : 'bg-secondary'}`}>
                    {row.is_active !== false ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Description', accessor: 'description',
            render: (row) => <span className="text-muted small">{safeString(row.description) || '—'}</span>
        },
    ];

    const subcategoryColumns = [
        {
            header: 'Subcategory', accessor: 'name',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    {AVATAR(row.image, <FaLayerGroup />)}
                    <div>
                        <div className="fw-bold">{row.name}</div>
                        <div className="text-muted small font-monospace">{row.slug}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Parent Category', accessor: 'category_id',
            render: (row) => (
                <span className="badge bg-light text-dark border">
                    {safeString(row.category_id?.name || categories.find(c => c._id === row.category_id)?.name) || '—'}
                </span>
            )
        },
        {
            header: 'Item Types', accessor: '_id',
            render: (row) => (
                <Badge bg="light" text="dark" className="border">
                    {itemTypes.filter(i => i.subcategory_id?._id === row._id || i.subcategory_id === row._id).length}
                </Badge>
            )
        },
        {
            header: 'Status', accessor: 'is_active',
            render: (row) => (
                <span className={`badge ${row.is_active !== false ? 'bg-success' : 'bg-secondary'}`}>
                    {row.is_active !== false ? 'Active' : 'Inactive'}
                </span>
            )
        },
    ];

    const itemTypeColumns = [
        {
            header: 'Item Type', accessor: 'name',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    {AVATAR(row.image, <FaTags />)}
                    <div>
                        <div className="fw-bold">{row.name}</div>
                        <div className="text-muted small font-monospace">{row.slug}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Subcategory', accessor: 'subcategory_id',
            render: (row) => (
                <span className="badge bg-light text-dark border">
                    {safeString(row.subcategory_id?.name || subcategories.find(s => s._id === row.subcategory_id)?.name) || '—'}
                </span>
            )
        },
        {
            header: 'Status', accessor: 'is_active',
            render: (row) => (
                <span className={`badge ${row.is_active !== false ? 'bg-success' : 'bg-secondary'}`}>
                    {row.is_active !== false ? 'Active' : 'Inactive'}
                </span>
            )
        },
    ];

    // ---- Filtered Data ----
    const q = searchTerm.toLowerCase();
    const filteredCategories = categories.filter(c => c.name?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q));
    const filteredSubcategories = subcategories.filter(s => {
        const matchSearch = s.name?.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q);
        const matchCat = !selectedCatFilter || s.category_id?._id === selectedCatFilter || s.category_id === selectedCatFilter;
        return matchSearch && matchCat;
    });
    const filteredItemTypes = itemTypes.filter(i => {
        const matchSearch = i.name?.toLowerCase().includes(q) || i.slug?.toLowerCase().includes(q);
        const matchSub = !selectedSubFilter || i.subcategory_id?._id === selectedSubFilter || i.subcategory_id === selectedSubFilter;
        return matchSearch && matchSub;
    });

    const addLabels = { categories: 'Add Category', subcategories: 'Add Subcategory', itemTypes: 'Add Item Type' };
    const modalTypes = { categories: 'category', subcategories: 'subcategory', itemTypes: 'itemType' };

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">

                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                        <div>
                            <h1 className="dashboard-title h3 mb-1">Categories</h1>
                            <p className="text-muted small mb-0">Manage categories, subcategories, and item types</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => openModal(modalTypes[activeTab], 'add')}>
                            <FaPlus className="me-2" />{addLabels[activeTab]}
                        </Button>
                    </div>

                    {/* Segmented Tab Control */}
                    <div className="cat-seg-tabs mb-4">
                        <button
                            className={`cat-seg-btn ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('categories'); setSearchTerm(''); setSelectedCatFilter(''); setSelectedSubFilter(''); }}
                        >
                            <FaFolder size={12} />
                            <span>Categories</span>
                            <span className="cat-seg-count">{categories.length}</span>
                        </button>
                        <button
                            className={`cat-seg-btn ${activeTab === 'subcategories' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('subcategories'); setSearchTerm(''); setSelectedCatFilter(''); setSelectedSubFilter(''); }}
                        >
                            <FaLayerGroup size={12} />
                            <span>Subcategories</span>
                            <span className="cat-seg-count">{subcategories.length}</span>
                        </button>
                        <button
                            className={`cat-seg-btn ${activeTab === 'itemTypes' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('itemTypes'); setSearchTerm(''); setSelectedCatFilter(''); setSelectedSubFilter(''); }}
                        >
                            <FaTags size={12} />
                            <span>Item Types</span>
                            <span className="cat-seg-count">{itemTypes.length}</span>
                        </button>
                    </div>

                    {/* Filters Row — same as Users page */}
                    <div className="d-flex gap-3 flex-wrap mb-4 align-items-center">
                        <div style={{ maxWidth: '350px', flex: 1 }}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={`Search ${activeTab}...`}
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </div>

                        {activeTab === 'subcategories' && (
                            <Form.Select style={{ width: '220px' }} value={selectedCatFilter} onChange={(e) => setSelectedCatFilter(e.target.value)} className="admin-filter-select">
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{safeString(c.name)}</option>)}
                            </Form.Select>
                        )}

                        {activeTab === 'itemTypes' && (
                            <Form.Select style={{ width: '220px' }} value={selectedSubFilter} onChange={(e) => setSelectedSubFilter(e.target.value)} className="admin-filter-select">
                                <option value="">All Subcategories</option>
                                {subcategories.map(s => <option key={s._id} value={s._id}>{safeString(s.name)}</option>)}
                            </Form.Select>
                        )}
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Loading...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'categories' && (
                                <Table columns={categoryColumns} data={filteredCategories} actions={true}
                                    onEdit={(row) => openModal('category', 'edit', row)}
                                    onDelete={(row) => handleDelete('category', row._id, row.name)}
                                    pagination={true} emptyMessage="No categories found." />
                            )}
                            {activeTab === 'subcategories' && (
                                <Table columns={subcategoryColumns} data={filteredSubcategories} actions={true}
                                    onEdit={(row) => openModal('subcategory', 'edit', row)}
                                    onDelete={(row) => handleDelete('subcategory', row._id, row.name)}
                                    pagination={true} emptyMessage="No subcategories found." />
                            )}
                            {activeTab === 'itemTypes' && (
                                <Table columns={itemTypeColumns} data={filteredItemTypes} actions={true}
                                    onEdit={(row) => openModal('itemType', 'edit', row)}
                                    onDelete={(row) => handleDelete('itemType', row._id, row.name)}
                                    pagination={true} emptyMessage="No item types found." />
                            )}
                        </>
                    )}
                </Card>

                {/* Modal */}
                <Modal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    title={`${modalMode === 'add' ? 'Add' : 'Edit'} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
                    size="md"
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={saving} className="btn-admin-action">
                                {saving ? <Spinner size="sm" className="me-2" /> : null}
                                Save Changes
                            </Button>
                        </>
                    }
                >
                    <Form className="admin-form">
                        <Form.Group className="mb-3">
                            <Form.Label>Name *</Form.Label>
                            <Form.Control type="text" value={safeString(formData.name) || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={`Enter ${modalType} name`} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Slug</Form.Label>
                            <Form.Control type="text" value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder={formData.name?.toLowerCase().replace(/ /g, '-') || 'auto-generated'} />
                        </Form.Group>

                        {modalType === 'subcategory' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Parent Category *</Form.Label>
                                <Form.Select value={formData.category_id || ''} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                                    <option value="">Select Category...</option>
                                    {categories.map(c => <option key={c._id} value={c._id}>{safeString(c.name)}</option>)}
                                </Form.Select>
                            </Form.Group>
                        )}

                        {modalType === 'itemType' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Parent Subcategory *</Form.Label>
                                <Form.Select value={formData.subcategory_id || ''} onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}>
                                    <option value="">Select Subcategory...</option>
                                    {subcategories.map(s => <option key={s._id} value={s._id}>{safeString(s.name)} ({safeString(s.category_id?.name) || ''})</option>)}
                                </Form.Select>
                            </Form.Group>
                        )}

                        {(modalType === 'category' || modalType === 'subcategory' || modalType === 'itemType') && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Image</Form.Label>
                                    <div className="cat-upload-box" onClick={() => fileInputRef.current?.click()}>
                                        {(formData.category_image || (formData.image && typeof formData.image === 'string')) ? (
                                            <img
                                                src={formData.category_image ? URL.createObjectURL(formData.category_image) : getImageUrl(formData.image)}
                                                alt="Preview"
                                                className="cat-upload-preview"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="cat-upload-placeholder">
                                                <FaUpload size={20} style={{ color: 'var(--primary-color)' }} />
                                                <span>Click to upload image</span>
                                                <small>PNG, JPG or SVG</small>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setFormData({ ...formData, category_image: e.target.files[0] })} />
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control as="textarea" rows={2} value={safeString(formData.description) || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description..." />
                                </Form.Group>
                            </>
                        )}

                        <Form.Check type="switch" label="Active" checked={formData.is_active ?? true} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default UnifiedCategories;
