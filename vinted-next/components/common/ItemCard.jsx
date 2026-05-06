import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaHeart, FaRegHeart, FaStar, FaRegStar, FaStarHalfAlt, FaArrowRight, FaMapMarkerAlt, FaClock, FaTag, FaEdit, FaTrashAlt } from 'react-icons/fa';
import '@/app/styles/ItemCard.css';
import AuthContext from '@/context/AuthContext';
import WishlistContext from '@/context/WishlistContext';
import CurrencyContext from '@/context/CurrencyContext';

import { getImageUrl, getItemImageUrl, safeString } from '@/utils/constants';

const ItemCard = ({ item, onEdit, onDelete }) => {
    const router = useRouter();
    const { user, mode, setShowLoginModal } = useContext(AuthContext);
    const { isWishlisted, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
    const { formatPrice } = useContext(CurrencyContext);
    const [localLikes, setLocalLikes] = useState(item.likes_count || 0);

    // Sync local likes if item prop changes
    useEffect(() => {
        setLocalLikes(item.likes_count || 0);
    }, [item.likes_count]);

    // Helper to render stars
    const renderStars = (rating) => {
        const stars = [];
        const score = rating || 0;
        for (let i = 1; i <= 5; i++) {
            if (score >= i) {
                stars.push(<FaStar key={i} className="text-warning" size={10} />);
            } else if (score >= i - 0.5) {
                stars.push(<FaStarHalfAlt key={i} className="text-warning" size={10} />);
            } else {
                stars.push(<FaRegStar key={i} style={{ color: '#cbd5e1' }} size={10} />);
            }
        }
        return <div className="d-flex" style={{ gap: '1px' }}>{stars}</div>;
    };

    // Resolve image URL
    const rawImage = item.images && item.images.length > 0 ? item.images[0] : null;
    const imageUrl = getItemImageUrl(rawImage);

    // Calculate Time Ago & New Status
    const createdAt = new Date(item.created_at || Date.now());
    const now = new Date();
    const diffInSeconds = Math.floor((now - createdAt) / 1000);
    const diffInDays = Math.floor(diffInSeconds / (3600 * 24));
    const diffInHours = Math.floor(diffInSeconds / 3600);

    let timeAgoText = '';
    if (diffInDays === 0) {
        timeAgoText = 'Today';
    } else if (diffInDays === 1) {
        timeAgoText = 'Yesterday';
    } else if (diffInDays < 30) {
        timeAgoText = `${diffInDays} days ago`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        timeAgoText = `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffInDays / 365);
        timeAgoText = `${years} year${years > 1 ? 's' : ''} ago`;
    }

    // "New" Logic: Posted within last 48 hours
    const isNew = diffInHours < 48;

    // Discount Logic
    const hasDiscount = item.original_price > 0 && item.original_price > item.price;
    const percentOff = hasDiscount ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0;

    // Wishlist Logic
    const isFav = isWishlisted(item._id);

    const handleHeartClick = (e) => {
        e.preventDefault(); // Prevent card navigation
        e.stopPropagation();

        // Guard: Prevent liking own items if logged in
        if (user && item.seller_id && String(user._id) === String(item.seller_id._id || item.seller_id)) {
            alert("It's your product! You cannot add it to your wishlist.");
            return;
        }

        if (!user) {
            setShowLoginModal(true);
            return;
        }

        if (isFav) {
            removeFromWishlist(item._id);
            setLocalLikes(prev => Math.max(0, prev - 1));
        } else {
            addToWishlist(item._id);
            setLocalLikes(prev => prev + 1);
        }
    };

    const handleCardClick = (e) => {
        if (onEdit) {
            e.preventDefault();
            e.stopPropagation();
            onEdit(item);
        }
    };

    const isSellerDeleted = item.seller_id && (item.seller_id.is_deleted || item.seller_id.status === 'inactive');

    // Return non-interactive card if seller is deleted
    if (isSellerDeleted) {
        return (
            <div className="listing-card" style={{ display: 'block', width: '100%', height: '100%', position: 'relative', opacity: 0.6, pointerEvents: 'none' }}>
                <div className="listing-image-wrapper" style={{ position: 'relative' }}>
                    <img src={imageUrl} alt={safeString(item.title || item.name)} className="listing-image" style={{ filter: 'grayscale(100%)' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', zIndex: 10 }}>
                        User No Longer Exists
                    </div>
                </div>
                <div className="listing-details">
                    <h3 className="listing-title" style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                        {safeString(item.title, 'Unavailable')}
                    </h3>
                </div>
            </div>
        );
    }

    return (
        <div className={`listing-card ${isFav ? 'is-favorited' : ''} ${onEdit ? 'editable' : ''}`} style={{ display: 'block', width: '100%', height: '100%', position: 'relative' }}>
            {/* Absolute Link Overlay for SEO & Navigation without nested interactive elements */}
            <Link href={`/items/${item.slug || item._id}`} onClick={handleCardClick} style={{ position: 'absolute', inset: 0, zIndex: 5 }} aria-label={safeString(item.title || item.name, 'Item')} />

            <div className="listing-image-wrapper" style={{ position: 'relative' }}>
                <img 
                    src={imageUrl} 
                    alt={safeString(item.title || item.name)} 
                    className="listing-image" 
                    style={(item.is_sold || item.status === 'sold' || item.is_ordered || item.status === 'inactive') ? { filter: 'grayscale(100%)' } : {}}
                    onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = getImageUrl('images/site/not_found.png');
                    }}
                />

                {/* Favorites Button - POSITIONED NATIVELY, Z-INDEX > LINK */}
                {!onEdit && (
                    <button
                        className="favorite-btn"
                        onClick={handleHeartClick}
                        title={isFav ? "Remove from wishlist" : "Add to wishlist"}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            background: 'none',
                            border: 'none',
                            zIndex: 20,
                            cursor: 'pointer',
                            opacity: (item.is_sold || item.status === 'sold' || item.is_ordered || item.status === 'inactive') ? 0.6 : 1
                        }}
                    >
                        {isFav ? <FaHeart style={{ color: '#ef4444', fontSize: '1.2rem' }} /> : <FaRegHeart style={{ color: 'white', fontSize: '1.2rem' }} />}
                        <span style={{
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: '400',
                            textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                        }}>
                            {localLikes} likes
                        </span>
                    </button>
                )}

                {/* Seller Actions: Edit and Delete */}
                {onEdit && (
                    <div className="seller-card-actions" style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 20 }}>
                        <button 
                            className="seller-action-btn edit" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
                            title="Edit Item"
                        >
                            <FaEdit />
                        </button>
                        {onDelete && (
                            <button 
                                className="seller-action-btn delete" 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item); }}
                                title="Delete Item"
                            >
                                <FaTrashAlt />
                            </button>
                        )}
                    </div>
                )}

                {/* Top Rated Badge */}
                {item.isTopRated && <span className="badge-top-rated" style={{ zIndex: 10, position: 'absolute', bottom: '15px', left: '15px' }}>TOP RATED</span>}

                {/* Condition Badge */}
                {item.condition && !item.is_sold && item.status !== 'sold' && !item.is_ordered && (
                    <span className="condition-badge" style={{ zIndex: 10 }}>
                        <FaTag style={{ fontSize: '0.6rem' }} />
                        {safeString(item.condition)}
                    </span>
                )}

                {/* Discount Badge */}
                {hasDiscount && (
                    <span className="offer-badge" style={{ zIndex: 10 }}>
                        <FaTag style={{ fontSize: '0.6rem' }} />
                        {percentOff}% OFF
                    </span>
                )}

                {/* ORDERED Badge */}
                {(item.is_sold || item.status === 'sold' || item.is_ordered) && (
                    <div className="sold-overlay" style={{ zIndex: 10 }}>
                        <span>ORDERED</span>
                    </div>
                )}

                {/* INACTIVE Badge */}
                {item.status === 'inactive' && !item.is_sold && (
                    <div className="inactive-overlay" style={{ zIndex: 10 }}>
                        <span>INACTIVE</span>
                    </div>
                )}
            </div>

            <div className="listing-details">
                <h3 className="listing-title mb-2" title={safeString(item.title || item.name, 'Untitled')}>
                    {safeString(item.title || item.name, 'Untitled')}
                </h3>

                <div className="d-flex justify-content-between align-items-end mt-auto">
                    <div className="listing-price d-flex align-items-center gap-1 flex-wrap">
                        <strong style={hasDiscount ? { color: '#ef4444' } : {}}>
                            {formatPrice(item.price, item.currency_id)}
                        </strong>
                        {hasDiscount && (
                            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '400' }}>
                                {formatPrice(item.original_price, item.currency_id)}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <FaClock style={{ fontSize: '0.6rem', marginRight: '4px' }} />
                        {timeAgoText}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ItemCard;
