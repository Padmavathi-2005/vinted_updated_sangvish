import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
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
import AuthContext from '../context/AuthContext';
import WishlistContext from '../context/WishlistContext';
import CurrencyContext from '../context/CurrencyContext';
import CartContext from '../context/CartContext';
import ItemCard from '../components/common/ItemCard';
import Meta from '../components/common/Meta';
import { usePopup } from '../components/common/Popup';
import '../styles/ItemDetail.css';
import CustomSelect from '../components/common/CustomSelect';
import { getImageUrl, getItemImageUrl, safeString } from '../utils/constants';

const RECENTLY_VIEWED_KEY = 'vinted_recently_viewed';
const MAX_RECENT = 12;

const addToRecentlyViewed = (itemId) => {
    try {
        let list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        list = list.filter(id => id !== itemId);
        list.unshift(itemId);
        if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch { /* silent */ }
};

const getRecentlyViewedIds = (excludeId) => {
    try {
        const list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        return list.filter(id => id !== excludeId);
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

const ItemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, login } = useContext(AuthContext);
    const { isWishlisted, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
    const { formatPrice, currentCurrency, defaultCurrency } = useContext(CurrencyContext);
    const { addToCart, isInCart } = useContext(CartContext);
    const { showPopup, PopupComponent } = usePopup();
    const { t } = useTranslation();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImg, setActiveImg] = useState(0);
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
        const fetchItem = async () => {
            try {
                setLoading(true);
                setActiveImg(0);
                setHoveredSide(null);
                const res = await axios.get(`/api/items/${id}`);
                setItem(res.data);
                addToRecentlyViewed(id);
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
        if (!item) return;
        axios.get(`/api/items/${id}/similar`)
            .then(res => setSimilarItems(res.data.slice(0, 5)))
            .catch(() => setSimilarItems([]));
    }, [item, id]);

    // Fetch recently viewed
    useEffect(() => {
        const recentIds = getRecentlyViewedIds(id);
        if (recentIds.length === 0) { setRecentItems([]); return; }
        Promise.all(
            recentIds.slice(0, 5).map(rid =>
                axios.get(`/api/items/${rid}`).then(r => r.data).catch(() => null)
            )
        ).then(items => setRecentItems(items.filter(Boolean)));
    }, [id]);

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
        if (item && !isInCart(item._id)) addToCart({ ...item, selected: true });
        navigate('/checkout');
    };

    const handleAddToCart = () => {
        if (!requireLogin('cart')) return;
        if (isInCart(item._id)) {
            showPopup({ type: 'info', title: 'Already in Cart', message: 'This item is already in your cart.', });
            return;
        }
        addToCart({ ...item, selected: true });
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
        navigate(`/profile?tab=messages&user=${sellerId}`);
    };

    const handleMakeOffer = async () => {
        if (!requireLogin('offer')) return;
        if (!offerAmount || parseFloat(offerAmount) <= 0) return;
        setOfferSending(true);
        try {
            const targetCurrency = currentCurrency || defaultCurrency;
            let rate = targetCurrency?.exchange_rate || 1;
            let baseRate = item.currency_id?.exchange_rate || 1;
            const offerInBaseCurrency = (parseFloat(offerAmount) / rate) * baseRate;

            const msg = `💰 Offer: ${formatPrice(offerInBaseCurrency, item.currency_id)}${offerMsg ? `\n\n${offerMsg}` : ''}`;
            const res = await axios.post('/api/messages', {
                receiver_id: item.seller_id?._id,
                message: msg,
                item_id: item._id,
                message_type: 'offer',
                offer_amount: offerInBaseCurrency
            });
            const convId = res.data.conversation?._id || res.data.conversation_id || res.data._id;
            setOfferModal(false);
            setOfferAmount('');
            setOfferMsg('');
            navigate(`/profile?tab=messages&conversation=${convId}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send offer.');
        } finally {
            setOfferSending(false);
        }
    };

    const handleApplyDiscount = async () => {
        setDiscountError('');
        setDiscountSuccess('');
        const newPrice = parseFloat(discountInput);
        if (isNaN(newPrice) || newPrice <= 0) {
            setDiscountError('Please enter a valid price.');
            return;
        }
        const basePrice = item.original_price > 0 ? item.original_price : item.price;
        if (newPrice >= basePrice) {
            setDiscountError(`New price must be lower than the original price (${formatPrice(basePrice, item.currency_id)}).`);
            return;
        }
        setDiscountApplying(true);
        try {
            await axios.put(`/api/items/${id}/discount`, { discounted_price: newPrice });
            // Re-fetch complete item so seller_id stays populated & isOwnItem stays true
            const res = await axios.get(`/api/items/${id}`);
            setItem(res.data);
            setDiscountInput('');
            const pct = Math.round(((basePrice - newPrice) / basePrice) * 100);
            setDiscountSuccess(`✅ Discount applied! ${pct}% off — new price: ${formatPrice(newPrice, item.currency_id)}`);
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

        try {
            setReportSending(true);
            await axios.post('/api/reports', {
                item_id: id,
                reason: reportReason,
                message: reportMsg
            });
            showPopup('Success', 'Your report has been submitted to the admin for review.', 'success');
            setReportModal(false);
            setReportReason('');
            setReportMsg('');
        } catch (err) {
            showPopup('Error', err.response?.data?.message || 'Failed to submit report. Please try again.', 'error');
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

    const handleImageError = (e) => {
        e.target.style.display = 'none';
    };

    const handleThumbClick = (idx) => {
        setActiveImg(idx);
        setHoveredSide(null);
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
                    <Link to="/products" className="id-btn-primary">{t('item_detail.browse_other')}</Link>
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

    return (
        <div className="id-page">
            <Meta
                title={item.title}
                description={item.description || `Buy ${item.title} on Resale Marketplace.`}
                image={getImageSrc(images[0])}
                type="product"
            />
            <div className="id-container">
                {/* Breadcrumb */}
                <div className="id-breadcrumb" style={{ gridColumn: '1 / -1' }}>
                    <nav className="id-crumbs">
                        <Link to="/">{t('item_detail.home')}</Link>
                        {item.category_id && <><span className="id-crumb-sep">/</span> <Link to={`/products?category=${item.category_id.slug}`}>{safeString(item.category_id.name)}</Link></>}
                        {item.subcategory_id && <><span className="id-crumb-sep">/</span> <Link to={`/products?subcategory=${item.subcategory_id.slug}`}>{safeString(item.subcategory_id.name)}</Link></>}
                        <span className="id-crumb-sep">/</span>
                        <span className="id-crumb-current">{safeString(item.title)}</span>
                    </nav>
                </div>

                <div className="id-main-content-grid">
                    {/* ─── Left Column: Gallery ─── */}
                    <div className="id-gallery-col">
                        <div className="id-gallery-layout">
                            {/* Main Image */}
                            <div className="id-main-img-wrapper" onClick={() => setLightbox(true)}>
                                <img src={getImageSrc(images[displayedImg])} alt={item.title} className="id-main-img" onError={handleImageError} />
                                <div className="id-condition-badge" style={{ backgroundColor: condCfg.color }}>{condLabel}</div>
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
                                                <img src={getImageSrc(img)} alt={`View ${idx + 1}`} className="id-side-img" onError={handleImageError} />
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
                            <h1 className="id-item-title">{safeString(item.title)}</h1>
                            <div className="id-price-row">
                                <div>
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
                            </div>
                        )}

                        {isOwnItem ? (
                            <>
                                <Link to={`/profile?tab=listings`} className="id-btn-edit-item">
                                    <FaEdit /> {t('item_detail.manage_listing')}
                                </Link>

                                {/* ── Seller Discount Panel ── */}
                                {!item.is_sold && item.status !== 'sold' && (
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
                                                Current price: <strong>{formatPrice(item.price, item.currency_id)}</strong> — Enter a lower price below to apply a discount.
                                            </div>
                                        )}

                                        {/* Live preview */}
                                        {discountInput && !isNaN(parseFloat(discountInput)) && parseFloat(discountInput) > 0 && (() => {
                                            const base = item.original_price > 0 ? item.original_price : item.price;
                                            const newP = parseFloat(parseFloat(discountInput).toFixed(2));
                                            if (newP > 0 && newP < base) {
                                                const pct = Math.round(((base - newP) / base) * 100);
                                                return (
                                                    <div style={{ fontSize: '0.82rem', marginBottom: '8px', color: '#16a34a', fontWeight: '600' }}>
                                                        Preview: <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatPrice(base, item.currency_id)}</span> → <span style={{ color: '#ef4444' }}>{formatPrice(newP, item.currency_id)}</span> <span style={{ background: '#ef4444', color: 'white', borderRadius: '4px', padding: '1px 5px', fontSize: '0.72rem' }}>-{pct}% OFF</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={discountInput}
                                                onChange={e => { setDiscountInput(e.target.value); setDiscountError(''); setDiscountSuccess(''); }}
                                                placeholder={`New selling price (below ${formatPrice(item.original_price > 0 ? item.original_price : item.price, item.currency_id)})`}
                                                style={{
                                                    border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px',
                                                    fontSize: '0.9rem', flex: 1, minWidth: '180px', outline: 'none'
                                                }}
                                            />
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
                                {/* Row 1: Buy Now */}
                                <button className="id-btn-buy" style={{ gridColumn: '1 / -1' }} onClick={handleBuyNow}>
                                    <FaShoppingBag /> {t('item_detail.buy_now')}
                                </button>
                                {/* Row 2: Cart + Offer */}
                                {isInCart(item._id) ? (
                                    <Link to="/cart" className="id-btn-in-cart">
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
                                    <Link to={`/seller/${seller._id}`} className="id-seller-avatar-link">
                                        <div className="id-seller-avatar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%', overflow: 'hidden' }}>
                                            <div className="id-seller-avatar-placeholder" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#64748b' }}>
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
                                        <Link to={`/seller/${seller._id}`} className="id-seller-name-link">
                                            <h4 className="id-seller-name">{safeString(seller.username)}</h4>
                                        </Link>
                                        <p className="id-seller-since">
                                            <FaCalendarAlt /> {t('item_detail.member_since')} {memberSinceYear}
                                        </p>
                                        {renderStars(seller.rating_avg, seller.rating_count)}
                                    </div>
                                    <Link to={`/seller/${seller._id}`} className="id-btn-view-profile">
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
                                        <Link to={`/seller/${seller._id}`} className="id-btn-shop-bundles">
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

            {/* ─── Lightbox ─── */}
            {lightbox && (
                <div className="id-lightbox-overlay" onClick={() => { setLightbox(false); setLightboxZoom(false); }}>
                    <button className="id-lightbox-close" onClick={() => { setLightbox(false); setLightboxZoom(false); }}>
                        <FaTimes />
                    </button>
                    <div
                        className={`id-lightbox-img-container ${lightboxZoom ? 'zoomed' : ''}`}
                        onClick={e => { e.stopPropagation(); setLightboxZoom(!lightboxZoom); }}
                        onMouseMove={handleLightboxMouseMove}
                        style={lightboxZoom ? { cursor: 'zoom-out' } : { cursor: 'zoom-in' }}
                    >
                        <img
                            src={getImageSrc(images[activeImg])}
                            alt={item.title}
                            className="id-lightbox-img"
                            style={lightboxZoom ? {
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                transform: 'scale(2.5)'
                            } : {}}
                            draggable={false}
                            onError={handleImageError}
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="id-lightbox-thumbs" onClick={e => e.stopPropagation()}>
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    className={`id-lb-thumb ${i === activeImg ? 'active' : ''}`}
                                    onClick={() => { setActiveImg(i); setLightboxZoom(false); }}
                                >
                                    <img src={getImageSrc(img)} alt={`${i + 1}`} onError={handleImageError} />
                                    <span className="id-lb-thumb-num">{i + 1}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                            <span>{t('item_detail.listed_price')}</span>
                            <strong>{formatPrice(item.price, item.currency_id)}</strong>
                        </div>
                        <div className="id-offer-form">
                            <label className="id-offer-label">{t('item_detail.your_offer')}</label>
                            <div className="id-offer-input-wrap">
                                <span className="id-offer-currency">{(currentCurrency || defaultCurrency)?.symbol || '₹'}</span>
                                <input
                                    type="number"
                                    className="id-offer-input"
                                    placeholder="0.00"
                                    value={offerAmount}
                                    onChange={e => setOfferAmount(e.target.value)}
                                    min="1"
                                    autoFocus
                                />
                            </div>
                            <label className="id-offer-label" style={{ marginTop: '16px' }}>{t('item_detail.optional_msg')}</label>
                            <textarea
                                className="id-offer-textarea"
                                placeholder={t('item_detail.msg_placeholder')}
                                value={offerMsg}
                                onChange={e => setOfferMsg(e.target.value)}
                                rows={3}
                            />
                            <button
                                className="id-offer-submit"
                                onClick={handleMakeOffer}
                                disabled={!offerAmount || parseFloat(offerAmount) <= 0 || offerSending}
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

                        <div className="id-share-grid">
                            <div className="id-share-item" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>
                                <div className="id-share-icon whatsapp"><FaWhatsapp /></div>
                                <span>WhatsApp</span>
                            </div>
                            <div className="id-share-item" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>
                                <div className="id-share-icon facebook"><FaFacebookF /></div>
                                <span>Facebook</span>
                            </div>
                            <div className="id-share-item" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>
                                <div className="id-share-icon twitter"><FaXTwitter /></div>
                                <span>X / Twitter</span>
                            </div>
                            <div className="id-share-item" onClick={() => window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(window.location.href)}`)}>
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
                            <Link to="/register" onClick={() => setLoginPopup(false)}>{t('item_detail.sign_up_free')}</Link>
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
                                className="id-offer-textarea"
                                placeholder="Describe the issue in detail..."
                                value={reportMsg}
                                onChange={e => setReportMsg(e.target.value)}
                                rows={4}
                            />
                            <button
                                className="id-offer-submit"
                                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                                onClick={handleReportSubmit}
                                disabled={!reportReason || !reportMsg || reportSending}
                            >
                                {reportSending ? "Sending..." : "Submit Report"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <PopupComponent />
        </div>
    );
};

export default ItemDetail;
