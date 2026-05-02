import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaStar, FaRegStar, FaStarHalfAlt, FaArrowRight, FaMapMarkerAlt, FaClock, FaTag, FaEdit, FaTrashAlt } from 'react-icons/fa';
import '../../styles/ItemCard.css';
import AuthContext from '../../context/AuthContext';
import WishlistContext from '../../context/WishlistContext';
import CurrencyContext from '../../context/CurrencyContext';

import { getImageUrl, getItemImageUrl, safeString } from '../../utils/constants';

const ItemCard = ({ item, onEdit, onDelete }) => {
    const navigate = useNavigate();
    const { user, mode } = useContext(AuthContext);
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
            navigate('/login');
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
        <Link to={`/items/${item._id}`} onClick={handleCardClick} className={`listing-card ${isFav ? 'is-favorited' : ''} ${onEdit ? 'editable' : ''}`} style={{ textDecoration: 'none', display: 'block', width: '100%', height: '100%', position: 'relative' }}>
            <div className="listing-image-wrapper" style={{ position: 'relative' }}>
                <img 
                    src={imageUrl} 
                    alt={safeString(item.title || item.name)} 
                    className="listing-image" 
                    onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = getImageUrl('images/site/not_found.png');
                    }}
                />

                {/* Favorites Button - SHOW ONLY IF NOT EDITABLE */}
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
                            zIndex: 20, // Increased zIndex to stay above most badges/overlays
                            cursor: 'pointer'
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

                {/* Seller Actions: Edit and Delete (Moved to one corner to avoid overlap) */}
                {onEdit && (
                    <div className="seller-card-actions">
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

                {/* Top Rated Badge (Bottom Left) */}
                {item.isTopRated && <span className="badge-top-rated">TOP RATED</span>}

                {/* Condition Badge (Top Left) */}
                {item.condition && !item.is_sold && item.status !== 'sold' && (
                    <span className="condition-badge">
                        <FaTag style={{ fontSize: '0.6rem' }} />
                        {safeString(item.condition)}
                    </span>
                )}

                {/* Discount Badge */}
                {hasDiscount && (
                    <span className="offer-badge">
                        <FaTag style={{ fontSize: '0.6rem' }} />
                        {percentOff}% OFF
                    </span>
                )}

                {/* SOLD Badge */}
                {(item.is_sold || item.status === 'sold') && (
                    <div className="sold-overlay">
                        <span>SOLD</span>
                    </div>
                )}

                {/* INACTIVE Badge */}
                {item.status === 'inactive' && !item.is_sold && (
                    <div className="inactive-overlay">
                        <span>INACTIVE</span>
                    </div>
                )}
            </div>

            <div className="listing-details">
                {/* Row 1: Title Full Line */}
                <h3 className="listing-title mb-2" title={safeString(item.title || item.name, 'Untitled')}>
                    {safeString(item.title || item.name, 'Untitled')}
                </h3>

                {/* Row 2: Price & Time Ago in same row */}
                <div className="d-flex justify-content-between align-items-end mt-auto">
                    <div className="listing-price d-flex align-items-center gap-1 flex-wrap">
                        {/* Discounted price first — prominent */}
                        <strong style={hasDiscount ? { color: '#ef4444' } : {}}>
                            {formatPrice(item.price, item.currency_id)}
                        </strong>
                        {/* Crossed-out original price to the right */}
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
        </Link>
    );
};

export default ItemCard;
