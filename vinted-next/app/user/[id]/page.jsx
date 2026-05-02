'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/utils/axios';
import {
    FaUser, FaBoxOpen, FaCommentDots, FaStar, FaStarHalfAlt, FaRegStar,
    FaCalendarAlt, FaMapMarkerAlt, FaCheckCircle, FaTimes, FaEnvelope,
    FaSpinner, FaShoppingBag, FaEye, FaEyeSlash
} from 'react-icons/fa';
import AuthContext from '@/context/AuthContext';
import CurrencyContext from '@/context/CurrencyContext';
import ItemCard from '@/components/common/ItemCard';
import SkeletonCard from '@/components/common/SkeletonCard';
import { getImageUrl, safeString } from '@/utils/constants';
import '@/app/styles/SellerProfile.css';
import { useTranslation } from 'react-i18next';
import Meta from '@/components/common/Meta';

const SellerProfile = () => {
    const { id } = useParams();
    const router = useRouter();
    const { user, login } = useContext(AuthContext);
    const { formatPrice } = useContext(CurrencyContext);
    const { t } = useTranslation();

    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productPage, setProductPage] = useState(1);
    const [productTotalPages, setProductTotalPages] = useState(1);

    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    // Login popup state
    const [loginPopup, setLoginPopup] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    
    const handleImageError = (e) => {
        e.target.style.display = 'none';
    };

    // Fetch seller using the public profile endpoint
    useEffect(() => {
        const fetchSeller = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/users/${id}/public`);
                setSeller(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Seller not found or profile unavailable.');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchSeller();
    }, [id]);

    // Fetch products
    useEffect(() => {
        if (!seller) return;
        const fetchProducts = async () => {
            setProductsLoading(true);
            try {
                const res = await axios.get(`/api/items`, {
                    params: { seller_id: id, page: productPage, limit: 12 }
                });
                const data = res.data;
                setProducts(data.items || data || []);
                setProductTotalPages(data.totalPages || 1);
            } catch {
                setProducts([]);
            } finally {
                setProductsLoading(false);
            }
        };
        fetchProducts();
    }, [seller, id, productPage]);

    // Fetch reviews when tab is active
    useEffect(() => {
        if (activeTab !== 'reviews' || !seller) return;
        const fetchReviews = async () => {
            setReviewsLoading(true);
            try {
                const res = await axios.get(`/api/reviews/seller/${id}`);
                setReviews(res.data || []);
            } catch {
                setReviews([]);
            } finally {
                setReviewsLoading(false);
            }
        };
        fetchReviews();
    }, [activeTab, id, seller]);

    const handleMessageClick = () => {
        if (!user) {
            setLoginPopup(true);
            return;
        }
        if ((user.id || user._id) === id) {
            alert('This is your own profile.');
            return;
        }
        // Navigate to messages tab with this seller pre-selected — no auto-send
        router.push(`/profile?tab=messages&user=${id}`);
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await axios.post('/api/users/login', { email: loginEmail, password: loginPassword });
            const userData = res.data;
            if (!userData || !userData.token) throw new Error('Invalid response from server');
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

    const renderStars = (rating, count) => {
        const score = rating || 0;
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (score >= i) stars.push(<FaStar key={i} className="sp-star-filled" />);
            else if (score >= i - 0.5) stars.push(<FaStarHalfAlt key={i} className="sp-star-filled" />);
            else stars.push(<FaRegStar key={i} className="sp-star-empty" />);
        }
        return <div className="sp-stars">{stars}{count !== undefined && <span className="sp-rating-count">({count || 0})</span>}</div>;
    };

    if (loading) return (
        <div className="sp-loading">
            <FaSpinner className="sp-spinner" />
            <p>{t('seller_profile.loading', 'Loading seller profile...')}</p>
        </div>
    );

    if (error || !seller) return (
        <div className="sp-error-page">
            <div className="sp-error-card">
                <FaUser className="sp-error-icon" />
                <h2>{t('seller_profile.not_found_title', 'Seller Not Found')}</h2>
                <p>{error || t('seller_profile.not_found_desc', 'This seller profile is unavailable.')}</p>
                <Link href="/products" className="sp-btn-primary">{t('seller_profile.browse_products', 'Browse Products')}</Link>
            </div>
        </div>
    );

    const memberYear = seller.created_at ? new Date(seller.created_at).getFullYear() : 'N/A';
    const isOwnProfile = user && (user.id === id || user._id === id);

    const navItems = [
        { key: 'products', icon: <FaShoppingBag />, label: t('seller_profile.products', 'Products') },
        { key: 'reviews', icon: <FaStar />, label: t('seller_profile.reviews', 'Reviews') },
        ...(!isOwnProfile ? [{ key: 'message', icon: <FaCommentDots />, label: t('seller_profile.message', 'Message'), action: true }] : []),
    ];

    return (
        <div className="sp-page">
            
            <div className="sp-layout">
                {/* ── Left Sidebar ── */}
                <aside className="sp-sidebar">
                    {/* Avatar */}
                    <div className="sp-avatar-section">
                        <div className="sp-avatar-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%', overflow: 'hidden' }}>
                            <div className="sp-avatar-placeholder" style={{ fontSize: '2.5rem', fontWeight: '800', color: '#64748b' }}>
                                {(seller.name || seller.username || 'S').charAt(0).toUpperCase()}
                            </div>
                            {seller.profile_image && (
                                <img 
                                    src={getImageUrl(seller.profile_image)} 
                                    alt={seller.username} 
                                    className="sp-avatar" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                    onError={handleImageError}
                                />
                            )}
                        </div>
                        <h2 className="sp-seller-name">{safeString(seller.name || seller.username)}</h2>
                        <p className="sp-seller-email">{seller.email || ''}</p>
                        {renderStars(seller.rating_avg, seller.rating_count)}
                        <div className="sp-meta-row">
                            <FaCalendarAlt className="sp-meta-icon" />
                            <span>{t('seller_profile.member_since', 'Member since')} {memberYear}</span>
                        </div>
                        {seller.location && (
                            <div className="sp-meta-row">
                                <FaMapMarkerAlt className="sp-meta-icon" />
                                <span>{seller.location}</span>
                            </div>
                        )}
                        {seller.bio && <p className="sp-bio">{safeString(seller.bio)}</p>}
                    </div>

                    {/* Vertical Nav */}
                    <nav className="sp-nav">
                        {navItems.map(item => (
                            <button
                                key={item.key}
                                className={`sp-nav-item${item.action ? ' sp-nav-msg' : ''}${activeTab === item.key && !item.action ? ' active' : ''}`}
                                onClick={() => {
                                    if (item.action) {
                                        handleMessageClick();
                                    } else {
                                        setActiveTab(item.key);
                                    }
                                }}
                            >
                                <span className="sp-nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Stats */}
                    <div className="sp-stats-box">
                        <div className="sp-stat-row">
                            <span className="sp-stat-label">{t('seller_profile.total_products', 'Total Products')}</span>
                            <span className="sp-stat-value">{products.length || 0}</span>
                        </div>
                        <div className="sp-stat-row">
                            <span className="sp-stat-label">{t('seller_profile.reviews', 'Reviews')}</span>
                            <span className="sp-stat-value">{seller.rating_count || 0}</span>
                        </div>
                        {seller.rating_avg > 0 && (
                            <div className="sp-stat-row">
                                <span className="sp-stat-label">{t('seller_profile.avg_rating', 'Avg. Rating')}</span>
                                <span className="sp-stat-value">{(seller.rating_avg).toFixed(1)} ⭐</span>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Right Content Panel ── */}
                <main className="sp-main">
                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div className="sp-section">
                            <div className="sp-section-header">
                                <h2 className="sp-section-title"><FaShoppingBag /> {t('seller_profile.products_by', 'Products by')} {safeString(seller.name || seller.username)}</h2>
                            </div>
                            {productsLoading ? (
                                <div className="vinted-product-grid mt-4">
                                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                                </div>
                            ) : products.length > 0 ? (
                                <>
                                    <div className="vinted-product-grid mt-4">
                                        {products.map(item => (
                                            <div key={item._id} className="sp-product-card">
                                                <ItemCard item={item} />
                                            </div>
                                        ))}
                                    </div>
                                    {productTotalPages > 1 && (
                                        <div className="sp-pagination">
                                            <button
                                                className="sp-page-btn"
                                                onClick={() => setProductPage(p => Math.max(1, p - 1))}
                                                disabled={productPage === 1}
                                            >{t('common.previous', 'Previous')}</button>
                                            <span className="sp-page-info">{t('common.page', 'Page')} {productPage} {t('common.of', 'of')} {productTotalPages}</span>
                                            <button
                                                className="sp-page-btn"
                                                onClick={() => setProductPage(p => Math.min(productTotalPages, p + 1))}
                                                disabled={productPage === productTotalPages}
                                            >{t('common.next', 'Next')}</button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="sp-empty">
                                    <FaBoxOpen className="sp-empty-icon" />
                                    <p>{t('seller_profile.no_products', 'This seller has no products listed yet.')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reviews Tab */}
                    {activeTab === 'reviews' && (
                        <div className="sp-section">
                            <div className="sp-section-header">
                                <h2 className="sp-section-title"><FaStar /> {t('seller_profile.reviews', 'Reviews')}</h2>
                            </div>
                            {reviewsLoading ? (
                                <div className="sp-tab-loading"><FaSpinner className="sp-spinner" /></div>
                            ) : reviews.length > 0 ? (
                                <div className="sp-reviews-list">
                                    {/* Rating summary */}
                                    {seller.rating_avg > 0 && (
                                        <div className="sp-rating-summary">
                                            <div className="sp-big-score">{(seller.rating_avg).toFixed(1)}</div>
                                            <div className="sp-rating-detail">
                                                {renderStars(seller.rating_avg, seller.rating_count)}
                                                <p>Based on {seller.rating_count} reviews</p>
                                            </div>
                                        </div>
                                    )}
                                    {reviews.map((review, i) => (
                                        <div key={review._id || i} className="sp-review-card">
                                            <div className="sp-review-header">
                                                <div className="sp-reviewer-avatar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <div className="sp-reviewer-placeholder" style={{ fontSize: '1rem', fontWeight: '800', color: '#94a3b8' }}>
                                                        {(review.reviewer?.username || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    {review.reviewer?.profile_image && (
                                                        <img 
                                                            src={getImageUrl(review.reviewer.profile_image)} 
                                                            alt={review.reviewer.username} 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                            onError={handleImageError}
                                                        />
                                                    )}
                                                </div>
                                                <div className="sp-reviewer-info">
                                                    <strong>{safeString(review.reviewer?.name || review.reviewer?.username) || t('seller_profile.anonymous', 'Anonymous')}</strong>
                                                    {renderStars(review.rating)}
                                                </div>
                                                <span className="sp-review-date">
                                                    {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                            {review.comment && <p className="sp-review-comment">{safeString(review.comment)}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Empty — show nothing (just a minimal notice)
                                <div className="sp-empty">
                                    <FaRegStar className="sp-empty-icon" style={{ color: '#e2e8f0' }} />
                                    <p style={{ color: '#94a3b8' }}>{t('seller_profile.no_reviews', 'No reviews yet.')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* ── Login Popup Modal ── */}
            {loginPopup && (
                <div className="sp-login-overlay" onClick={() => setLoginPopup(false)}>
                    <div className="sp-login-modal" onClick={e => e.stopPropagation()}>
                        <button className="sp-login-close" onClick={() => setLoginPopup(false)}>
                            <FaTimes />
                        </button>
                        <div className="sp-login-header">
                            <div className="sp-login-icon"><FaEnvelope /></div>
                            <h2>{t('seller_profile.login_to_message', 'Login to Message')}</h2>
                            <p>{t('seller_profile.sign_in_to_start', 'Sign in to start a conversation with')} {safeString(seller.name || seller.username)}</p>
                        </div>
                        {loginError && <div className="sp-login-error">{loginError}</div>}
                        <form className="sp-login-form" onSubmit={handleLoginSubmit}>
                            <input
                                type="email"
                                className="sp-login-input"
                                placeholder={t('seller_profile.email_address', 'Email address')}
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="sp-login-input"
                                    placeholder={t('seller_profile.password', 'Password')}
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '44px', width: '100%', boxSizing: 'border-box' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(s => !s)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    style={{
                                        position: 'absolute', right: '14px', background: 'none',
                                        border: 'none', padding: 0, cursor: 'pointer',
                                        color: '#94a3b8', fontSize: '1rem', display: 'flex',
                                        alignItems: 'center', lineHeight: 1
                                    }}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <button type="submit" className="sp-login-submit" disabled={loginLoading}>
                                {loginLoading ? t('seller_profile.signing_in', 'Signing in...') : t('seller_profile.sign_in_message', 'Sign In & Message')}
                            </button>
                        </form>
                        <div className="sp-login-footer">
                            <span>{t('seller_profile.no_account', "Don't have an account?")} </span>
                            <Link href="/register" onClick={() => setLoginPopup(false)}>{t('seller_profile.sign_up', 'Sign Up')}</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function SellerProfilePage() {
    return (
        <>
            <SellerProfile />
        </>
    );
}
