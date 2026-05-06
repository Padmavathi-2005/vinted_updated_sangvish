'use client';

import React, { useContext, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    FaShoppingCart, FaTrash, FaCheckSquare, FaSquare,
    FaArrowRight, FaTag, FaBoxOpen, FaChevronRight,
    FaShieldAlt, FaTruck, FaLock
} from 'react-icons/fa';
import { useCart } from '@/context/CartContext';
import CurrencyContext from '@/context/CurrencyContext';
import AuthContext from '@/context/AuthContext';
import { getImageUrl, getItemImageUrl, safeString } from '@/utils/constants';
import { usePopup } from '@/components/common/Popup';
import Meta from '@/components/common/Meta';
import '@/app/styles/Cart.css';

const SHIPPING_FEE = 200; // ₹200 temp flat fee

const Cart = () => {
    const navigate = useRouter();
    const { user } = useContext(AuthContext);
    const { formatPrice, currencies } = useContext(CurrencyContext);
    const {
        cartItems, removeFromCart, toggleSelect, selectAll,
        deselectAll, selectedItems, cartCount, removeSelected
    } = useCart();
    const { showPopup, PopupComponent } = usePopup();

    const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);

    // Helper to group items by seller
    const groupedItems = cartItems.reduce((groups, item) => {
        const sellerId = item.seller_id?._id || item.seller_id;
        const sellerName = safeString(item.seller_id?.username) || 'Unknown Seller';
        if (!groups[sellerId]) groups[sellerId] = { items: [], sellerName, seller: item.seller_id };
        groups[sellerId].items.push(item);
        return groups;
    }, {});

    // Calculate bundle-aware totals
    const calculateBundleTotals = () => {
        let subtotal = 0;
        let shippingTotal = 0;
        let discountTotal = 0;

        // Group selected items by seller to calculate shipping and discounts
        const selectedBySeller = selectedItems.reduce((acc, item) => {
            const sid = item.seller_id?._id || item.seller_id;
            if (!acc[sid]) acc[sid] = { items: [], seller: item.seller_id };
            acc[sid].items.push(item);
            return acc;
        }, {});

        Object.values(selectedBySeller).forEach(group => {
            const { items, seller } = group;
            if (items.length === 0) return;

            let groupSubtotalRaw = 0;

            items.forEach(item => {
                // To sum correctly, we must convert each item to a common base (e.g., default currency)
                // We'll simulate the formatPrice logic but without the final target conversion
                let itemPrice = Number(item.price || 0);
                let itemCurrencyId = typeof item.currency_id === 'object' ? item.currency_id?._id : item.currency_id;

                // Find currency for base rate
                let baseRate = 1;
                const found = currencies.find(c => c._id === itemCurrencyId);
                if (found) {
                    baseRate = found.exchange_rate || 1;
                }

                // Convert to "base units" (price / its_rate)
                const baseValue = itemPrice / baseRate;
                subtotal += baseValue;
                groupSubtotalRaw += baseValue;
            });

            // Shipping: One fee per seller unless any item has free shipping
            // Note: SHIPPING_FEE is assumed to be in base currency units for this calculation
            const hasFreeShipping = items.some(i => i.shipping_included);
            if (!hasFreeShipping) {
                shippingTotal += (SHIPPING_FEE / (currencies.find(c => c.code === 'INR')?.exchange_rate || 80));
            }

            // Discount: Check seller bundle discounts
            if (seller && seller.bundle_discounts?.enabled) {
                const count = items.length;
                let pct = 0;
                if (count >= 5) pct = seller.bundle_discounts.five_items;
                else if (count >= 3) pct = seller.bundle_discounts.three_items;
                else if (count >= 2) pct = seller.bundle_discounts.two_items;

                if (pct > 0) {
                    discountTotal += (groupSubtotalRaw * pct) / 100;
                }
            }
        });

        // The final subtotal, shipping, and discount are now in "base units".
        // formatPrice(value) will then convert them to the current user currency.
        return {
            subtotal,
            shippingTotal,
            discountTotal,
            total: subtotal + shippingTotal - discountTotal
        };
    };

    const { subtotal, shippingTotal, discountTotal, total } = calculateBundleTotals();

    const handleRemove = (item) => {
        showPopup({
            type: 'confirm',
            title: 'Remove Item?',
            message: `Remove "${item.title}" from your cart?`,
            confirmText: 'Remove',
            cancelText: 'Keep',
            onConfirm: () => removeFromCart(item._id)
        });
    };

    const handleRemoveSelected = () => {
        if (selectedItems.length === 0) return;
        showPopup({
            type: 'confirm',
            title: `Remove ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}?`,
            message: 'These items will be removed from your cart.',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            onConfirm: removeSelected
        });
    };

    const handleCheckout = () => {
        if (!user) {
            showPopup({ type: 'warning', title: 'Login Required', message: 'Please log in to proceed to checkout.' });
            return;
        }
        if (selectedItems.length === 0) {
            showPopup({ type: 'info', title: 'No Items Selected', message: 'Please select at least one item to checkout.' });
            return;
        }
        router.push('/checkout');
    };

    if (!user) {
        return (
            <div className="cart-page">
                <div className="cart-empty-state">
                    <FaShoppingCart className="cart-empty-icon" />
                    <h2>Login to see your cart</h2>
                    <p>You need to be logged in to manage your shopping cart.</p>
                    <Link href="/login" className="cart-btn-primary">Login</Link>
                </div>
                <PopupComponent />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="cart-page">
                <div className="cart-empty-state">
                    <FaBoxOpen className="cart-empty-icon" />
                    <h2>Your cart is empty</h2>
                    <p>Browse items and add them to your cart to get started.</p>
                    <Link href="/products" className="cart-btn-primary">Browse Products</Link>
                </div>
                <PopupComponent />
            </div>
        );
    }

    return (
        <div className="cart-page">
            
            <div className="cart-container">
                {/* Breadcrumb */}
                <div className="cart-breadcrumb">
                    <Link href="/">Home</Link>
                    <FaChevronRight />
                    <span>Shopping Cart</span>
                </div>

                <div className="cart-header-row">
                    <h1 className="cart-heading">
                        <FaShoppingCart /> Shopping Cart
                        <span className="cart-count-badge">{cartCount}</span>
                    </h1>
                    {selectedItems.length > 1 && (
                        <div className="cart-bundle-badge">
                            <FaTag /> Bundle Discovery: Multiple items from same seller group automatically!
                        </div>
                    )}
                </div>

                <div className="cart-layout">
                    {/* ── Left: Items List Grouped by Seller ── */}
                    <div className="cart-items-panel">
                        {/* Toolbar */}
                        <div className="cart-toolbar">
                            <button
                                className="cart-select-all-btn"
                                onClick={allSelected ? deselectAll : selectAll}
                            >
                                {allSelected
                                    ? <><FaCheckSquare className="cart-check-icon checked" /> Deselect All</>
                                    : <><FaSquare className="cart-check-icon" /> Select All</>
                                }
                            </button>
                            {selectedItems.length > 0 && (
                                <button className="cart-remove-sel-btn" onClick={handleRemoveSelected}>
                                    <FaTrash /> Remove Selected ({selectedItems.length})
                                </button>
                            )}
                        </div>

                        {/* Grouped Items */}
                        <div className="cart-groups-list">
                            {Object.entries(groupedItems).map(([sellerId, group]) => {
                                const selectedInGroup = group.items.filter(i => i.selected);
                                const hasDiscount = group.seller?.bundle_discounts?.enabled && selectedInGroup.length >= 2;

                                return (
                                    <div key={sellerId} className="cart-seller-group">
                                        <div className="cart-group-header">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="cart-group-seller-label">Seller:</span>
                                                <Link href={`/seller/${sellerId}`} className="cart-group-seller-name">{group.sellerName}</Link>
                                                {selectedInGroup.length > 1 && (
                                                    <span className="cart-group-bundle-tag">
                                                        <FaBoxOpen /> Bundle ({selectedInGroup.length} items)
                                                    </span>
                                                )}
                                            </div>
                                            {group.seller?.bundle_discounts?.enabled && (
                                                <div className="cart-group-promo-tag">
                                                    <FaTag /> Bundle discounts available
                                                </div>
                                            )}
                                        </div>

                                        <div className="cart-items-list">
                                            {group.items.map(item => {
                                                const imgUrl = getItemImageUrl(item.images?.[0]);
                                                const isSold = item.is_sold || item.status === 'sold' || item.is_ordered;
                                                return (
                                                    <div
                                                        key={item._id}
                                                        className={`cart-item-row ${item.selected ? 'selected' : ''} ${isSold ? 'sold' : ''}`}
                                                    >
                                                        {/* Checkbox */}
                                                        <button
                                                            className="cart-item-check"
                                                            onClick={() => isSold ? null : toggleSelect(item._id)}
                                                            disabled={isSold}
                                                            aria-label={item.selected ? 'Deselect' : 'Select'}
                                                        >
                                                            {item.selected
                                                                ? <FaCheckSquare className="cart-check-icon checked" />
                                                                : <FaSquare className="cart-check-icon" />
                                                            }
                                                        </button>

                                                        {/* Image */}
                                                        <Link href={`/items/${item.slug || item._id}`} className="cart-item-img-link">
                                                            <img src={imgUrl} alt={safeString(item.title)} className="cart-item-img" style={isSold ? { filter: 'grayscale(100%)' } : {}} />
                                                        </Link>

                                                        {/* Info */}
                                                        <div className="cart-item-info">
                                                            <Link href={`/items/${item.slug || item._id}`} className="cart-item-title">
                                                                {safeString(item.title)}
                                                            </Link>
                                                            <div className="cart-item-meta">
                                                                {item.condition && <span className="cart-meta-chip">{item.condition}</span>}
                                                                {item.size && <span className="cart-meta-chip">Size: {item.size}</span>}
                                                            </div>
                                                            {isSold && (
                                                                <div className="cart-item-sold-tag">
                                                                    ORDERED
                                                                </div>
                                                            )}
                                                            <div className="cart-item-shipping-note">
                                                                {item.shipping_included && <span className="ship-free">Free shipping</span>}
                                                            </div>
                                                        </div>

                                                        {/* Price */}
                                                        <div className="cart-item-price-col">
                                                            <div className="cart-item-price">
                                                                {formatPrice(item.price, item.currency_id)}
                                                            </div>
                                                        </div>

                                                        {/* Remove */}
                                                        <button
                                                            className="cart-item-remove"
                                                            onClick={() => handleRemove(item)}
                                                            aria-label="Remove"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {selectedInGroup.length > 0 && (
                                            <div className="cart-group-footer">
                                                <div className="cart-group-shipping-info">
                                                    <FaTruck />
                                                    {selectedInGroup.some(i => i.shipping_included)
                                                        ? ' Combined shipping: Free'
                                                        : ` Combined shipping: ${formatPrice(SHIPPING_FEE)}`
                                                    }
                                                </div>
                                                {hasDiscount && (
                                                    <div className="cart-group-discount-info">
                                                        <FaTag /> Bundle savings applied!
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right: Order Summary ── */}
                    <aside className="cart-summary-panel">
                        <div className="cart-summary-card">
                            <h2 className="cart-summary-title">Order Summary</h2>

                            <div className="cart-summary-row">
                                <span>Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="cart-summary-row">
                                <span>Combined Shipping</span>
                                <span className={shippingTotal === 0 ? 'cart-free-tag' : ''}>
                                    {shippingTotal === 0 ? 'FREE' : formatPrice(shippingTotal)}
                                </span>
                            </div>
                            {discountTotal > 0 && (
                                <div className="cart-summary-row cart-discount-row">
                                    <span>Bundle Discount</span>
                                    <span>-{formatPrice(discountTotal)}</span>
                                </div>
                            )}

                            <div className="cart-summary-divider" />

                            <div className="cart-summary-row cart-summary-total">
                                <span>To Pay</span>
                                <span>{formatPrice(total)}</span>
                            </div>

                            <button
                                className="cart-checkout-btn"
                                onClick={handleCheckout}
                                disabled={selectedItems.length === 0}
                            >
                                Checkout ({selectedItems.length}) <FaArrowRight />
                            </button>


                            <div className="cart-trust-row">
                                <span><FaShieldAlt /> Buyer Protection</span>
                                <span><FaLock /> Secure Payment</span>
                            </div>
                        </div>

                        {/* Selected Items preview */}
                        {selectedItems.length > 0 && (
                            <div className="cart-selected-preview">
                                <p className="cart-preview-label">Selected Items</p>
                                {selectedItems.map(item => (
                                    <div key={item._id} className="cart-preview-row">
                                        <img
                                            src={getItemImageUrl(item.images?.[0])}
                                            alt={safeString(item.title)}
                                        />
                                        <span className="cart-preview-name">{safeString(item.title)}</span>
                                        <span className="cart-preview-price">{formatPrice(item.price, item.currency_id)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </aside>
                </div>
            </div>
            <PopupComponent />
        </div>
    );
};

export default function CartPage() { return <Cart />; }
