import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from '../../utils/axios';
import { 
    FaTimes, FaImage, FaInfoCircle, FaSave, FaPercentage, FaCheckCircle, 
    FaPlusCircle, FaEllipsisH, FaTag, FaTrash, FaChevronRight, FaAngleLeft, FaAngleRight 
} from 'react-icons/fa';
import '../../styles/EditItemModal.css';
import '../../styles/SellItem.css'; // Reuse SellItem styles for consistency
import '../../components/common/CustomSelect.css';
import { getImageUrl, getItemImageUrl, safeString } from '../../utils/constants';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import CurrencyContext from '../../context/CurrencyContext';
import CustomSelect from './CustomSelect';
import { Modal, Button, Form } from 'react-bootstrap';
import ImageCropModal from './ImageCropModal';

const MAX_PHOTOS = 20;
const VISIBLE_PHOTOS = 4;

const EditItemModal = ({ item, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const { currentCurrency, formatPrice } = useContext(CurrencyContext);
    const fileInputRef = useRef(null);

    // Form State
    const [title, setTitle] = useState(item.title || '');
    const [description, setDescription] = useState(item.description || '');
    const [brand, setBrand] = useState(item.brand || '');
    const [size, setSize] = useState(item.size || '');
    const [color, setColor] = useState(item.color || '');
    const [condition, setCondition] = useState(item.condition || 'Good');
    const [price, setPrice] = useState(item.price || '');
    const [originalPrice, setOriginalPrice] = useState(item.original_price || 0);
    const [isSwappable, setIsSwappable] = useState(item.negotiable || false);
    const [shippingIncluded, setShippingIncluded] = useState(item.shipping_included || false);
    const [specifications, setSpecifications] = useState(item.attributes || []);
    const [status, setStatus] = useState(item.status || 'active');
    const [isSold, setIsSold] = useState(item.is_sold || false);
    
    // Category State
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(item.category_id?._id || item.category_id || '');
    const [subcategories, setSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState(item.subcategory_id?._id || item.subcategory_id || '');
    const [itemTypes, setItemTypes] = useState([]);
    const [selectedItemType, setSelectedItemType] = useState(item.item_type_id?._id || item.item_type_id || '');

    // Image State
    // We combine existing images (strings) and new images (objects with url/file)
    const [images, setImages] = useState(item.images || []);
    const [showAllPhotos, setShowAllPhotos] = useState(false);
    const [detectedColorName, setDetectedColorName] = useState('');

    // Misc State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountLoading, setDiscountLoading] = useState(false);
    const [commissionRate, setCommissionRate] = useState(0);
    
    // Crop State
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [pendingPhotos, setPendingPhotos] = useState([]);

    // Sync state when item changes (after an update)
    useEffect(() => {
        if (item) {
            setTitle(item.title || '');
            setDescription(item.description || '');
            setBrand(item.brand || '');
            setSize(item.size || '');
            setColor(item.color || '');
            setCondition(item.condition || 'Good');
            setPrice(item.price || '');
            setOriginalPrice(item.original_price || 0);
            setIsSwappable(item.negotiable || false);
            setShippingIncluded(item.shipping_included || false);
            setSpecifications(item.attributes || []);
            setImages(item.images || []);
            setStatus(item.status || 'active');
            setIsSold(item.is_sold || false);
            
            // Re-fetch subcategories if category changed
            const catId = item.category_id?._id || item.category_id;
            if (catId && categories.length > 0) {
                const category = categories.find(c => c._id === catId);
                if (category) {
                    setSubcategories(category.subcategories || []);
                    const subcatId = item.subcategory_id?._id || item.subcategory_id;
                    const subcat = category.subcategories.find(s => s._id === subcatId);
                    if (subcat) setItemTypes(subcat.items || []);
                }
            }
        }
    }, [item, categories]);

    const handleDiscountPriceChange = (val) => {
        setDiscountPrice(val);
        if (val && price > 0) {
            const pct = Math.round(((price - Number(val)) / price) * 100);
            setDiscountPercent(pct > 0 ? pct : '');
        } else {
            setDiscountPercent('');
        }
    };

    const handleDiscountPercentChange = (val) => {
        setDiscountPercent(val);
        if (val && price > 0) {
            const calculatedPrice = (price * (1 - Number(val) / 100)).toFixed(2);
            setDiscountPrice(calculatedPrice);
        } else {
            setDiscountPrice('');
        }
    };

    // Fetch Categories and Settings
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, settingsRes] = await Promise.all([
                    axios.get('/api/categories/full'),
                    axios.get('/api/settings')
                ]);
                setCategories(catRes.data);
                if (settingsRes.data?.admin_commission) {
                    setCommissionRate(settingsRes.data.admin_commission);
                }

                // Initialize subcategories/itemtypes based on item data
                const category = catRes.data.find(c => c._id === (item.category_id?._id || item.category_id));
                if (category) {
                    setSubcategories(category.subcategories || []);
                    const subcat = category.subcategories.find(s => s._id === (item.subcategory_id?._id || item.subcategory_id));
                    if (subcat) {
                        setItemTypes(subcat.items || []);
                    }
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };
        fetchData();
    }, [item]);

    // Handle Category Changes
    const handleCategoryChange = (val) => {
        setSelectedCategory(val);
        const category = categories.find(c => c._id === val);
        setSubcategories(category ? category.subcategories : []);
        setSelectedSubcategory('');
        setItemTypes([]);
        setSelectedItemType('');
    };

    const handleSubcategoryChange = (val) => {
        setSelectedSubcategory(val);
        const subcategory = subcategories.find(s => s._id === val);
        setItemTypes(subcategory ? subcategory.items : []);
        setSelectedItemType('');
    };

    // Photos Handling
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
            isNew: true
        };

        setImages(prev => {
            const updated = [...prev, newPhoto].slice(0, MAX_PHOTOS);
            if (updated.length === 1) extractColor(file);
            return updated;
        });

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

    const removePhoto = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const makeCover = (index) => {
        setImages(prev => {
            const arr = [...prev];
            const [item] = arr.splice(index, 1);
            return [item, ...arr];
        });
    };

    const movePhoto = (index, direction) => {
        setImages(prev => {
            const arr = [...prev];
            const newPos = index + direction;
            if (newPos < 0 || newPos >= arr.length) return prev;
            [arr[index], arr[newPos]] = [arr[newPos], arr[index]];
            return arr;
        });
    };

    const extractColor = (file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            try {
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const colorsDef = [
                    { name: 'Black', rgb: [20, 20, 20] }, { name: 'White', rgb: [250, 250, 250] },
                    { name: 'Grey', rgb: [128, 128, 128] }, { name: 'Cream', rgb: [255, 253, 208] },
                    { name: 'Beige', rgb: [245, 245, 220] }, { name: 'Red', rgb: [220, 30, 30] },
                    { name: 'Blue', rgb: [30, 30, 220] }, { name: 'Green', rgb: [30, 150, 30] },
                    { name: 'Yellow', rgb: [255, 220, 0] }, { name: 'Purple', rgb: [128, 0, 128] },
                    { name: 'Pink', rgb: [255, 180, 200] }, { name: 'Orange', rgb: [255, 140, 0] },
                    { name: 'Brown', rgb: [139, 69, 19] }, { name: 'Silver', rgb: [192, 192, 192] },
                    { name: 'Gold', rgb: [218, 165, 32] }
                ];
                const colorCounts = {}; colorsDef.forEach(c => colorCounts[c.name] = 0);
                for (let i = 0; i < data.length; i += 100) {
                    let r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                    if (a < 128) continue;
                    let minDiff = Infinity, bestColor = '';
                    colorsDef.forEach(c => {
                        let diff = Math.sqrt(Math.pow(c.rgb[0]-r,2)+Math.pow(c.rgb[1]-g,2)+Math.pow(c.rgb[2]-b,2));
                        if(diff < minDiff) { minDiff = diff; bestColor = c.name; }
                    });
                    if (bestColor) colorCounts[bestColor]++;
                }
                colorCounts['White'] = Math.floor(colorCounts['White'] * 0.05);
                colorCounts['Grey'] = Math.floor(colorCounts['Grey'] * 0.15);
                let maxCount = 0, finalColor = '';
                for (let cName in colorCounts) { if (colorCounts[cName] > maxCount) { maxCount = colorCounts[cName]; finalColor = cName; } }
                if (finalColor) { setColor(finalColor); setDetectedColorName(finalColor); }
            } catch (e) { console.warn('Color extraction failed', e); }
        };
    };

    // Specifications
    const handleAddSpec = () => setSpecifications([...specifications, { key: '', value: '' }]);
    const handleSpecChange = (index, field, val) => {
        const newSpecs = [...specifications];
        newSpecs[index][field] = val;
        setSpecifications(newSpecs);
    };
    const handleRemoveSpec = (index) => setSpecifications(specifications.filter((_, i) => i !== index));

    // Submit Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

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
        formData.append('negotiable', isSwappable);
        formData.append('shipping_included', shippingIncluded);
        formData.append('status', status);
        formData.append('is_sold', isSold);
        formData.append('attributes', JSON.stringify(specifications.filter(s => s.key && s.value)));

        // Handle existing vs new images
        const existingPaths = images.filter(img => typeof img === 'string');
        formData.append('existingImages', JSON.stringify(existingPaths));

        images.filter(img => typeof img !== 'string').forEach(photo => {
            formData.append('images', photo.file);
        });

        try {
            const res = await axios.put(`/api/items/${item._id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpdate(res.data);
            setSuccess('Item updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update item');
        } finally {
            setLoading(false);
        }
    };

    // Discount Actions
    const handleApplyDiscount = async () => {
        if (!discountPrice || isNaN(discountPrice) || Number(discountPrice) <= 0) return setError('Invalid price');
        const base = originalPrice > 0 ? originalPrice : price;
        if (Number(discountPrice) >= base) return setError(`Must be lower than ${base}`);

        setDiscountLoading(true);
        try {
            const res = await axios.put(`/api/items/${item._id}/discount`, { discounted_price: discountPrice });
            onUpdate(res.data);
            setPrice(res.data.price);
            setOriginalPrice(res.data.original_price);
            setDiscountPrice('');
            setSuccess('Price drop applied! Likers notified.');
        } catch (err) { setError('Failed to apply discount'); }
        finally { setDiscountLoading(false); }
    };

    const handleRemoveDiscount = async () => {
        setDiscountLoading(true);
        try {
            const res = await axios.delete(`/api/items/${item._id}/discount`);
            onUpdate(res.data);
            setPrice(res.data.price);
            setOriginalPrice(res.data.original_price);
            setSuccess('Discount removed.');
        } catch (err) { setError('Failed to remove discount'); }
        finally { setDiscountLoading(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
        
        setLoading(true);
        try {
            await axios.delete(`/api/items/${item._id}`);
            onClose();
            // Refresh parent (Profile)
            window.location.reload(); 
        } catch (err) {
            setError('Failed to delete item');
            setLoading(false);
        }
    };

    const formatOptions = (list) => list.map(it => ({ value: it._id, label: safeString(it.name) }));
    const hasDiscount = originalPrice > 0 && originalPrice > price;
    const percentOff = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    return (
        <div className="eim-overlay">
            <div className="eim-content premium-popup animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="eim-header d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="eim-icon-box">
                            <FaTag className="text-primary" />
                        </div>
                        <div>
                            <h3 className="m-0 h5 fw-bold text-dark">Edit Your Listing</h3>
                            <p className="mb-0 text-muted extra-small">Refine details and boost visibility</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="eim-close-btn" aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                <div className="eim-body p-0">
                    {error && <div className="eim-alert error m-4 mb-0"><FaInfoCircle /> {error}</div>}
                    {success && <div className="eim-alert success m-4 mb-0"><FaCheckCircle /> {success}</div>}

                    <form onSubmit={handleSubmit} className="eim-form-scroll p-4">
                        {/* Photos Section */}
                        <div className="eim-form-card mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="eim-form-subtitle mb-0">Photos</h4>
                                <span className="text-muted extra-small">Up to 20 photos</span>
                            </div>

                            <div className="si-photos-area">
                                <div className="si-photos-row">
                                    {images.length < MAX_PHOTOS && (
                                        <label className="si-photo-add-btn">
                                            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} hidden />
                                            <FaPlusCircle className="si-add-icon" />
                                            <span>Add</span>
                                        </label>
                                    )}
                                    {images.map((img, index) => (
                                        <div key={index} className={`si-photo-item ${index === 0 ? 'is-cover' : ''}`}>
                                            <img 
                                                src={typeof img === 'string' ? getItemImageUrl(img) : img.url} 
                                                alt="" 
                                                className="si-photo-img" 
                                            />
                                            <div className="si-photo-actions">
                                                <button type="button" className="si-photo-action" onClick={() => removePhoto(index)} title="Remove"><FaTrash /></button>
                                                {index > 0 && (
                                                    <button type="button" className="si-photo-action" onClick={() => makeCover(index)} title="Make Cover"><FaCheckCircle /></button>
                                                )}
                                                <div className="si-photo-nav">
                                                    <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0}><FaAngleLeft /></button>
                                                    <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === images.length - 1}><FaAngleRight /></button>
                                                </div>
                                            </div>
                                            {index === 0 && <span className="si-photo-badge">COVER</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="eim-form-card mb-4">
                            <h4 className="eim-form-subtitle mb-3">Item Info</h4>
                            <div className="si-field">
                                <label className="si-label">Item Title</label>
                                <input type="text" className="si-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Nike Air Max 90" required />
                            </div>
                            <div className="si-field mt-3">
                                <label className="si-label">Description</label>
                                <textarea className="si-textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the item condition, fit, etc." required />
                            </div>
                        </div>

                        {/* Category & Details */}
                        <div className="eim-form-card mb-4">
                            <h4 className="eim-form-subtitle mb-3">Specifications</h4>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="si-label mb-1">Category</label>
                                    <CustomSelect options={formatOptions(categories)} value={selectedCategory} onChange={handleCategoryChange} searchable={true} />
                                </div>
                                 <div className="col-md-6">
                                    <label className="si-label mb-1">Subcategory</label>
                                    <CustomSelect options={formatOptions(subcategories)} value={selectedSubcategory} onChange={handleSubcategoryChange} disabled={!selectedCategory} searchable={true} />
                                </div>
                                <div className="col-md-6">
                                    <label className="si-label mb-1">Item Type</label>
                                    <CustomSelect options={formatOptions(itemTypes)} value={selectedItemType} onChange={setSelectedItemType} disabled={!selectedSubcategory} searchable={true} />
                                </div>
                                <div className="col-md-6">
                                    <label className="si-label">Brand</label>
                                    <CustomSelect 
                                        placeholder="Select or Search Brand"
                                        options={[
                                            { value: 'Nike', label: 'Nike' }, { value: 'Adidas', label: 'Adidas' },
                                            { value: 'Zara', label: 'Zara' }, { value: 'Gucci', label: 'Gucci' }
                                        ]} 
                                        value={brand} 
                                        onChange={setBrand} 
                                        searchable={true} 
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="si-label">Size</label>
                                    <CustomSelect 
                                        placeholder="Size"
                                        options={[
                                            { value: 'XS', label: 'XS' }, { value: 'S', label: 'S' },
                                            { value: 'M', label: 'M' }, { value: 'L', label: 'L' },
                                            { value: 'XL', label: 'XL' }
                                        ]} 
                                        value={size} 
                                        onChange={setSize} 
                                        searchable={true} 
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="si-label">Color</label>
                                    <CustomSelect 
                                        options={[
                                            { value: 'Black', label: 'Black' }, { value: 'White', label: 'White' },
                                            { value: 'Grey', label: 'Grey' }, { value: 'Red', label: 'Red' },
                                            { value: 'Blue', label: 'Blue' }, { value: 'Green', label: 'Green' },
                                            { value: 'Multi', label: 'Multi' }
                                        ]} 
                                        value={color} 
                                        onChange={setColor} 
                                        searchable={true}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="si-label">Condition</label>
                                    <CustomSelect 
                                        options={['New', 'Very Good', 'Good', 'Normal', 'Bad'].map(c => ({ value: c, label: c }))} 
                                        value={condition} 
                                        onChange={setCondition} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing & Toggles */}
                        <div className="eim-form-card mb-4">
                            <h4 className="eim-form-subtitle mb-3">Pricing & Shipping</h4>
                            <div className="si-field mb-4" style={{ maxWidth: '200px' }}>
                                <label className="si-label">Base Price</label>
                                <div className="si-price-input">
                                    <span className="si-currency">{currentCurrency?.symbol || '$'}</span>
                                    <input type="number" className="si-input si-input-price" value={price} onChange={e => setPrice(e.target.value)} required />
                                </div>
                            </div>

                            <div className="si-swap-row">
                                <div><h4 className="si-swap-title">Open to offers</h4><p className="si-swap-hint small">Allow negotiations.</p></div>
                                <label className="si-toggle"><input type="checkbox" checked={isSwappable} onChange={e => setIsSwappable(e.target.checked)} /><span className="si-toggle-slider" /></label>
                            </div>
                            <div className="si-swap-row mt-3 border-top pt-3">
                                <div><h4 className="si-swap-title">Shipping Included</h4><p className="si-swap-hint small">Price covers shipping.</p></div>
                                <label className="si-toggle"><input type="checkbox" checked={shippingIncluded} onChange={e => setShippingIncluded(e.target.checked)} /><span className="si-toggle-slider" /></label>
                            </div>

                            <div className="si-swap-row mt-3 border-top pt-3">
                                <div>
                                    <h4 className="si-swap-title">Mark as Sold</h4>
                                    <p className="si-swap-hint small">Hides the item from search while keeping it in your collection.</p>
                                </div>
                                <label className="si-toggle">
                                    <input type="checkbox" checked={isSold} onChange={e => setIsSold(e.target.checked)} />
                                    <span className="si-toggle-slider" />
                                </label>
                            </div>

                            <div className="si-swap-row mt-3 border-top pt-3">
                                <div>
                                    <h4 className="si-swap-title">Visibility</h4>
                                    <p className="si-swap-hint small">Set your item to Active or Inactive.</p>
                                </div>
                                <div className="d-flex gap-2">
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm rounded-pill px-3 ${status === 'active' ? 'btn-success' : 'btn-outline-secondary'}`}
                                        onClick={() => setStatus('active')}
                                    >
                                        Active
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm rounded-pill px-3 ${status === 'inactive' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        onClick={() => setStatus('inactive')}
                                    >
                                        Inactive
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Specifications */}
                        <div className="eim-form-card mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="eim-form-subtitle mb-0">Custom Attributes</h4>
                                <button type="button" className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={handleAddSpec}><FaPlusCircle className="me-1" /> Add Detail</button>
                            </div>
                            {specifications.length > 0 ? specifications.map((spec, index) => (
                                <div key={index} className="si-spec-row mb-2">
                                    <input type="text" className="si-input" placeholder="Property (e.g. Material)" value={spec.key} onChange={e => handleSpecChange(index, 'key', e.target.value)} />
                                    <input type="text" className="si-input" placeholder="Value (e.g. 100% Leather)" value={spec.value} onChange={e => handleSpecChange(index, 'value', e.target.value)} />
                                    <button type="button" className="si-spec-remove-btn" onClick={() => handleRemoveSpec(index)}><FaTrash /></button>
                                </div>
                            )) : (
                                <div className="text-center py-3 text-muted small">No custom attributes added yet.</div>
                            )}
                        </div>

                        {/* Discount / Price Drop Section */}
                        <div className="eim-discount-card-v2 p-4 rounded-4 mt-4">
                            <h4 className="eim-discount-title mb-2 text-primary">
                                <FaPercentage className="discount-icon-v2" /> Boost Your Sales
                            </h4>
                            <p className="eim-discount-subtitle">
                                Set a percentage discount to grab buyers' attention. Likers will be notified!
                            </p>

                             {hasDiscount ? (
                                <div className="eim-active-discount p-3 d-flex justify-content-between align-items-center">
                                    <div>
                                        <span className="text-danger fw-bold h5 m-0">-{percentOff}% OFF</span>
                                        <span className="text-muted small ms-2 text-decoration-line-through">{formatPrice(originalPrice)}</span>
                                        <FaChevronRight className="mx-2 text-muted" size={10} />
                                        <span className="fw-bold text-dark">{formatPrice(price)}</span>
                                    </div>
                                    <button type="button" className="btn btn-sm btn-outline-danger fw-bold rounded-pill px-3" onClick={handleRemoveDiscount}>Remove Promo</button>
                                </div>
                            ) : (
                                <div className="mt-3">
                                    <div className="d-flex align-items-end gap-3 mb-3">
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                                                <label className="extra-small fw-bold text-muted text-uppercase m-0">Discount %</label>
                                                <span className="extra-small text-primary fw-bold">Price: {formatPrice(price)}</span>
                                            </div>
                                            <div className="input-group input-group-lg shadow-sm eim-input-group-premium">
                                                <input 
                                                    type="number" 
                                                    className="form-control eim-discount-input text-center fw-bold border-0" 
                                                    placeholder="10" 
                                                    min="1"
                                                    max="99"
                                                    value={discountPercent} 
                                                    onChange={e => handleDiscountPercentChange(e.target.value)} 
                                                    style={{ height: '56px', fontSize: '1.25rem' }}
                                                />
                                                <span className="input-group-text bg-white border-0 text-muted fw-bold px-3" style={{ fontSize: '1.1rem' }}>%</span>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn btn-apply-discount py-2 px-5 shadow-sm" 
                                            onClick={handleApplyDiscount} 
                                            disabled={discountLoading || !discountPercent}
                                            style={{ height: '56px', whiteSpace: 'nowrap' }}
                                        >
                                            {discountLoading ? '...' : (
                                                <div className="d-flex align-items-center gap-2">
                                                    <FaTag /> Apply
                                                </div>
                                            )}
                                        </button>
                                    </div>

                                    {discountPercent > 0 && Number(discountPrice) < price && (
                                        <div className="eim-discount-preview animate-zoom-in p-3 rounded-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="text-primary fw-bold small">Preview:</span>
                                                <span className="badge-off" style={{ background: '#0ea5e9' }}>-{discountPercent}% OFF</span>
                                            </div>
                                            <div className="d-flex align-items-baseline gap-2">
                                                <span className="text-muted text-decoration-line-through small">{formatPrice(price)}</span>
                                                <FaChevronRight size={10} className="text-muted" />
                                                <span className="h4 m-0 fw-bold text-dark">{formatPrice(discountPrice)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="eim-discount-hint d-flex align-items-center gap-2 mt-3 text-muted small">
                                <FaInfoCircle className="text-warning" />
                                <span>Buyers who liked this item will get a price-drop notification!</span>
                            </div>
                        </div>

                        <div className="eim-footer-actions mt-5 pt-4 border-top d-flex gap-3 justify-content-between align-items-center">
                            <button 
                                type="button" 
                                onClick={handleDelete} 
                                className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 border-0 fw-bold"
                            >
                                <FaTrash /> Delete Listing
                            </button>
                            <div className="d-flex gap-3">
                                <button type="button" onClick={onClose} className="btn-cancel-premium">Cancel</button>
                                <button type="submit" className="btn-save-premium" disabled={loading}>
                                    {loading ? 'Saving Changes...' : 'Save & Publish'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Removed Add Custom Entry Modal as per request */}
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

export default EditItemModal;
