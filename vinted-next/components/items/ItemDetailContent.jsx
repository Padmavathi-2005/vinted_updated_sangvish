'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/utils/axios';
import {
    FaHeart, FaRegHeart,
    FaStar, FaShieldAlt, FaTruck, FaUndo,
    FaBoxOpen,
    FaUser, FaCalendarAlt, FaEye, FaMapMarkerAlt,
    FaRegFlag, FaCommentDots, FaHandshake,
    FaShoppingBag, FaTimes, FaClock, FaStarHalfAlt, FaRegStar,
    FaShareAlt, FaSearchPlus, FaShoppingCart, FaEdit, FaEnvelope,
    FaTag, FaRuler, FaPalette, FaBoxes, FaList, FaBolt,
    FaEyeSlash, FaCheckCircle, FaPercent, FaTrash,
    FaWhatsapp, FaFacebookF, FaLink, FaCopy
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import AuthContext from '@/context/AuthContext';
import WishlistContext from '@/context/WishlistContext';
import CurrencyContext from '@/context/CurrencyContext';
import CartContext from '@/context/CartContext';
import ItemCard from '@/components/common/ItemCard';
import { usePopup } from '@/components/common/Popup';
import { useSettings } from '@/context/SettingsContext';
import '@/app/styles/ItemDetail.css';
import CustomSelect from '@/components/common/CustomSelect';
import { getImageUrl, getItemImageUrl, safeString } from '@/utils/constants';
import Link from 'next/link';
import { validateTextField, getTextFieldError } from '@/utils/validation';
import { Modal, Button } from 'react-bootstrap';
import dynamic from 'next/dynamic';

const RECENTLY_VIEWED_KEY = 'vinted_recently_viewed';
const MAX_RECENT = 12;

const addToRecentlyViewed = (itemId) => {
    if (typeof window === 'undefined' || !itemId) return;
    try {
        const idStr = itemId.toString();
        let list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        list = list.filter(id => id !== idStr);
        list.unshift(idStr);
        if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch { /* silent */ }
};

const getRecentlyViewedIds = (excludeId) => {
    if (typeof window === 'undefined') return [];
    try {
        const excludeStr = excludeId ? excludeId.toString() : '';
        const list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        return list.filter(id => id !== excludeStr);
    } catch { return []; }
};

const conditionConfig = {
    'New': { label: 'New', color: '#16a34a', bg: '#f0fdf4' },
    'Very Good': { label: 'Very Good', color: '#0ea5e9', bg: '#f0f9ff' },
    'Good': { label: 'Good', color: '#f59e0b', bg: '#fffbeb' },
    'Normal': { label: 'Normal', color: '#f97316', bg: '#fff7ed' },
    'Bad': { label: 'Bad', color: '#ef4444', bg: '#fef2f2' },
    'Very Bad': { label: 'Very Bad', color: '#dc2626', bg: '#fef2f2' },
};

const ItemDetailContent = () => {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();
    const { user, login } = useContext(AuthContext);
    const { isWishlisted, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
    const { formatPrice, convertPrice, currentCurrency, defaultCurrency } = useContext(CurrencyContext);
    const { addToCart, isInCart } = useContext(CartContext);
    const { showPopup, PopupComponent } = usePopup();
    const { t } = useTranslation();
    const { settings } = useSettings();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImg, setActiveImg] = useState(0);
    const [isPortrait, setIsPortrait] = useState(false);
    const [lightbox, setLightbox] = useState(false);
    const [lightboxZoom, setLightboxZoom] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [similarItems, setSimilarItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [offerModal, setOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerMsg, setOfferMsg] = useState('');
    const [offerSending, setOfferSending] = useState(false);
    const [hoveredSide, setHoveredSide] = useState(null);
    const [shareModal, setShareModal] = useState(false);
    const [reportModal, setReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportMsg, setReportMsg] = useState('');
    const [reportSending, setReportSending] = useState(false);

    // Discount state (for own items)
    const [discountInput, setDiscountInput] = useState('');
    const [discountApplying, setDiscountApplying] = useState(false);
    const [discountError, setDiscountError] = useState('');
    const [discountSuccess, setDiscountSuccess] = useState('');

    // Login popup state
    const [loginPopup, setLoginPopup] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginAction, setLoginAction] = useState('');

    // Fetch item
    useEffect(() => {
        if (!id) return;
        const fetchItem = async () => {
            try {
                setLoading(true);
                setActiveImg(0);
                setHoveredSide(null);
                const res = await axios.get(`/api/items/${id}`);
                setItem(res.data);
                // Always store the unique _id, not the slug/id from URL
                addToRecentlyViewed(res.data._id);
            } catch (err) {
                setError(err.response?.data?.message || 'Item not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id]);

    // Fetch similar items
    useEffect(() => {
        if (!item || !id) return;
        axios.get(`/api/items/${id}/similar`)
            .then(res => setSimilarItems(res.data.slice(0, 5)))
            .catch(() => setSimilarItems([]));
    }, [item, id]);

    // Fetch recently viewed
    useEffect(() => {
        if (!item?._id) return;
        const recentIds = getRecentlyViewedIds(item._id);
        if (recentIds.length === 0) { setRecentItems([]); return; }
        Promise.all(
            recentIds.slice(0, 6).map(rid =>
                axios.get(`/api/items/${rid}`).then(r => r.data).catch(() => null)
            )
        ).then(items => {
            const filtered = items.filter(Boolean);
            // Deduplicate by ID just in case
            const unique = [];
            const seen = new Set();
            filtered.forEach(i => {
                const uid = i._id?.toString() || i._id;
                if (!seen.has(uid)) {
                    seen.add(uid);
                    unique.push(i);
                }
            });
            setRecentItems(unique.slice(0, 5));
        });
    }, [item?._id]);

    useEffect(() => {
        const anyOpen = offerModal || shareModal || reportModal || loginPopup;
        if (anyOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [offerModal, shareModal, reportModal, loginPopup]);

    const getImageSrc = (path) =>
        getItemImageUrl(path);

    const images = item?.images?.length > 0
        ? item.images
        : [''];

    const displayedImg = hoveredSide !== null ? hoveredSide : activeImg;
    const isLiked = isWishlisted(id);

    // Guard: require login, open popup instead of redirect
    const requireLogin = (action) => {
        if (!user) {
            setLoginAction(action);
            setLoginError('');
            setLoginEmail('');
            setLoginPassword('');
            setLoginPopup(true);
            return false;
        }
        return true;
    };

    const handleWishlistToggle = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!requireLogin('wishlist')) return;
        if (isLiked) {
            removeFromWishlist(id);
            if (item) setItem({ ...item, likes_count: (item.likes_count || 1) - 1 });
        } else {
            addToWishlist(id);
            if (item) setItem({ ...item, likes_count: (item.likes_count || 0) + 1 });
        }
    };

    const handleBuyNow = () => {
        if (!requireLogin('buy')) return;
        // Add to cart (selected) then go to checkout
        let buyItem = { ...item };
        if (item.accepted_offer) {
            buyItem.price = item.accepted_offer.amount;
            buyItem.original_price = item.price;
        }
        if (item && !isInCart(item._id)) addToCart({ ...buyItem, selected: true });
        router.push('/checkout');
    };

    const handleAddToCart = () => {
        if (!requireLogin('cart')) return;
        if (isInCart(item._id)) {
            showPopup({ type: 'info', title: 'Already in Cart', message: 'This item is already in your cart.', });
            return;
        }
        let cartItem = { ...item };
        if (item.accepted_offer) {
            cartItem.price = item.accepted_offer.amount;
            cartItem.original_price = item.price;
        }
        addToCart({ ...cartItem, selected: true });
        showPopup({
            type: 'success',
            title: 'Added to Cart!',
            message: `"${item.title}" has been added to your cart.`,
        });
    };

    const handleMessage = () => {
        if (!requireLogin('message')) return;
        const sellerId = item.seller_id?._id;
        if (!sellerId) return;
        if ((user.id || user._id)?.toString() === sellerId?.toString()) {
            showPopup({ type: 'warning', title: 'Own Item', message: 'You cannot message yourself about your own item.' });
            return;
        }
        router.push(`/profile?tab=messages&user=${sellerId}&item=${item._id}`);
    };

    const handleMakeOffer = async () => {
        if (!requireLogin('offer')) return;
        if (!offerAmount || parseFloat(offerAmount) <= 0) return;
        setOfferSending(true);
        try {
            const currentEffectivePrice = item.accepted_offer ? item.accepted_offer.amount : item.price;
            const minAllowedOffer = currentEffectivePrice * 0.7;

            // Convert offer amount (in user currency) to item's local currency for backend storage/comparison
            const offerInItemCurrency = convertPrice(parseFloat(offerAmount), currentCurrency, item.currency_id);

            if (offerInItemCurrency > currentEffectivePrice) {
                showPopup({
                    type: 'error',
                    title: t('item_detail.offer_too_high_title', 'Offer Too High'),
                    message: `Your offer cannot be higher than the current effective price (${formatPrice(currentEffectivePrice, item.currency_id)})`
                });
                return;
            }

            if (offerInItemCurrency < minAllowedOffer) {
                showPopup({
                    type: 'error',
                    title: t('item_detail.offer_too_low_title', 'Offer Too Low'),
                    message: `Your offer is too low. The minimum allowed offer is ${formatPrice(minAllowedOffer, item.currency_id)} (70% of the price).`
                });
                return;
            }

            const res = await axios.post('/api/messages', {
                receiver_id: item.seller_id?._id,
                message: offerMsg || `Offer of ${formatPrice(offerInItemCurrency, item.currency_id)} for "${item.title}"`,
                item_id: item._id,
                message_type: 'offer',
                offer_amount: offerInItemCurrency
            });
            const convId = res.data.conversation?._id || res.data.conversation_id || res.data._id;
            setOfferModal(false);
            setOfferAmount('');
            setOfferMsg('');
            router.push(`/profile?tab=messages&conversation=${convId}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send offer.');
        } finally {
            setOfferSending(false);
        }
    };

    // Real-time offer validation
    const getOfferValidation = () => {
        if (!offerModal || !item) return { valid: false, canSubmit: false, errors: {} };

        let errors = {};
        const amount = parseFloat(offerAmount);

        // Amount checks (only if something is typed)
        if (offerAmount && (isNaN(amount) || amount <= 0)) {
            errors.amount = t('item_detail.invalid_amount', 'Please enter a valid amount');
        } else if (amount > 0) {
            const currentEffectivePrice = item.accepted_offer ? item.accepted_offer.amount : item.price;
            const convertedPrice = convertPrice(currentEffectivePrice, item.currency_id);
            const minAllowed = convertedPrice * 0.7;

            if (amount > convertedPrice + 0.01) {
                errors.amount = t('item_detail.offer_too_high', 'Offer cannot be higher than current price');
            } else if (amount < minAllowed - 0.01) {
                errors.amount = t('item_detail.offer_too_low', 'Offer must be at least 70% of the price');
            }
        }

        // Message checks (optional, but validated if present)
        if (offerMsg.length > 300) {
            errors.message = t('item_detail.msg_too_long', 'Message is too long (max 300 chars)');
        }

        const hasErrors = Object.keys(errors).length > 0;
        const canSubmit = amount > 0 && !hasErrors;

        return { valid: !hasErrors, canSubmit, errors };
    };

    const offerValidation = getOfferValidation();

    const handleApplyDiscount = async () => {
        setDiscountError('');
        setDiscountSuccess('');
        const percentage = parseFloat(discountInput);
        if (isNaN(percentage) || percentage <= 0 || percentage >= 100) {
            setDiscountError('Please enter a valid percentage (1-99).');
            return;
        }

        const basePrice = item.original_price > 0 ? item.original_price : item.price;
        const newPrice = parseFloat((basePrice * (1 - percentage / 100)).toFixed(2));

        setDiscountApplying(true);
        try {
            await axios.put(`/api/items/${id}/discount`, { discounted_price: newPrice });
            // Re-fetch complete item so seller_id stays populated & isOwnItem stays true
            const res = await axios.get(`/api/items/${id}`);
            setItem(res.data);
            setDiscountInput('');
            setDiscountSuccess(`✅ Discount applied! ${percentage}% off — new price: ${formatPrice(newPrice, item.currency_id)}`);
        } catch (err) {
            setDiscountError(err.response?.data?.message || 'Failed to apply discount.');
        } finally {
            setDiscountApplying(false);
        }
    };

    const handleRemoveDiscount = async () => {
        setDiscountError('');
        setDiscountSuccess('');
        setDiscountApplying(true);
        try {
            await axios.delete(`/api/items/${id}/discount`);
            // Re-fetch complete item so seller_id stays populated
            const res = await axios.get(`/api/items/${id}`);
            setItem(res.data);
            setDiscountSuccess('✅ Discount removed. Original price restored.');
        } catch (err) {
            setDiscountError(err.response?.data?.message || 'Failed to remove discount.');
        } finally {
            setDiscountApplying(false);
        }
    };

    const handleReportSubmit = async () => {
        if (!user) {
            setLoginAction('report');
            setLoginPopup(true);
            return;
        }

        if (!validateTextField(reportMsg)) {
            showPopup({
                type: 'error',
                title: 'Invalid Details',
                message: getTextFieldError('Additional Details')
            });
            return;
        }

        try {
            setReportSending(true);
            await axios.post('/api/reports', {
                item_id: id,
                reason: reportReason,
                message: reportMsg
            });
            showPopup({ type: 'success', title: 'Success', message: 'Your report has been submitted to the admin for review.' });
            setReportModal(false);
            setReportReason('');
            setReportMsg('');
        } catch (err) {
            showPopup({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to submit report. Please try again.' });
        } finally {
            setReportSending(false);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await axios.post('/api/users/login', {
                email: loginEmail,
                password: loginPassword
            });
            // The response data IS the user object (with token inside)
            const userData = res.data;
            if (!userData || !userData.token) {
                throw new Error('Invalid response from server');
            }
            // Use AuthContext login — stores in localStorage and updates React state
            login(userData, true);
            setLoginPopup(false);
            setLoginEmail('');
            setLoginPassword('');
        } catch (err) {
            setLoginError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLightboxMouseMove = (e) => {
        if (!lightboxZoom) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPos({ x, y });
    };

    const renderStars = (rating, count) => {
        const score = rating || 0;
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (score >= i) stars.push(<FaStar key={i} className="star-filled" />);
            else if (score >= i - 0.5) stars.push(<FaStarHalfAlt key={i} className="star-filled" />);
            else stars.push(<FaRegStar key={i} className="star-empty" />);
        }
        return (
            <div className="id-seller-stars">
                {stars}
                <span>({count || 0} {(count || 0) === 1 ? t('item_detail.review') : t('item_detail.reviews')})</span>
            </div>
        );
    };

    const [brokenImages, setBrokenImages] = useState(new Set());

    const handleImageError = (path) => {
        setBrokenImages(prev => {
            const next = new Set(prev);
            next.add(path);
            return next;
        });
    };

    const handleThumbClick = (idx) => {
        setActiveImg(idx);
        setHoveredSide(null);
        setIsPortrait(false); 
    };

    const handleImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.target;
        // Adjusted requirement: Portrait triggers if height >= 1.7 * width
        if (naturalHeight >= 1.4 * naturalWidth) {
            setIsPortrait(true);
        } else {
            setIsPortrait(false);
        }
    };

    if (loading) {
        return (
            <div className="id-loading">
                <div className="id-spinner" />
                <p>{t('item_detail.loading_item')}</p>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="id-error-page">
                <div className="id-error-card">
                    <FaBoxOpen className="id-error-icon" />
                    <h2>{t('item_detail.item_not_found')}</h2>
                    <p>{error || t('item_detail.item_not_found_desc')}</p>
                    <Link href="/products" className="id-btn-primary">{t('item_detail.browse_other')}</Link>
                </div>
            </div>
        );
    }

    const seller = item.seller_id;
    const condCfg = conditionConfig[item.condition] || { label: item.condition, color: '#6b7280', bg: '#f8fafc' };
    const condLabel = item.condition ? t(`sell_item.condition_options.${item.condition.replace(/ /g, '')}`, { defaultValue: condCfg.label }) : condCfg.label;
    const memberSinceYear = seller?.created_at ? new Date(seller.created_at).getFullYear() : 'N/A';
    const isOwnItem = user && seller && (
        (user.id || user._id)?.toString() === seller?._id?.toString()
    );
    const sideImages = images.length > 1 ? images : [];

    // Build details rows
    const detailRows = [
        item.condition && {
            icon: <FaBolt />, label: t('item_detail.condition'),
            value: (
                <span className="id-condition-chip" style={{ color: condCfg.color, borderColor: condCfg.color, background: condCfg.bg }}>
                    {condLabel}
                </span>
            )
        },
        item.brand && { icon: <FaTag />, label: t('item_detail.brand'), value: safeString(item.brand) },
        item.size && { icon: <FaRuler />, label: t('item_detail.size'), value: safeString(item.size) },
        item.color && {
            icon: <FaPalette />, label: t('item_detail.color'),
            value: (
                <span className="id-color-inline">
                    <span className="id-color-dot" style={{ backgroundColor: safeString(item.color).toLowerCase() }} />
                    {safeString(item.color)}
                </span>
            )
        },
        item.category_id && { icon: <FaList />, label: t('item_detail.category'), value: safeString(item.category_id.name) },
        item.subcategory_id && { icon: <FaList />, label: t('item_detail.subcategory'), value: safeString(item.subcategory_id.name) },
        item.item_type_id && { icon: <FaBoxes />, label: t('item_detail.type'), value: safeString(item.item_type_id.name) },
        ...(item.attributes || []).map(attr => ({ icon: <FaTag />, label: safeString(attr.key), value: safeString(attr.value) })),
    ].filter(Boolean);

    const shortDesc = item.short_description || (item.description
        ? item.description.length > 120
            ? item.description.substring(0, 117) + '...'
            : item.description
        : '');

    return (
        <div className="id-page">
            <div className="id-container">
                {/* Breadcrumb */}
                <div className="id-breadcrumb" style={{ gridColumn: '1 / -1' }}>
                    <nav className="id-crumbs">
                        <Link href="/">{t('item_detail.home')}</Link>
                        {item.category_id && <><span className="id-crumb-sep">/</span> <Link href={`/products?category=${item.category_id.slug}`}>{safeString(item.category_id.name)}</Link></>}
                        {item.subcategory_id && <><span className="id-crumb-sep">/</span> <Link href={`/products?subcategory=${item.subcategory_id.slug}`}>{safeString(item.subcategory_id.name)}</Link></>}
                        <span className="id-crumb-sep">/</span>
                        <span className="id-crumb-current">{safeString(item.title)}</span>
                    </nav>
                </div>

                <div className="id-main-content-grid">
                    {/* ─── Left Column: Gallery ─── */}
                    <div className="id-gallery-col">
                        <div className={`id-gallery-layout ${isPortrait ? 'has-portrait' : ''}`}>
                            {/* Main Image */}
                            <div className={`id-main-img-wrapper ${isPortrait ? 'portrait-mode' : ''}`} onClick={() => setLightbox(true)}>
                                <img
                                    src={getImageSrc(images[displayedImg])}
                                    alt={item.title}
                                    className="id-main-img"
                                    style={{ display: brokenImages.has(images[displayedImg]) ? 'none' : 'block' }}
                                    onError={() => handleImageError(images[displayedImg])}
                                    onLoad={handleImageLoad}
                                />
                                {brokenImages.has(images[displayedImg]) && (
                                    <div className="id-main-img-placeholder" style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                        justifyContent: 'center', height: '100%', background: '#f1f5f9', color: '#94a3b8' 
                                    }}>
                                        <FaBoxOpen size={48} />
                                        <p style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 600 }}>Image Not Found</p>
                                    </div>
                                )}
                                {item.is_sold || item.status === 'sold' || item.is_ordered ? (
                                    <div className="id-sold-overlay">
                                        <span>ORDERED</span>
                                    </div>
                                ) : (
                                    <div className="id-condition-badge" style={{ backgroundColor: condCfg.color }}>{condLabel}</div>
                                )}
                                <div className="id-zoom-hint"><FaSearchPlus /> {t('item_detail.click_zoom')}</div>

                                {/* Overlay: Stats */}
                                <div className="id-img-overlay-stats" onClick={e => e.stopPropagation()}>
                                    {item.views_count > 0 && <span className="id-overlay-chip"><FaEye /> {item.views_count}</span>}
                                    {item.likes_count > 0 && <span className="id-overlay-chip"><FaHeart /> {item.likes_count}</span>}
                                </div>

                                {/* Overlay: Actions */}
                                <div className="id-img-overlay-actions" onClick={e => e.stopPropagation()}>
                                    <button
                                        className={`id-overlay-btn ${isLiked ? 'liked' : ''}`}
                                        onClick={handleWishlistToggle}
                                        title={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
                                        disabled={item.is_sold || item.status === 'sold' || item.is_ordered}
                                    >
                                        {isLiked ? <FaHeart /> : <FaRegHeart />}
                                    </button>
                                    <button className="id-overlay-btn" onClick={() => setShareModal(true)} title="Share">
                                        <FaShareAlt />
                                    </button>
                                    <button className="id-overlay-btn" title="Report" onClick={() => setReportModal(true)}>
                                        <FaRegFlag />
                                    </button>
                                </div>
                            </div>

                            {/* Side strip */}
                            {sideImages.length > 0 && (
                                <div className="id-side-strip">
                                    {sideImages.map((img, idx) => {
                                        return (
                                            <div
                                                key={idx}
                                                className={`id-side-img-wrapper ${idx === displayedImg ? 'active' : ''}`}
                                                onMouseEnter={() => setHoveredSide(idx)}
                                                onMouseLeave={() => setHoveredSide(null)}
                                                onClick={() => handleThumbClick(idx)}
                                            >
                                                {!brokenImages.has(img) ? (
                                                    <img 
                                                        src={getImageSrc(img)} 
                                                        alt={`View ${idx + 1}`} 
                                                        className="id-side-img" 
                                                        onError={() => handleImageError(img)} 
                                                    />
                                                ) : (
                                                    <div className="id-side-img id-side-img-fallback" style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <FaBoxOpen size={20} color="#cbd5e1" />
                                                    </div>
                                                )}
                                                <div className="id-thumb-overlay"><span>{idx + 1}</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Trust Badges */}
                        <div className="id-trust-row">
                            <div className="id-trust-item">
                                <FaShieldAlt className="id-trust-icon" />
                                <span>{t('item_detail.buyer_protection')}</span>
                            </div>
                            <div className="id-trust-item">
                                <FaTruck className="id-trust-icon" />
                                <span>{t('item_detail.secure_shipping')}</span>
                            </div>
                            <div className="id-trust-item">
                                <FaUndo className="id-trust-icon" />
                                <span>{t('item_detail.easy_returns')}</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right Column ─── */}
                    <div className="id-info-col">
                        {/* PRICE SECTION — FIRST */}
                        <div className="id-price-card">
                            {(item.is_sold || item.status === 'sold' || item.is_ordered) && (
                                <div className="id-sold-banner">
                                    <FaCheckCircle />
                                    <span>This item has been ordered and is no longer available.</span>
                                </div>
                            )}
                            <h1 className="id-item-title">{safeString(item.title)}</h1>
                            <div className="id-price-row">
                                <div>
                                    {item.accepted_offer ? (
                                        <div>
                                            <div className="id-price" style={{ color: '#16a34a' }}>
                                                {formatPrice(item.accepted_offer.amount, item.currency_id)}
                                                <span className="id-accepted-badge">
                                                    OFFER ACCEPTED
                                                </span>
                                            </div>
                                            <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.95rem', marginTop: '2px' }}>
                                                {formatPrice(item.price, item.currency_id)}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Discounted price — large, red, on top */}
                                            <div className="id-price" style={item.original_price > 0 && item.original_price > item.price ? { color: '#ef4444' } : {}}>
                                                {formatPrice(item.price, item.currency_id)}
                                                {item.original_price > 0 && item.original_price > item.price && (
                                                    <span style={{ fontSize: '0.78rem', background: '#ef4444', color: 'white', borderRadius: '6px', padding: '2px 8px', marginLeft: '10px', fontWeight: '700' }}>
                                                        -{Math.round(((item.original_price - item.price) / item.original_price) * 100)}% OFF
                                                    </span>
                                                )}
                                            </div>
                                            {/* Original price crossed out — below the discounted price */}
                                            {item.original_price > 0 && item.original_price > item.price && (
                                                <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.95rem', marginTop: '2px' }}>
                                                    {formatPrice(item.original_price, item.currency_id)}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {item.negotiable && (
                                    <span className="id-negotiable-badge">
                                        <FaHandshake /> {t('item_detail.negotiable')}
                                    </span>
                                )}
                            </div>
                            {/* Shipping info */}
                            <div className="id-shipping-info">
                                {item.shipping_included ? (
                                    <span className="id-ship-free"><FaTruck /> {t('item_detail.shipping_included')}</span>
                                ) : (
                                    <span className="id-ship-paid"><FaTruck /> {t('item_detail.shipping_est')}</span>
                                )}
                            </div>
                            <p className="id-price-sub">{t('item_detail.buyer_fee_apply')}</p>
                        </div>

                        {/* DETAILS BOX */}
                        {detailRows.length > 0 && (
                            <div className="id-details-box">
                                <h3 className="id-box-title">{t('item_detail.item_details')}</h3>
                                <div className="id-details-list">
                                    {detailRows.map((row, i) => (
                                        <div key={i} className="id-detail-row">
                                            <span className="id-detail-label">
                                                <span className="id-detail-icon">{row.icon}</span>
                                                {row.label}
                                            </span>
                                            <span className="id-detail-colon">:</span>
                                            <span className="id-detail-value">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DESCRIPTION */}
                        {item.description && (
                            <div className="id-desc-box">
                                <h3 className="id-box-title">{t('item_detail.description')}</h3>
                                <p className="id-description">{safeString(item.description)}</p>
                                {(item.location_label || item.location) && (
                                    <div className="id-location-info-small mt-3 pt-3 border-top d-flex align-items-center gap-2 text-muted small">
                                        <FaMapMarkerAlt style={{ color: '#ef4444' }} />
                                        <span>{item.location_label || item.location}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {isOwnItem ? (
                            <>
                                <Link href={`/profile?tab=listings`} className="id-btn-edit-item">
                                    <FaEdit /> {t('item_detail.manage_listing')}
                                </Link>

                                {/* ── Seller Discount Panel ── */}
                                {!item.is_sold && item.status !== 'sold' && !item.is_ordered && (
                                    <div style={{
                                        marginTop: '16px', padding: '16px', borderRadius: '12px',
                                        border: '1.5px dashed #e2e8f0', background: '#fafafa'
                                    }}>
                                        <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FaPercent style={{ color: '#ef4444' }} /> Apply a Discount
                                        </div>

                                        {/* Current discount status */}
                                        {item.original_price > 0 && item.original_price > item.price ? (
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                Currently discounted: <strong style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatPrice(item.original_price, item.currency_id)}</strong>
                                                {' → '}<strong style={{ color: '#ef4444' }}>{formatPrice(item.price, item.currency_id)}</strong>
                                                <span style={{ background: '#ef4444', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '0.75rem', marginLeft: '6px' }}>
                                                    -{Math.round(((item.original_price - item.price) / item.original_price) * 100)}% OFF
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '10px' }}>
                                                Current price: <strong>{formatPrice(item.price, item.currency_id)}</strong> — Enter a discount percentage below.
                                            </div>
                                        )}

                                        {/* Live preview */}
                                        {discountInput && !isNaN(parseFloat(discountInput)) && parseFloat(discountInput) > 0 && parseFloat(discountInput) < 100 && (() => {
                                            const base = item.original_price > 0 ? item.original_price : item.price;
                                            const pct = parseFloat(discountInput);
                                            const newP = parseFloat((base * (1 - pct / 100)).toFixed(2));
                                            return (
                                                <div style={{ fontSize: '0.82rem', marginBottom: '8px', color: '#16a34a', fontWeight: '600' }}>
                                                    Preview: <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatPrice(base, item.currency_id)}</span> → <span style={{ color: '#ef4444' }}>{formatPrice(newP, item.currency_id)}</span> <span style={{ background: '#ef4444', color: 'white', borderRadius: '4px', padding: '1px 5px', fontSize: '0.72rem' }}>-{pct}% OFF</span>
                                                </div>
                                            );
                                        })()}

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="99"
                                                    value={discountInput}
                                                    onChange={e => { setDiscountInput(e.target.value); setDiscountError(''); setDiscountSuccess(''); }}
                                                    placeholder="Enter discount %"
                                                    style={{
                                                        border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 30px 8px 12px',
                                                        fontSize: '0.9rem', width: '100%', outline: 'none', boxSizing: 'border-box'
                                                    }}
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '700' }}>%</span>
                                            </div>
                                            <button
                                                onClick={handleApplyDiscount}
                                                disabled={discountApplying || !discountInput}
                                                style={{
                                                    background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px',
                                                    padding: '8px 16px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {discountApplying ? 'Applying...' : '🏷️ Apply'}
                                            </button>
                                            {item.original_price > 0 && item.original_price > item.price && (
                                                <button
                                                    onClick={handleRemoveDiscount}
                                                    disabled={discountApplying}
                                                    style={{
                                                        background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0',
                                                        borderRadius: '8px', padding: '8px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                                                    }}
                                                >
                                                    <FaTrash style={{ marginRight: '4px', fontSize: '0.75rem' }} /> Remove
                                                </button>
                                            )}
                                        </div>
                                        {discountError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '8px' }}>{discountError}</div>}
                                        {discountSuccess && <div style={{ color: '#16a34a', fontSize: '0.82rem', marginTop: '8px' }}>{discountSuccess}</div>}
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px' }}>
                                            💡 Buyers who liked this item will get a price-drop notification!
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={`id-cta-group${!item.negotiable ? ' no-offer' : ''}`}>
                                {item.is_sold || item.status === 'sold' || item.is_ordered ? (
                                    <button className="id-btn-sold" disabled>
                                        <FaShoppingBag /> ORDERED
                                    </button>
                                ) : (
                                    <>
                                        {/* Row 1: Buy Now */}
                                        <button className="id-btn-buy" style={{ gridColumn: '1 / -1' }} onClick={handleBuyNow}>
                                            <FaShoppingBag /> {t('item_detail.buy_now')}
                                        </button>
                                        {/* Row 2: Cart + Offer */}
                                        {user && isInCart(item._id) ? (
                                            <Link href="/cart" className="id-btn-in-cart">
                                                <FaCheckCircle /> {t('item_detail.in_cart')}
                                            </Link>
                                        ) : (
                                            <button className="id-btn-cart" onClick={handleAddToCart}>
                                                <FaShoppingCart /> {t('item_detail.add_to_cart')}
                                            </button>
                                        )}
                                        {item.negotiable && (
                                            <button className="id-btn-offer" onClick={() => {
                                                if (!requireLogin('offer')) return;
                                                setOfferModal(true);
                                            }}>
                                                <FaHandshake /> {t('item_detail.make_offer')}
                                            </button>
                                        )}
                                    </>
                                )}
                                {/* Row 3: Message Seller (full width) */}
                                <button
                                    className="id-btn-message-cta"
                                    style={{ gridColumn: '1 / -1' }}
                                    onClick={handleMessage}
                                >
                                    <FaCommentDots /> {t('item_detail.message_seller')}
                                </button>
                            </div>
                        )}

                        {/* SELLER BOX */}
                        {seller && (
                            <div className="id-seller-box">
                                <h3 className="id-box-title">{t('item_detail.seller')}</h3>
                                <div className="id-seller-top">
                                    <Link href={`/seller/${seller._id}`} className="id-seller-avatar-link">
                                        <div className="id-seller-avatar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%', overflow: 'hidden' }}>
                                            <div className="id-seller-avatar-placeholder" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff' }}>
                                                {(seller.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            {seller.profile_image && (
                                                <img
                                                    src={getImageSrc(seller.profile_image)}
                                                    alt={seller.username}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                    onError={handleImageError}
                                                />
                                            )}
                                        </div>
                                    </Link>
                                    <div className="id-seller-info">
                                        <Link href={`/seller/${seller._id}`} className="id-seller-name-link">
                                            <h4 className="id-seller-name">{safeString(seller.username)}</h4>
                                        </Link>
                                        <p className="id-seller-since">
                                            <FaCalendarAlt /> {t('item_detail.member_since')} {memberSinceYear}
                                        </p>
                                        {renderStars(seller.rating_avg, seller.rating_count)}
                                    </div>
                                    <Link href={`/seller/${seller._id}`} className="id-btn-view-profile">
                                        <FaUser /> {t('item_detail.view_profile')}
                                    </Link>
                                </div>
                                {seller.bundle_discounts?.enabled && (
                                    <div className="id-seller-bundle-info">
                                        <div className="id-bundle-promo">
                                            <FaTag /> <strong>Bundle & Save!</strong> This seller offers discounts:
                                        </div>
                                        <div className="id-bundle-rates">
                                            {seller.bundle_discounts.two_items > 0 && <span>2 items ({seller.bundle_discounts.two_items}%)</span>}
                                            {seller.bundle_discounts.three_items > 0 && <span>3 items ({seller.bundle_discounts.three_items}%)</span>}
                                            {seller.bundle_discounts.five_items > 0 && <span>5 items ({seller.bundle_discounts.five_items}%)</span>}
                                        </div>
                                        <Link href={`/seller/${seller._id}`} className="id-btn-shop-bundles">
                                            <FaBoxOpen /> Shop Bundles
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* ─── Similar Products ─── */}
            {similarItems.length > 0 && (
                <div className="id-section-below">
                    <div className="id-section-header">
                        <div>
                            <h2 className="id-section-title" style={{ color: 'var(--primary-color, #0ea5e9)' }}>{t('item_detail.similar_products')}</h2>
                            <p className="id-section-sub">{t('item_detail.similar_sub')}</p>
                        </div>
                    </div>
                    <div className="vinted-product-grid id-single-row-grid">
                        {similarItems.map(si => (
                            <ItemCard key={si._id} item={si} />
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Recently Viewed ─── */}
            {recentItems.length > 0 && (
                <div className="id-section-below">
                    <div className="id-section-header">
                        <div>
                            <h2 className="id-section-title" style={{ color: 'var(--primary-color, #0ea5e9)' }}>
                                <FaClock style={{ marginRight: '8px', fontSize: '1.1rem' }} />{t('item_detail.recently_viewed')}
                            </h2>
                            <p className="id-section-sub">{t('item_detail.recent_sub')}</p>
                        </div>
                    </div>
                    <div className="vinted-product-grid id-single-row-grid">
                        {recentItems.map(ri => (
                            <ItemCard key={ri._id} item={ri} />
                        ))}
                    </div>
                </div>
            )}

            {/* Lightbox / Modals etc. could be added here or in PopupComponent */}
            <PopupComponent />

            {/* ─── Make Offer Modal ─── */}
            {offerModal && (
                <div className="id-offer-overlay" onClick={() => setOfferModal(false)}>
                    <div className="id-offer-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setOfferModal(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon"><FaHandshake /></div>
                            <h2>{t('item_detail.offer_title')}</h2>
                            <p>{t('item_detail.offer_desc')} <strong>{item.title}</strong></p>
                        </div>
                        <div className="id-offer-current-price">
                            <span>{item.accepted_offer ? t('item_detail.accepted_offer_price', 'Accepted Offer') : t('item_detail.listed_price')}</span>
                            <strong style={{ color: item.accepted_offer ? '#059669' : 'inherit' }}>
                                {formatPrice(item.accepted_offer ? item.accepted_offer.amount : item.price, item.currency_id)}
                            </strong>
                        </div>
                        <div className="id-offer-min-allowed" style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.8rem', color: '#64748b' }}>
                            {t('item_detail.min_offer_hint', 'Minimum allowed offer (70%)')}: <strong>{formatPrice((item.accepted_offer ? item.accepted_offer.amount : item.price) * 0.7, item.currency_id)}</strong>
                        </div>
                        <div className="id-offer-form">
                            <label className="id-offer-label">{t('item_detail.your_offer')}</label>
                            <div className={`id-offer-input-wrap ${offerValidation.errors.amount ? 'has-error' : ''}`}>
                                <span className="id-offer-currency">{(currentCurrency || defaultCurrency)?.symbol || '₹'}</span>
                                <input
                                    type="number"
                                    className={`id-offer-input ${offerValidation.errors.amount ? 'is-invalid' : ''}`}
                                    placeholder="0.00"
                                    value={offerAmount}
                                    onChange={e => setOfferAmount(e.target.value)}
                                    min="1"
                                    autoFocus
                                />
                            </div>
                            {offerValidation.errors.amount && (
                                <div className="id-offer-error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: '600' }}>
                                    {offerValidation.errors.amount}
                                </div>
                            )}
                            <label className="id-offer-label" style={{ marginTop: '16px' }}>{t('item_detail.optional_msg')}</label>
                            <textarea
                                className={`id-offer-textarea ${offerValidation.errors.message ? 'is-invalid' : ''}`}
                                placeholder={t('item_detail.msg_placeholder')}
                                value={offerMsg}
                                onChange={e => setOfferMsg(e.target.value)}
                                rows={3}
                            />
                            {offerValidation.errors.message && (
                                <div className="id-offer-error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: '600' }}>
                                    {offerValidation.errors.message}
                                </div>
                            )}
                            <div className="id-offer-msg-counter" style={{
                                textAlign: 'right',
                                fontSize: '0.7rem',
                                marginTop: '4px',
                                color: offerMsg.length > 300 ? '#ef4444' : '#94a3b8',
                                fontWeight: offerMsg.length > 300 ? '700' : '500'
                            }}>
                                {offerMsg.length} / 300
                            </div>
                            <button
                                className="id-offer-submit"
                                onClick={handleMakeOffer}
                                disabled={!offerValidation.canSubmit || offerSending}
                            >
                                {offerSending ? t('item_detail.sending') : t('item_detail.send_offer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Share Modal ─── */}
            {shareModal && (
                <div className="id-offer-overlay" onClick={() => setShareModal(false)}>
                    <div className="id-offer-modal id-share-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setShareModal(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}><FaShareAlt /></div>
                            <h2>{t('item_detail.share_item')}</h2>
                            <p>{t('item_detail.share_desc')}</p>
                        </div>

                        {/* Product Preview */}
                        <div className="id-share-preview">
                            <div className="id-share-preview-img-wrap">
                                {!brokenImages.has(images[0]) ? (
                                    <img 
                                        src={getImageSrc(images[0])} 
                                        alt={item.title} 
                                        className="id-share-preview-img" 
                                        onError={() => handleImageError(images[0])}
                                    />
                                ) : (
                                    <div className="id-share-preview-img" style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FaBoxOpen size={32} color="#cbd5e1" />
                                    </div>
                                )}
                            </div>
                            <div className="id-share-preview-info">
                                <h3 className="id-share-preview-title">{item.title}</h3>
                                <div className="id-share-preview-price">
                                    {formatPrice(item.accepted_offer ? item.accepted_offer.amount : item.price, item.currency_id)}
                                    {item.original_price > 0 && item.original_price > item.price && (
                                        <span className="id-share-preview-original">
                                            {formatPrice(item.original_price, item.currency_id)}
                                        </span>
                                    )}
                                </div>
                                {shortDesc && (
                                    <div className="id-share-preview-desc">
                                        {shortDesc}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="id-share-grid">
                            <div 
                                className="id-share-item" 
                                onClick={() => {
                                    const siteName = safeString(settings?.site_name, 'Resale');
                                    const text = encodeURIComponent(`${t('item_detail.check_out_this')} ${siteName}\n${window.location.href}`);
                                    window.open(`https://wa.me/?text=${text}`);
                                }}
                            >
                                <div className="id-share-icon whatsapp"><FaWhatsapp /></div>
                                <span>WhatsApp</span>
                            </div>
                            <div className="id-share-item" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>
                                <div className="id-share-icon facebook"><FaFacebookF /></div>
                                <span>Facebook</span>
                            </div>
                            <div 
                                className="id-share-item" 
                                onClick={() => {
                                    const siteName = safeString(settings?.site_name, 'Resale');
                                    const text = encodeURIComponent(`${t('item_detail.check_out_this')} ${siteName}\n${window.location.href}`);
                                    window.open(`https://twitter.com/intent/tweet?text=${text}`);
                                }}
                            >
                                <div className="id-share-icon twitter"><FaXTwitter /></div>
                                <span>X / Twitter</span>
                            </div>
                            <div
                                className="id-share-item"
                                onClick={() => {
                                    const siteName = safeString(settings?.site_name, 'Resale');
                                    const subject = encodeURIComponent(`${item.title} | ${siteName}`);
                                    const body = encodeURIComponent(`${t('item_detail.check_out_this')} ${siteName}\n${window.location.href}`);
                                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
                                    window.open(gmailUrl, '_blank');
                                }}
                            >
                                <div className="id-share-icon email"><FaEnvelope /></div>
                                <span>Email</span>
                            </div>
                        </div>

                        <div className="id-share-copy-section">
                            <div className="id-share-copy-label">{t('item_detail.or_copy_link')}</div>
                            <div className="id-share-copy-bar">
                                <span className="id-share-url">{window.location.href}</span>
                                <button
                                    className="id-share-copy-btn"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(window.location.href);
                                        showPopup('Copied', 'Item link copied to clipboard!', 'success');
                                        setShareModal(false);
                                    }}
                                >
                                    <FaCopy /> {t('item_detail.copy')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Login Popup ─── */}
            {loginPopup && (
                <div className="id-login-overlay" onClick={() => setLoginPopup(false)}>
                    <div className="id-login-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setLoginPopup(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon" style={{ background: '#f0f9ff', color: 'var(--primary-color, #0ea5e9)' }}>
                                <FaEnvelope />
                            </div>
                            <h2>{t('item_detail.login_required')}</h2>
                            <p>
                                {loginAction === 'buy' ? t('item_detail.sign_in_action_buy') :
                                    loginAction === 'cart' ? t('item_detail.sign_in_action_cart') :
                                        loginAction === 'offer' ? t('item_detail.sign_in_action_offer') :
                                            loginAction === 'message' ? t('item_detail.sign_in_action_msg') :
                                                t('item_detail.sign_in_action_def')}
                            </p>
                        </div>
                        {loginError && (
                            <div className="id-login-error">{loginError}</div>
                        )}
                        <form className="id-login-form" onSubmit={handleLoginSubmit}>
                            <input
                                type="email"
                                className="id-login-input"
                                placeholder={t('item_detail.email_addr')}
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            <div className="id-login-pw-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="id-login-input"
                                    placeholder={t('item_detail.password')}
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '44px' }}
                                />
                                <button
                                    type="button"
                                    className="id-login-eye"
                                    onClick={() => setShowPassword(s => !s)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="id-offer-submit"
                                disabled={loginLoading}
                                style={{ background: 'var(--primary-color, #0ea5e9)', marginTop: '4px' }}
                            >
                                {loginLoading ? t('item_detail.signing_in') : t('item_detail.sign_in')}
                            </button>
                        </form>
                        <div className="id-login-footer">
                            <span>{t('item_detail.no_account')} </span>
                            <Link href="/register" onClick={() => setLoginPopup(false)}>{t('item_detail.sign_up_free')}</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Report Modal ─── */}
            {reportModal && (
                <div className="id-offer-overlay" onClick={() => setReportModal(false)}>
                    <div className="id-offer-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setReportModal(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><FaRegFlag /></div>
                            <h2>Report Item</h2>
                            <p>Help us understand what's wrong with this listing.</p>
                        </div>
                        <div className="id-offer-form">
                            <label className="id-offer-label">Reason for reporting</label>
                            <CustomSelect
                                options={[
                                    { value: 'Inappropriate Content', label: 'Inappropriate Content' },
                                    { value: 'Counterfeit/Fake', label: 'Counterfeit/Fake' },
                                    { value: 'Scam/Fraud', label: 'Scam/Fraud' },
                                    { value: 'Prohibited Item', label: 'Prohibited Item' },
                                    { value: 'Poor Image Quality', label: 'Poor Image Quality' },
                                    { value: 'Other', label: 'Other' },
                                ]}
                                value={reportReason}
                                onChange={setReportReason}
                                placeholder="Select a reason"
                            />

                            <label className="id-offer-label">Additional Details</label>
                            <textarea
                                className={`id-offer-textarea ${reportMsg && !validateTextField(reportMsg) ? 'invalid' : ''}`}
                                placeholder="Describe the issue in detail..."
                                value={reportMsg}
                                onChange={e => setReportMsg(e.target.value)}
                                rows={4}
                            />
                            {reportMsg && !validateTextField(reportMsg) && (
                                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', fontWeight: '500' }}>
                                    {getTextFieldError('Additional Details')}
                                </p>
                            )}
                            <button
                                className="id-offer-submit"
                                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                                onClick={handleReportSubmit}
                                disabled={!reportReason || !reportMsg || reportSending || !validateTextField(reportMsg)}
                            >
                                {reportSending ? "Sending..." : "Submit Report"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox / Zoom Modal */}
            {lightbox && (
                <div className="id-lightbox-overlay" onClick={() => { setLightbox(false); setLightboxZoom(false); }}>
                    <div className="id-lightbox-content" onClick={e => e.stopPropagation()}>
                        <button className="id-lightbox-close" onClick={() => { setLightbox(false); setLightboxZoom(false); }}>
                            <FaTimes />
                        </button>
                        <div
                            className={`id-lightbox-img-container ${lightboxZoom ? 'zoomed' : ''}`}
                            onClick={() => setLightboxZoom(!lightboxZoom)}
                            onMouseMove={handleLightboxMouseMove}
                            style={{ cursor: lightboxZoom ? 'zoom-out' : 'zoom-in' }}
                        >
                            {!brokenImages.has(images[activeImg]) ? (
                                <img
                                    src={getImageSrc(images[activeImg])}
                                    alt={item.title}
                                    className="id-lightbox-img"
                                    style={lightboxZoom ? {
                                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                        transform: 'scale(2.5)'
                                    } : {}}
                                    onError={() => handleImageError(images[activeImg])}
                                />
                            ) : (
                                <div className="id-lightbox-error" style={{ color: 'white', textAlign: 'center' }}>
                                    <FaBoxOpen size={64} />
                                    <p style={{ marginTop: '20px' }}>This image could not be loaded.</p>
                                </div>
                            )}
                        </div>
                        {images.length > 1 && (
                            <div className="id-lightbox-thumbs">
                                {images.map((img, i) => (
                                    <div
                                        key={i}
                                        className={`id-lb-thumb ${i === activeImg ? 'active' : ''}`}
                                        onClick={() => setActiveImg(i)}
                                    >
                                        {!brokenImages.has(img) ? (
                                            <img 
                                                src={getImageSrc(img)} 
                                                alt={`Thumb ${i}`} 
                                                onError={() => handleImageError(img)}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FaBoxOpen size={16} color="#64748b" />
                                            </div>
                                        )}
                                        <div className="id-lb-thumb-num">{(i + 1)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemDetailContent;
