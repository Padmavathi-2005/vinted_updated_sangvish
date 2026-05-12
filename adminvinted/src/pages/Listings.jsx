import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Form, InputGroup, Spinner, ButtonGroup } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit, FaUpload, FaTimes } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import AdminSearchSelect from '../components/AdminSearchSelect';
import axios, { imageBaseURL } from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';
import { safeString, getImageUrl } from '../utils/constants';

const Listings = () => {
    const { formatPrice, t } = useLocalization();
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialFilter = queryParams.get('filter') || 'all';

    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [listingTypeFilter, setListingTypeFilter] = useState(initialFilter);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [initialFormData] = useState({
        title: '',
        description: '',
        price: '',
        category_id: '',
        subcategory_id: '',
        item_type_id: '',
        brand: '',
        size: '',
        color: '',
        condition: '',
        status: 'active',
        is_sold: false,
        is_blocked: false,
        attributes: [],
        seo_title: '',
        seo_description: '',
        seo_keywords: ''
    });
    const [formData, setFormData] = useState(initialFormData);
    const [saving, setSaving] = useState(false);
    const [togglingItemId, setTogglingItemId] = useState(null);
    const [categoryError, setCategoryError] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [errors, setErrors] = useState({});

    const validateField = (name, value) => {
        let error = '';
        if (name === 'title') {
            if (!value) error = 'Title is required';
            else if (/\d/.test(value)) error = 'Title should not contain numbers';
        } else if (name === 'price') {
            if (!value) error = 'Price is required';
            else if (parseFloat(value) <= 0) error = 'Price must be greater than 0';
        } else if (name === 'category_id') {
            if (!value) error = 'Category is required';
        } else if (name === 'condition') {
            if (!value) error = 'Condition is required';
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };
    const fileInputRef = useRef(null);

    // Pagination and global settings
    const { paginationLimit, globalSettings } = useSettings();

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = getImageUrl('images/site/not_found.png');
    };



    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        fetchListings();
    }, [listingTypeFilter]);

    const fetchOptions = async () => {
        try {
            const { data } = await axios.get('/api/admin/items/options');
            setCategories(data.categories || []);
            setSubcategories(data.subcategories || []);
            setItemTypes(data.itemTypes || []);
        } catch (error) {
            console.error("Error fetching options", error);
        }
    };

    const fetchListings = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/items', {
                params: { type: listingTypeFilter === 'all' ? undefined : listingTypeFilter }
            });
            setListings(data);
        } catch (error) {
            console.error("Error fetching listings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (listing) => {
        setSelectedListing(listing);
        showConfirm(
            'Delete Listing?',
            `Are you sure you want to delete "${safeString(listing.title)}"?`,
            'Yes, Delete'
        ).then((result) => {
            if (result.isConfirmed) {
                handleDeleteConfirm(listing._id);
            }
        });
    };

    const handleDeleteConfirm = async (id) => {
        try {
            await axios.delete(`/api/admin/items/${id}`);
            showToast('success', t('listings.toast.delete_success'));
            fetchListings();
        } catch (error) {
            console.error("Error deleting listing", error);
            showToast('error', t('listings.toast.delete_error'));
        }
    };

    const handleEdit = (listing) => {
        setSelectedListing(listing);
        setFormData({
            title: listing.title || '',
            description: listing.description || '',
            price: listing.price || '',
            category_id: listing.category_id?._id || listing.category_id || '',
            subcategory_id: listing.subcategory_id?._id || listing.subcategory_id || '',
            item_type_id: listing.item_type_id?._id || listing.item_type_id || '',
            brand: listing.brand || '',
            size: listing.size || '',
            color: listing.color || '',
            condition: listing.condition || '',
            status: listing.status || 'active',
            is_sold: !!listing.is_sold,
            is_blocked: listing.status === 'inactive',
            attributes: listing.attributes || [],
            seo_title: listing.seo_title || '',
            seo_description: listing.seo_description || '',
            seo_keywords: listing.seo_keywords || ''
        });
        setExistingImages(listing.images || []);
        setSelectedFiles([]);
        setShowEditModal(true);
    };

    const handleSaveListing = async () => {
        // Final validation check
        const newErrors = {};
        const requiredFields = ['title', 'price', 'category_id', 'condition'];
        requiredFields.forEach(field => {
            const err = validateField(field, formData[field]);
            if (err) newErrors[field] = err;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast('warning', "Please fix validation errors before saving");
            return;
        }

        setSaving(true);
        try {
            let finalStatus = formData.is_blocked ? 'inactive' : 'active';

            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'is_sold' && key !== 'is_blocked' && key !== 'status' && key !== 'attributes') {
                    data.append(key, formData[key]);
                }
            });
            data.set('status', finalStatus);
            data.set('is_sold', formData.is_sold);
            data.set('attributes', JSON.stringify(formData.attributes || []));
            data.append('existing_images', JSON.stringify(existingImages));
            
            selectedFiles.forEach(file => {
                data.append('images', file);
            });

            if (selectedListing) {
                await axios.put(`/api/admin/items/${selectedListing._id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/admin/items', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            showToast('success', selectedListing ? (t('listings.toast.update_success')) : (t('listings.toast.create_success')));
            setShowEditModal(false);
            fetchListings();
        } catch (error) {
            console.error("Error saving listing", error);
            showToast('error', t('listings.toast.save_error'));
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (listing, isActive) => {
        setTogglingItemId(listing._id);
        try {
            const newStatus = isActive ? 'active' : 'inactive';
            await axios.put(`/api/admin/items/${listing._id}`, { status: newStatus });
            setListings(listings.map(l =>
                l._id === listing._id ? { ...l, status: newStatus } : l
            ));
            showToast('success', t('listings.toast.status_update_success'));
        } catch (error) {
            console.error("Error toggling status", error);
            showToast('error', t('listings.toast.status_update_error'));
        } finally {
            setTogglingItemId(null);
        }
    };

    const columns = [
        {
            header: t('listings.table.item'),
            accessor: 'title',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    <div className="item-img-placeholder bg-light rounded" style={{ width: '45px', height: '45px', overflow: 'hidden' }}>
                        {row.images?.[0] ?
                            <img
                                src={getImageUrl(row.images[0])}
                                alt={row.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={handleImageError}
                            />
                            : <img src={getImageUrl('images/site/not_found.png')} alt="Not Found" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                    </div>
                    <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{safeString(row.title)}</div>
                        <div className="text-muted small">ID: {row._id.slice(-6).toUpperCase()}</div>
                    </div>
                </div>
            )
        },
        {
            header: t('listings.table.price'),
            accessor: 'price',
            render: (row) => <span className="fw-bold">{formatPrice(row.price)}</span>
        },
        {
            header: t('listings.table.category'),
            accessor: 'category_id',
            render: (row) => <span className="badge bg-light text-dark border">{safeString(row.category_id?.name) || 'N/A'}</span>
        },
        {
            header: t('listings.table.condition'),
            accessor: 'condition',
            render: (row) => <span className="text-capitalize small">{row.condition?.replace(/-/g, ' ')}</span>
        },
        {
            header: t('listings.table.availability'),
            accessor: 'is_sold',
            render: (row) => (
                <span className={`badge ${row.is_sold ? 'bg-danger' : 'bg-success'}`}>
                    {row.is_sold ? t('listings.modal.sold') : t('listings.modal.available')}
                </span>
            )
        },
        {
            header: t('listings.table.status'),
            accessor: 'status',
            render: (row) => (
                <Toggle
                    checked={row.status.toLowerCase() === 'active'}
                    onChange={(checked) => handleStatusToggle(row, checked)}
                    label={row.status.toLowerCase() === 'active' ? t('listings.modal.active') : t('listings.modal.blocked')}
                    disabled={togglingItemId === row._id}
                />
            )
        }
    ];

    const filteredListings = Array.isArray(listings) ? listings.filter(l =>
        (l.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l._id || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    // Client-side pagination logic



    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                        <div>
                            <h1 className="dashboard-title h3 mb-1 text-primary">{t('listings.title')}</h1>
                            <p className="text-muted small mb-0">{t('listings.subtitle')}</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => {
                            setFormData(initialFormData);
                            setSelectedListing(null);
                            setErrors({});
                            setShowEditModal(true);
                        }}>
                            <FaPlus className="me-2" /> {t('listings.add_new')}
                        </Button>
                    </div>

                    <div className="d-flex gap-3 flex-wrap mb-4">
                        <div className="flex-grow-1 search-box-container">
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={t('listings.search_placeholder')}
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); }}
                                />
                            </InputGroup>
                        </div>
                        <div style={{ width: '200px' }}>
                            <Form.Select
                                value={listingTypeFilter}
                                onChange={(e) => setListingTypeFilter(e.target.value)}
                                className="admin-filter-select"
                            >
                                <option value="all">{t('listings.filter_all')}</option>
                                <option value="today">{t('listings.filter_today')}</option>
                            </Form.Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredListings}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            pagination={true}
                            emptyMessage={t('listings.no_listings')}
                        />
                    )}
                </Card>

                {/* Add/Edit Modal */}
                <Modal
                    show={showEditModal}
                    onHide={() => setShowEditModal(false)}
                    title={selectedListing ? t('listings.modal.edit_title') : t('listings.modal.add_title')}
                    footer={
                        <>
                            <Button variant="outline-secondary" className="btn-admin-outline" onClick={() => setShowEditModal(false)}>{t('listings.modal.cancel')}</Button>
                            <Button variant="primary" className="btn-admin-action" onClick={handleSaveListing} disabled={saving}>
                                {saving ? <Spinner size="sm" className="me-2" /> : null}
                                {t('listings.modal.save')}
                            </Button>
                        </>
                    }
                >
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('listings.modal.item_title')}</Form.Label>
                            <Form.Control
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder={t('listings.modal.item_title_placeholder')}
                                isInvalid={!!errors.title}
                            />
                            <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
                        </Form.Group>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.price')}</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="price"
                                        min="1"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        style={{ appearance: 'textfield' }}
                                        className="no-arrows"
                                        isInvalid={!!errors.price}
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.price}</Form.Control.Feedback>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.condition')}</Form.Label>
                                    <AdminSearchSelect
                                        options={[
                                            { value: 'New', label: 'New' },
                                            { value: 'Very Good', label: 'Very Good' },
                                            { value: 'Good', label: 'Good' },
                                            { value: 'Normal', label: 'Normal' },
                                            { value: 'Bad', label: 'Bad' },
                                            { value: 'Very Bad', label: 'Very Bad' },
                                        ]}
                                        value={formData.condition}
                                        onChange={(val) => handleSelectChange('condition', val)}
                                        placeholder={t('listings.modal.condition_placeholder')}
                                        error={errors.condition}
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <div className="row mb-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label className={categoryError ? "text-danger fw-bold" : ""}>
                                        {t('listings.modal.category')} {categoryError && <span className="small ms-2"> - {t('listings.modal.category_error')}</span>}
                                    </Form.Label>
                                    <div className={categoryError ? "shake-horizontal" : ""}>
                                        <AdminSearchSelect
                                            options={categories.map(cat => ({ value: cat._id, label: cat.name }))}
                                            value={formData.category_id}
                                            onChange={(val) => {
                                                handleSelectChange('category_id', val);
                                                setFormData(prev => ({ ...prev, subcategory_id: '', item_type_id: '' }));
                                            }}
                                            placeholder={t('listings.modal.category_placeholder')}
                                            error={errors.category_id}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <div onClick={() => {
                                        if (!formData.category_id) {
                                            setCategoryError(true);
                                            setTimeout(() => setCategoryError(false), 3000);
                                        }
                                    }}>
                                        <Form.Label>{t('listings.modal.subcategory')}</Form.Label>
                                        <AdminSearchSelect
                                            options={subcategories
                                                .filter(sub => sub.category_id === formData.category_id)
                                                .map(sub => ({ value: sub._id, label: sub.name }))}
                                            value={formData.subcategory_id}
                                            onChange={(val) => setFormData({ ...formData, subcategory_id: val, item_type_id: '' })}
                                            placeholder={t('listings.modal.subcategory_placeholder')}
                                            disabled={!formData.category_id}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.item_type') || 'Item Type'}</Form.Label>
                                    <AdminSearchSelect
                                        options={itemTypes
                                            .filter(type => type.subcategory_id === formData.subcategory_id)
                                            .map(type => ({ value: type._id, label: type.name }))}
                                        value={formData.item_type_id}
                                        onChange={(val) => setFormData({ ...formData, item_type_id: val })}
                                        placeholder={t('listings.modal.item_type_placeholder') || 'Select Item Type'}
                                        disabled={!formData.subcategory_id}
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <div className="row mb-3">
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.brand') || 'Brand'}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        placeholder="Enter brand"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.size') || 'Size'}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                        placeholder="Enter size"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.color') || 'Color'}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        placeholder="Enter color"
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>{t('listings.modal.description')}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('listings.modal.description_placeholder')}
                            />
                        </Form.Group>

                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <Form.Label className="m-0">{t('listings.modal.specifications') || 'Specifications'}</Form.Label>
                                <Button size="sm" variant="outline-primary" onClick={() => {
                                    const newAttrs = [...(formData.attributes || []), { key: '', value: '' }];
                                    setFormData({ ...formData, attributes: newAttrs });
                                }}>
                                    + Add Detail
                                </Button>
                            </div>
                            {(formData.attributes || []).map((attr, idx) => (
                                <div key={idx} className="d-flex gap-2 mb-2">
                                    <Form.Control 
                                        size="sm" 
                                        placeholder="Label (e.g. Material)" 
                                        value={attr.key}
                                        onChange={(e) => {
                                            const newAttrs = [...formData.attributes];
                                            newAttrs[idx].key = e.target.value;
                                            setFormData({ ...formData, attributes: newAttrs });
                                        }}
                                    />
                                    <Form.Control 
                                        size="sm" 
                                        placeholder="Value (e.g. Cotton)" 
                                        value={attr.value}
                                        onChange={(e) => {
                                            const newAttrs = [...formData.attributes];
                                            newAttrs[idx].value = e.target.value;
                                            setFormData({ ...formData, attributes: newAttrs });
                                        }}
                                    />
                                    <Button size="sm" variant="outline-danger" onClick={() => {
                                        setFormData({ ...formData, attributes: formData.attributes.filter((_, i) => i !== idx) });
                                    }}>
                                        <FaTrash size={12} />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Form.Group className="mb-4">
                            <Form.Label>{t('listings.modal.images')}</Form.Label>
                            <div className="d-flex flex-wrap gap-2 mb-2">
                                {existingImages.map((img, idx) => (
                                    <div key={`existing-${idx}`} className="position-relative" style={{ width: '80px', height: '80px' }}>
                                        <img src={getImageUrl(img)} alt="" className="w-100 h-100 object-fit-cover rounded border" />
                                        <button 
                                            type="button"
                                            className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center rounded-circle"
                                            style={{ width: '20px', height: '20px', marginTop: '-5px', marginRight: '-5px' }}
                                            onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                ))}
                                {selectedFiles.map((file, idx) => (
                                    <div key={`new-${idx}`} className="position-relative" style={{ width: '80px', height: '80px' }}>
                                        <img src={URL.createObjectURL(file)} alt="" className="w-100 h-100 object-fit-cover rounded border" />
                                        <button 
                                            type="button"
                                            className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center rounded-circle"
                                            style={{ width: '20px', height: '20px', marginTop: '-5px', marginRight: '-5px' }}
                                            onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                ))}
                                <div 
                                    className="d-flex align-items-center justify-content-center border rounded bg-light cursor-pointer image-upload-placeholder"
                                    style={{ width: '80px', height: '80px', borderStyle: 'dashed' }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FaPlus className="text-muted" />
                                    <input 
                                        type="file" 
                                        multiple 
                                        hidden 
                                        ref={fileInputRef} 
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files);
                                            const validFiles = [];
                                            for (const file of files) {
                                                try {
                                                    const processedFile = await new Promise((resolve, reject) => {
                                                        const reader = new FileReader();
                                                        reader.readAsDataURL(file);
                                                        reader.onload = (ev) => {
                                                            const img = new Image();
                                                            img.src = ev.target.result;
                                                            img.onload = () => {
                                                                if (img.width < 500 || img.height < 500) {
                                                                    reject(new Error(`"${file.name}" is too small. Minimum required: 500x500px. (Found: ${img.width}x${img.height}px)`));
                                                                    return;
                                                                }
                                                                const canvas = document.createElement('canvas');
                                                                const scale = 500 / img.width;
                                                                canvas.width = 500;
                                                                canvas.height = img.height * scale;
                                                                const ctx = canvas.getContext('2d');
                                                                ctx.imageSmoothingEnabled = true;
                                                                ctx.imageSmoothingQuality = 'high';
                                                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                                                canvas.toBlob((b) => {
                                                                    resolve(new File([b], file.name, { type: 'image/jpeg' }));
                                                                }, 'image/jpeg', 0.9);
                                                            };
                                                            img.onerror = () => reject(new Error(`Failed to load "${file.name}"`));
                                                        };
                                                        reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
                                                    });
                                                    validFiles.push(processedFile);
                                                } catch (err) {
                                                    showToast('error', err.message);
                                                }
                                            }
                                            if (validFiles.length > 0) {
                                                setSelectedFiles([...selectedFiles, ...validFiles]);
                                            }
                                            e.target.value = ''; // Reset input
                                        }}
                                    />
                                </div>
                            </div>
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('listings.modal.is_sold')}</Form.Label>
                                    <div className="d-flex align-items-center gap-2 p-2 border rounded bg-light">
                                        <Toggle
                                            checked={formData.is_sold}
                                            onChange={(checked) => setFormData({ ...formData, is_sold: checked, is_blocked: checked ? false : formData.is_blocked })}
                                            label={formData.is_sold ? t('listings.modal.sold') : t('listings.modal.available')}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                        </div>

                        <hr className="my-4" />
                        <h5 className="mb-3 text-primary">SEO Settings <span className="text-muted small fw-normal">(Optional)</span></h5>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>SEO Title <span className="text-muted small fw-normal">(Optional)</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="seo_title"
                                value={formData.seo_title}
                                onChange={handleInputChange}
                                placeholder="Enter SEO Title"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>SEO Description <span className="text-muted small fw-normal">(Optional)</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                name="seo_description"
                                value={formData.seo_description}
                                onChange={handleInputChange}
                                placeholder="Enter SEO Description"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>SEO Keywords <span className="text-muted small fw-normal">(Optional)</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="seo_keywords"
                                value={formData.seo_keywords}
                                onChange={handleInputChange}
                                placeholder="e.g. vintage, jacket, denim, blue"
                            />
                            <Form.Text className="text-muted">Separate keywords with commas</Form.Text>
                        </Form.Group>
                    </Form>
                </Modal>

            </Container>
            <style>
                {`
                    .no-arrows::-webkit-outer-spin-button,
                    .no-arrows::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                `}
            </style>
        </div>
    );
};

export default Listings;
