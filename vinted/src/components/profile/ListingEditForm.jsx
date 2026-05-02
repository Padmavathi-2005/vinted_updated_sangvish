import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../utils/axios';
import { FaImage, FaTimes, FaSave, FaArrowLeft, FaPlusCircle } from 'react-icons/fa';
import CustomSelect from '../common/CustomSelect';
import CurrencyContext from '../../context/CurrencyContext';
import '../../styles/SellItem.css';
import { getImageUrl, safeString } from '../../utils/constants';
import ImageCropModal from '../common/ImageCropModal';

const MAX_PHOTOS = 20;

const ListingEditForm = ({ item, onCancel, onUpdate }) => {
    const { currentCurrency, defaultCurrency } = React.useContext(CurrencyContext);

    // Basic Fields
    const [title, setTitle] = useState(item?.title || '');
    const [description, setDescription] = useState(item?.description || '');
    const [brand, setBrand] = useState(item?.brand || '');
    const [size, setSize] = useState(item?.size || '');
    const [color, setColor] = useState(item?.color || '');
    const [condition, setCondition] = useState(item?.condition || '');
    const [price, setPrice] = useState(item?.price || '');
    const [isSwappable, setIsSwappable] = useState(item?.negotiable || false);

    // Categories Logic
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(item?.category_id?._id || item?.category_id || '');
    const [subcategories, setSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState(item?.subcategory_id?._id || item?.subcategory_id || '');
    const [itemTypes, setItemTypes] = useState([]);
    const [selectedItemType, setSelectedItemType] = useState(item?.item_type_id?._id || item?.item_type_id || '');

    // Dynamic Attributes
    const [specifications, setSpecifications] = useState(item?.attributes || []);

    // Images State
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Crop State
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [pendingPhotos, setPendingPhotos] = useState([]);

    // Sync Item Images on load
    useEffect(() => {
        if (item?.images?.length > 0) {
            setPhotos(item.images.map(img => ({
                url: getImageUrl(img),
                isExisting: true,
                path: img
            })));
        }
    }, [item]);

    // Fetch Full Category Tree
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/categories/full');
                setCategories(res.data);

                const initialCatId = item?.category_id?._id || item?.category_id;
                if (initialCatId) {
                    const cat = res.data.find(c => c._id === initialCatId);
                    if (cat) {
                        setSubcategories(cat.subcategories || []);
                        const initialSubId = item?.subcategory_id?._id || item?.subcategory_id;
                        if (initialSubId) {
                            const sub = cat.subcategories.find(s => s._id === initialSubId);
                            if (sub) setItemTypes(sub.items || []);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load categories:", err);
            }
        };
        fetchCategories();
    }, [item]);

    const handleCategoryChange = (val) => {
        setSelectedCategory(val);
        const cat = categories.find(c => c._id === val);
        setSubcategories(cat ? cat.subcategories : []);
        setSelectedSubcategory('');
        setItemTypes([]);
        setSelectedItemType('');
    };

    const handleSubcategoryChange = (val) => {
        setSelectedSubcategory(val);
        const sub = subcategories.find(s => s._id === val);
        setItemTypes(sub ? sub.items : []);
        setSelectedItemType('');
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const readers = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve({ readerResult: reader.result, file });
            });
        });

        Promise.all(readers).then(results => {
            setPendingPhotos(results);
            setTempImage(results[0].readerResult);
            setShowCropModal(true);
        });
        
        e.target.value = '';
    };

    const handleCropComplete = (croppedImageBlob) => {
        const currentPhoto = pendingPhotos[0];
        let file, url;

        if (!croppedImageBlob) {
            file = currentPhoto.file;
            url = URL.createObjectURL(file);
        } else {
            file = new File([croppedImageBlob], currentPhoto.file.name, { type: 'image/jpeg' });
            url = URL.createObjectURL(croppedImageBlob);
        }
        
        const newPhoto = {
            url,
            file,
            isExisting: false
        };

        setPhotos(prev => [...prev, newPhoto].slice(0, MAX_PHOTOS));

        const remaining = pendingPhotos.slice(1);
        if (remaining.length > 0) {
            setPendingPhotos(remaining);
            setTempImage(remaining[0].readerResult);
        } else {
            setPendingPhotos([]);
            setTempImage(null);
            setShowCropModal(false);
        }
    };

    const handleCropCancel = () => {
        const remaining = pendingPhotos.slice(1);
        if (remaining.length > 0) {
            setPendingPhotos(remaining);
            setTempImage(remaining[0].readerResult);
        } else {
            setPendingPhotos([]);
            setTempImage(null);
            setShowCropModal(false);
        }
    };

    const handleAddSpec = () => setSpecifications([...specifications, { key: '', value: '' }]);
    const handleSpecChange = (idx, field, val) => {
        const updated = specifications.map((s, i) => i === idx ? { ...s, [field]: val } : s);
        setSpecifications(updated);
    };
    const handleRemoveSpec = (idx) => setSpecifications(specifications.filter((_, i) => i !== idx));

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category_id', selectedCategory);
        formData.append('subcategory_id', selectedSubcategory);
        if (selectedItemType) formData.append('item_type_id', selectedItemType);
        formData.append('brand', brand);
        formData.append('size', size);
        formData.append('color', color);
        formData.append('condition', condition);
        formData.append('price', price);
        formData.append('currency_id', currentCurrency ? currentCurrency._id : (defaultCurrency ? defaultCurrency._id : ''));
        formData.append('negotiable', isSwappable);
        formData.append('attributes', JSON.stringify(specifications.filter(s => s.key && s.value)));

        const existingPaths = photos.filter(p => p.isExisting).map(p => p.path);
        formData.append('existingImages', JSON.stringify(existingPaths));
        photos.filter(p => !p.isExisting).forEach(p => formData.append('images', p.file));

        try {
            const res = await axios.put(`/api/items/${item._id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpdate(res.data);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Could not update listing.');
        } finally {
            setLoading(false);
        }
    };

    const catOptions = useMemo(() => categories.map(c => ({ value: c._id, label: safeString(c.name) })), [categories]);
    const subOptions = useMemo(() => subcategories.map(s => ({ value: s._id, label: safeString(s.name) })), [subcategories]);
    const itemTypeOptions = useMemo(() => itemTypes.map(i => ({ value: i._id, label: safeString(i.name) })), [itemTypes]);

    return (
        <div className="si-page" style={{ padding: 0, backgroundColor: 'transparent' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button type="button" onClick={onCancel} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2">
                    <FaArrowLeft /> Back
                </button>
                <div className="d-flex gap-2">
                    <button type="button" onClick={onCancel} className="btn btn-light btn-sm px-4">Cancel</button>
                    <button type="button" onClick={handleSubmit} className="btn btn-primary btn-sm px-4 d-flex align-items-center gap-2" disabled={loading}>
                        <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="si-container" style={{ maxWidth: '100%', margin: 0, padding: 0 }}>
                <form onSubmit={handleSubmit}>
                    <div className="si-card">
                        <h2 className="si-section-title">Photos</h2>
                        <div className="si-photos-area mt-3">
                            <div className="si-photos-row">
                                <label className="si-photo-add-btn">
                                    <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} hidden />
                                    <FaImage className="si-add-icon" />
                                    <span>Add</span>
                                </label>
                                {photos.map((photo, index) => (
                                    <div key={index} className="si-photo-item">
                                        <img src={photo.url} alt="Listing" className="si-photo-img" />
                                        <button type="button" className="si-photo-remove" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}>
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="si-card">
                        <div className="si-field">
                            <label className="si-label">Title</label>
                            <input type="text" className="si-input" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div className="si-field si-field-last">
                            <label className="si-label">Description</label>
                            <textarea className="si-textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} required />
                        </div>
                    </div>

                    <div className="si-card">
                        <h2 className="si-section-title mb-3">Item details</h2>
                        <div className="si-grid-2">
                            <div className="si-field">
                                <div className="si-label-row">
                                    <label className="si-label">Category</label>
                                    <button type="button" className="si-add-inline-btn">+ Add Category</button>
                                </div>
                                <CustomSelect options={catOptions} value={selectedCategory} onChange={handleCategoryChange} />
                            </div>
                            <div className="si-field">
                                <div className="si-label-row">
                                    <label className="si-label">Subcategory</label>
                                    <button type="button" className="si-add-inline-btn" disabled={!selectedCategory}>+ Add Subcategory</button>
                                </div>
                                <CustomSelect options={subOptions} value={selectedSubcategory} onChange={handleSubcategoryChange} disabled={!selectedCategory} />
                            </div>
                            <div className="si-field">
                                <div className="si-label-row">
                                    <label className="si-label">Item Type</label>
                                    <button type="button" className="si-add-inline-btn" disabled={!selectedSubcategory}>+ Add Item Type</button>
                                </div>
                                <CustomSelect options={itemTypeOptions} value={selectedItemType} onChange={setSelectedItemType} disabled={!selectedSubcategory} />
                            </div>
                            <div className="si-field">
                                <label className="si-label">Brand</label>
                                <input type="text" className="si-input" value={brand} onChange={e => setBrand(e.target.value)} />
                            </div>
                            <div className="si-field">
                                <label className="si-label">Price ({currentCurrency ? currentCurrency.symbol : '€'})</label>
                                <input type="number" className="si-input" value={price} onChange={e => setPrice(e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    <div className="si-card">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="si-section-title m-0">Specifications</h2>
                            <button type="button" className="btn btn-primary btn-sm rounded-pill px-3 d-inline-flex align-items-center justify-content-center" onClick={handleAddSpec}>
                                <FaPlusCircle className="me-2" /> Add Detail
                            </button>
                        </div>
                        <div className="si-field-hint">
                            Add any specific details (RAM, Storage, Material, Warranty) based on your product.
                        </div>
                        {specifications.map((spec, index) => (
                            <div key={index} className="si-spec-row">
                                <input type="text" className="si-input" placeholder="Label" value={spec.key} onChange={e => handleSpecChange(index, 'key', e.target.value)} />
                                <input type="text" className="si-input" placeholder="Value" value={spec.value} onChange={e => handleSpecChange(index, 'value', e.target.value)} />
                                <button type="button" className="si-spec-remove-btn" onClick={() => handleRemoveSpec(index)}>
                                    <FaTimes />
                                </button>
                            </div>
                        ))}
                    </div>
                </form>
            </div>

            {showCropModal && (
                <ImageCropModal
                    image={tempImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspect={3 / 4}
                />
            )}
        </div>
    );
};

export default ListingEditForm;
