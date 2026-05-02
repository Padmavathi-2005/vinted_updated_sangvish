import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { FaImage, FaTimes, FaInfoCircle, FaEllipsisH, FaPlusCircle } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import CurrencyContext from '../context/CurrencyContext';
import CustomSelect from '../components/common/CustomSelect';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Form } from 'react-bootstrap';
import { safeString } from '../utils/constants';
import Meta from '../components/common/Meta';
import '../styles/SellItem.css';
import '../components/common/CustomSelect.css';
import ImageCropModal from '../components/common/ImageCropModal';

const MAX_PHOTOS = 20;
const VISIBLE_PHOTOS = 3;

const SellItem = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading, setMode } = useContext(AuthContext);
    const { currentCurrency, defaultCurrency, formatPrice } = useContext(CurrencyContext);
    const { t } = useTranslation();
    const fileInputRef = useRef(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [brand, setBrand] = useState('');
    const [size, setSize] = useState('');
    const [color, setColor] = useState('');
    const [condition, setCondition] = useState('');
    const [price, setPrice] = useState('');
    const [commissionRate, setCommissionRate] = useState(0);
    const [isSwappable, setIsSwappable] = useState(false);
    const [shippingIncluded, setShippingIncluded] = useState(false);

    // Category Management
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [itemTypes, setItemTypes] = useState([]);
    const [selectedItemType, setSelectedItemType] = useState('');

    const [photos, setPhotos] = useState([]);
    const [showAllPhotos, setShowAllPhotos] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detectedColorName, setDetectedColorName] = useState('');

    // Custom Add Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addModalType, setAddModalType] = useState(''); // 'category', 'subcategory', 'itemtype'
    const [addModalValue, setAddModalValue] = useState('');
    
    // Crop Modal State
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [pendingPhotos, setPendingPhotos] = useState([]);

    const openAddModal = (type) => {
        setAddModalType(type);
        setAddModalValue('');
        setShowAddModal(true);
    };

    const handleAddModalSubmit = async () => {
        if (!addModalValue) return;
        try {
            if (addModalType === 'category') {
                const res = await axios.post('/api/categories', { name: addModalValue });
                setCategories([...categories, res.data]);
                setSelectedCategory(res.data._id);
            } else if (addModalType === 'subcategory') {
                const res = await axios.post('/api/categories/subcategories', { name: addModalValue, category_id: selectedCategory });
                setSubcategories([...subcategories, res.data]);
                setSelectedSubcategory(res.data._id);
            } else if (addModalType === 'itemtype') {
                const res = await axios.post('/api/categories/itemtypes', { name: addModalValue, subcategory_id: selectedSubcategory, category_id: selectedCategory });
                setItemTypes([...itemTypes, res.data]);
                setSelectedItemType(res.data._id);
            }
            setShowAddModal(false);
        } catch (err) {
            alert('Failed to create item');
        }
    };

    // Dynamic Specifications
    const [specifications, setSpecifications] = useState([]);

    const handleAddSpec = () => setSpecifications([...specifications, { key: '', value: '' }]);
    const handleSpecChange = (index, field, val) => {
        const newSpecs = [...specifications];
        newSpecs[index][field] = val;
        setSpecifications(newSpecs);
    };
    const handleRemoveSpec = (index) => setSpecifications(specifications.filter((_, i) => i !== index));

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/categories/full');
                setCategories(res.data);

                const settingsRes = await axios.get('/api/settings');
                if (settingsRes.data && settingsRes.data.admin_commission) {
                    setCommissionRate(settingsRes.data.admin_commission);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };
        fetchCategories();
    }, []);

    // Handle Category Selection
    const handleCategoryChange = (val) => {
        setSelectedCategory(val);
        const category = categories.find(c => c._id === val);
        setSubcategories(category ? category.subcategories : []);
        setSelectedSubcategory('');
        setItemTypes([]);
        setSelectedItemType('');
    };

    // Handle Subcategory Selection
    const handleSubcategoryChange = (val) => {
        setSelectedSubcategory(val);
        const subcategory = subcategories.find(s => s._id === val);
        setItemTypes(subcategory ? subcategory.items : []);
        setSelectedItemType('');
    };

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
    }, [user, authLoading, navigate]);

    if (authLoading || !user) return null;

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const readers = files.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const img = new Image();
                    img.src = reader.result;
                    img.onload = () => {
                        if (img.width < 500 || img.height < 500) {
                            reject(new Error(`"${file.name}" is too small. Minimum size required is 500x500px. Your image is ${img.width}x${img.height}px.`));
                        } else {
                            resolve({ readerResult: reader.result, file });
                        }
                    };
                };
            });
        });

        Promise.all(readers).then(results => {
            setPendingPhotos(results);
            setTempImage(results[0].readerResult);
            setShowCropModal(true);
        }).catch(err => {
            alert(err.message);
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
            name: file.name,
        };

        setPhotos(prev => {
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

    const extractColor = (file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
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

                const colorCounts = {};
                colorsDef.forEach(c => colorCounts[c.name] = 0);

                // Sample every 25th pixel (steps of 100 in flat RGBA array)
                for (let i = 0; i < data.length; i += 100) {
                    let r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                    if (a < 128) continue; // Skip transparent pixels

                    let minDiff = Infinity;
                    let bestColor = '';
                    colorsDef.forEach(c => {
                        let diff = Math.sqrt(Math.pow(c.rgb[0] - r, 2) + Math.pow(c.rgb[1] - g, 2) + Math.pow(c.rgb[2] - b, 2));
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestColor = c.name;
                        }
                    });

                    if (bestColor) {
                        colorCounts[bestColor]++;
                    }
                }

                // Penalize common background colors extensively so the "subject" wins
                colorCounts['White'] = Math.floor(colorCounts['White'] * 0.05);
                colorCounts['Grey'] = Math.floor(colorCounts['Grey'] * 0.15);
                colorCounts['Silver'] = Math.floor(colorCounts['Silver'] * 0.15);
                colorCounts['Cream'] = Math.floor(colorCounts['Cream'] * 0.3);

                let maxCount = 0;
                let finalColor = '';
                for (let cName in colorCounts) {
                    if (colorCounts[cName] > maxCount) {
                        maxCount = colorCounts[cName];
                        finalColor = cName;
                    }
                }

                if (finalColor) {
                    setColor(finalColor);
                    setDetectedColorName(finalColor);
                }
            } catch (e) { console.warn('Color extraction failed', e); }
        };
    };

    const removePhoto = (index) => {
        setPhotos(prev => {
            const newPhotos = prev.filter((_, i) => i !== index);
            if (newPhotos.length === 0) setDetectedColorName('');
            return newPhotos;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const isItemTypeRequired = itemTypes && itemTypes.length > 0;
        if (!selectedCategory || !selectedSubcategory || (isItemTypeRequired && !selectedItemType)) {
            alert(isItemTypeRequired ? 'Please select a category, subcategory, and item type.' : 'Please select a category and subcategory.');
            return;
        }

        if (!title.trim()) return alert('Please enter an item title.');
        if (!description.trim()) return alert('Please enter an item description.');
        if (!condition) return alert('Please select the item condition.');
        if (!color) return alert('Please select the item color.');
        if (!price || parseFloat(price) <= 0) return alert('Please enter a valid price.');
        
        if (photos.length === 0) {
            alert('Please upload at least one photo for the item.');
            return;
        }

        setLoading(true);

        const formData = new FormData();
        // 1. All text/ID fields first (Multer parses these more reliably before images)
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('category_id', selectedCategory);
        formData.append('subcategory_id', selectedSubcategory);
        if (selectedItemType) formData.append('item_type_id', selectedItemType);
        formData.append('brand', (brand || '').trim());
        formData.append('size', (size || '').trim());
        formData.append('color', (color || '').trim());
        formData.append('condition', (condition || '').trim());
        formData.append('price', price);
        formData.append('currency_id', currentCurrency?._id || defaultCurrency?._id || '');
        formData.append('status', 'active');
        
        // Backend controller explicitly checks for strict string 'true' 
        formData.append('negotiable', isSwappable ? 'true' : 'false');
        formData.append('shipping_included', shippingIncluded ? 'true' : 'false');
        formData.append('attributes', JSON.stringify(specifications.filter(s => s.key && s.value)));

        // 2. Images last
        photos.forEach((photo) => {
            formData.append('images', photo.file);
        });

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const res = await axios.post('/api/items', formData, config);
            setLoading(false);
            
            // Show success confirmation
            alert('Item successfully listed!');

            // Switch to seller mode and redirect to manage listings with full page refresh
            window.location.href = '/profile?tab=listings&mode=seller&refresh=' + Date.now();
        } catch (error) {
            console.error('Error creating item:', error.response?.data || error);
            setLoading(false);
            alert('Error creating item. ' + (error.response?.data?.message || 'Please check console.'));
        }
    };

    const displayedPhotos = showAllPhotos ? photos : photos.slice(0, VISIBLE_PHOTOS);
    const hiddenCount = photos.length - VISIBLE_PHOTOS;

    const formatOptions = (items) => (items || []).map(item => ({ value: item._id, label: safeString(item.name) }));

    return (
        <div className="si-page">
            <Meta title="Sell an Item" description="List your pre-loved fashion items for sale on our community marketplace." />
            <div className="si-breadcrumb">
                <Link to="/">{t('sell_item.home')}</Link>
                <span className="si-breadcrumb-sep">›</span>
                <span>{t('sell_item.sell_an_item')}</span>
            </div>

            <div className="si-container">
                <div className="si-header">
                    <h1 className="si-title">{t('sell_item.title')}</h1>
                    <p className="si-subtitle">{t('sell_item.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Photos Section */}
                    <div className="si-card">
                        <div className="si-card-header">
                            <h2 className="si-section-title">{t('sell_item.photos')}</h2>
                            <span className="si-section-hint">{t('sell_item.up_to_photos', { max: MAX_PHOTOS })}</span>
                        </div>

                        {photos.length === 0 ? (
                            <label className="si-upload-box si-upload-box-full">
                                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoUpload} hidden />
                                <FaImage className="si-upload-icon" />
                                <span className="si-upload-label">{t('sell_item.upload_photos')}</span>
                                <span className="si-upload-hint">{t('sell_item.drag_drop')}</span>
                            </label>
                        ) : (
                            <div className="si-photos-area">
                                <div className="si-photos-row">
                                    {photos.length < MAX_PHOTOS && (
                                        <label className="si-photo-add-btn" title={t('sell_item.add')}>
                                            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} hidden />
                                            <FaImage className="si-add-icon" />
                                            <span>{t('sell_item.add')}</span>
                                        </label>
                                    )}
                                    {displayedPhotos.map((photo, index) => (
                                        <div key={index} className="si-photo-item">
                                            <img src={photo.url} alt={`Photo ${index + 1}`} className="si-photo-img" />
                                            <button type="button" className="si-photo-remove" onClick={() => removePhoto(index)}><FaTimes /></button>
                                            {index === 0 && <span className="si-photo-badge">{t('sell_item.cover')}</span>}
                                        </div>
                                    ))}
                                    {!showAllPhotos && hiddenCount > 0 && (
                                        <button type="button" className="si-photo-more" onClick={() => setShowAllPhotos(true)}>
                                            <FaEllipsisH /><span>{t('sell_item.more_photos', { count: hiddenCount })}</span>
                                        </button>
                                    )}
                                    {showAllPhotos && photos.length > VISIBLE_PHOTOS && (
                                        <button type="button" className="si-photo-more" onClick={() => setShowAllPhotos(false)}><span>{t('sell_item.show_less')}</span></button>
                                    )}
                                </div>
                                <p className="si-photos-count">{t('sell_item.photos_added', { count: photos.length, max: MAX_PHOTOS })}</p>
                            </div>
                        )}
                        <p className="si-photo-tip"><FaInfoCircle /> {t('sell_item.photo_tip')}</p>

                        {detectedColorName && (
                            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaInfoCircle />
                                <span>We analyzed your photo and automatically selected <strong>{detectedColorName}</strong> as the default color!</span>
                            </div>
                        )}
                    </div>

                    {/* Title & Description */}
                    <div className="si-card">
                        <div className="si-field">
                            <label className="si-label">{t('sell_item.item_title')}</label>
                            <input type="text" className="si-input" placeholder={t('sell_item.title_placeholder')} value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div className="si-field si-field-last">
                            <label className="si-label">{t('sell_item.item_description')}</label>
                            <textarea className="si-textarea" rows={5} placeholder={t('sell_item.desc_placeholder')} value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="si-card">
                        <h2 className="si-section-title si-section-title-mb">{t('sell_item.item_details')}</h2>
                        <div className="si-grid-2">
                            {/* Category */}
                            <div className="si-field">
                                <div className="si-label-row d-flex justify-content-between">
                                    <label className="si-label">{t('sell_item.category')}</label>
                                    {user?.role === 'admin' && (
                                        <button type="button" className="btn btn-outline-primary btn-sm py-0 px-2" onClick={() => openAddModal('category')}>
                                            {t('sell_item.add_category', '+ Add Category')}
                                        </button>
                                    )}
                                </div>
                                <CustomSelect
                                    placeholder={t('sell_item.select_category')}
                                    options={formatOptions(categories)}
                                    value={selectedCategory}
                                    onChange={handleCategoryChange}
                                />
                            </div>

                            {/* Subcategory */}
                            <div className="si-field">
                                <div className="si-label-row d-flex justify-content-between">
                                    <label className="si-label">{t('sell_item.subcategory')}</label>
                                    <button type="button" className="btn btn-outline-primary btn-sm py-0 px-2" disabled={!selectedCategory} onClick={() => openAddModal('subcategory')}>
                                        {t('sell_item.add_subcategory', '+ Add Subcategory')}
                                    </button>
                                </div>
                                <CustomSelect
                                    placeholder={t('sell_item.select_subcategory')}
                                    options={formatOptions(subcategories)}
                                    value={selectedSubcategory}
                                    onChange={handleSubcategoryChange}
                                    disabled={!selectedCategory}
                                />
                            </div>

                            {/* Item Type (Sub-subcategory) */}
                            <div className="si-field">
                                <div className="si-label-row d-flex justify-content-between">
                                    <label className="si-label">{t('sell_item.item_type')}</label>
                                    <button type="button" className="btn btn-outline-primary btn-sm py-0 px-2" disabled={!selectedSubcategory} onClick={() => openAddModal('itemtype')}>
                                        {t('sell_item.add_item_type', '+ Add Item Type')}
                                    </button>
                                </div>
                                <CustomSelect
                                    placeholder={t('sell_item.select_item_type')}
                                    options={formatOptions(itemTypes)}
                                    value={selectedItemType}
                                    onChange={setSelectedItemType}
                                    disabled={!selectedSubcategory}
                                />
                            </div>

                            <div className="si-field">
                                <label className="si-label">{t('sell_item.brand')} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span></label>
                                <input type="text" className="si-input" placeholder={t('sell_item.brand_placeholder')} value={brand} onChange={e => setBrand(e.target.value)} />
                            </div>

                            <div className="si-field">
                                <label className="si-label">{t('sell_item.size')} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span></label>
                                <CustomSelect
                                    placeholder={t('sell_item.select_size')}
                                    options={[
                                        { value: 'XS', label: 'XS' },
                                        { value: 'S', label: 'S' },
                                        { value: 'M', label: 'M' },
                                        { value: 'L', label: 'L' },
                                        { value: 'XL', label: 'XL' },
                                        { value: 'XXL', label: 'XXL' },
                                    ]}
                                    value={size}
                                    onChange={setSize}
                                />
                            </div>

                            <div className="si-field">
                                <label className="si-label">{t('sell_item.color')}</label>
                                <CustomSelect
                                    placeholder={t('sell_item.select_color')}
                                    options={[
                                        { value: 'Black', label: 'Black' },
                                        { value: 'White', label: 'White' },
                                        { value: 'Grey', label: 'Grey' },
                                        { value: 'Cream', label: 'Cream' },
                                        { value: 'Beige', label: 'Beige' },
                                        { value: 'Red', label: 'Red' },
                                        { value: 'Blue', label: 'Blue' },
                                        { value: 'Green', label: 'Green' },
                                        { value: 'Yellow', label: 'Yellow' },
                                        { value: 'Purple', label: 'Purple' },
                                        { value: 'Pink', label: 'Pink' },
                                        { value: 'Orange', label: 'Orange' },
                                        { value: 'Brown', label: 'Brown' },
                                        { value: 'Silver', label: 'Silver' },
                                        { value: 'Gold', label: 'Gold' },
                                        { value: 'Multi', label: 'Multi-colored' },
                                    ]}
                                    value={color}
                                    onChange={setColor}
                                    searchable={true}
                                />
                            </div>

                            <div className="si-field">
                                <label className="si-label">{t('sell_item.condition')}</label>
                                <CustomSelect
                                    placeholder={t('sell_item.select_condition')}
                                    options={[
                                        { value: 'New', label: 'New' },
                                        { value: 'Very Good', label: 'Very Good' },
                                        { value: 'Good', label: 'Good' },
                                        { value: 'Normal', label: 'Normal' },
                                        { value: 'Bad', label: 'Bad' },
                                        { value: 'Very Bad', label: 'Very Bad' },
                                    ]}
                                    value={condition}
                                    onChange={setCondition}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="si-card">
                        <h2 className="si-section-title si-section-title-mb">{t('sell_item.pricing')}</h2>
                        <div className="si-field" style={{ maxWidth: '240px' }}>
                            <label className="si-label">{t('sell_item.price_label', { currency: currentCurrency ? currentCurrency.symbol : '€' })}</label>
                            <div className="si-price-input">
                                <span className="si-currency">{currentCurrency ? currentCurrency.symbol : '€'}</span>
                                <input type="number" className="si-input si-input-price" placeholder="0.00" min="1" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
                            </div>
                            {commissionRate > 0 && (
                                <div className="si-commission-info">
                                    <p className="si-commission-note">{t('sell_item.commission_note')}</p>
                                    {price > 0 && (
                                        <p className="si-commission-val">
                                            {t('sell_item.admin_commission', { rate: commissionRate })} <span className="si-commission-amount">{formatPrice((parseFloat(price) * commissionRate) / 100)}</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="si-swap-row">
                            <div>
                                <h4 className="si-swap-title">{t('sell_item.negotiable_title')}</h4>
                                <p className="si-swap-hint">{t('sell_item.negotiable_hint')}</p>
                            </div>
                            <label className="si-toggle">
                                <input type="checkbox" checked={isSwappable} onChange={e => setIsSwappable(e.target.checked)} />
                                <span className="si-toggle-slider" />
                            </label>
                        </div>

                        <div className="si-swap-row si-shipping-row" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                            <div>
                                <h4 className="si-swap-title">{t('sell_item.shipping_title')}</h4>
                                <p className="si-swap-hint">{t('sell_item.shipping_hint')}</p>
                            </div>
                            <label className="si-toggle">
                                <input type="checkbox" checked={shippingIncluded} onChange={e => setShippingIncluded(e.target.checked)} />
                                <span className="si-toggle-slider" />
                            </label>
                        </div>
                    </div>

                    {/* Dynamic Specifications */}
                    <div className="si-card">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="si-section-title m-0">{t('sell_item.specifications')}</h2>
                            <button type="button" className="btn btn-primary btn-sm rounded-pill px-3 d-inline-flex align-items-center justify-content-center" onClick={handleAddSpec}>
                                <FaPlusCircle className="me-2" /> {t('sell_item.add_detail')}
                            </button>
                        </div>

                        <div className="si-field-hint">
                            {t('sell_item.spec_hint')}
                        </div>

                        {specifications.map((spec, index) => (
                            <div key={index} className="si-spec-row">
                                <input
                                    type="text"
                                    className="si-input"
                                    placeholder={t('sell_item.spec_label_placeholder')}
                                    value={spec.key}
                                    onChange={(e) => handleSpecChange(index, 'key', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="si-input"
                                    placeholder={t('sell_item.spec_value_placeholder')}
                                    value={spec.value}
                                    onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                />
                                <button type="button" className="si-spec-remove-btn" onClick={() => handleRemoveSpec(index)} title="Remove">
                                    <FaTimes />
                                </button>
                            </div>
                        ))}
                        {specifications.length === 0 && (
                            <div className="text-center py-4 bg-light rounded-3 border-dashed" style={{ border: '2px dashed #e2e8f0' }}>
                                <span className="text-muted small">{t('sell_item.no_specs_added')}</span>
                            </div>
                        )}
                    </div>

                    <div className="si-actions">
                        <button type="button" className="si-btn-draft">{t('sell_item.cancel')}</button>
                        <button type="submit" className="si-btn-upload" disabled={loading}>{loading ? t('sell_item.uploading') : t('sell_item.post_listing')}</button>
                    </div>
                </form>

                <div className="si-footer-note">
                    <p>{t('sell_item.agree_terms')}<Link to="/terms">{t('sell_item.terms_of_service')}</Link>.</p>
                    <div className="si-footer-links">
                        <Link to="/help">{t('sell_item.help_center')}</Link>
                        <Link to="/safety">{t('sell_item.safety')}</Link>
                        <Link to="/selling-guide">{t('sell_item.selling_guide')}</Link>
                    </div>
                </div>
            </div>

            {/* Add Custom Category/Subcategory Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {addModalType === 'category' ? 'Add New Category' : addModalType === 'subcategory' ? 'Add New Subcategory' : 'Add New Item Type'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter name"
                            value={addModalValue}
                            onChange={(e) => setAddModalValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddModalSubmit())}
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleAddModalSubmit}>
                        Add
                    </Button>
                </Modal.Footer>
            </Modal>

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

export default SellItem;
