'use client';

import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from '@/utils/axios';
import AuthContext from '@/context/AuthContext';
import CurrencyContext from '@/context/CurrencyContext';
import { FaListAlt, FaBoxOpen, FaHeart, FaWallet, FaCheckCircle, FaExclamationTriangle, FaUserEdit, FaAngleLeft, FaAngleRight, FaEnvelope, FaBell, FaTruck, FaClock, FaCreditCard, FaMoneyBillWave, FaBars, FaTimes, FaStar, FaTag, FaLightbulb, FaPlusCircle, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import '@/app/styles/Profile.css';
import EditProfileModal from '@/components/common/EditProfileModal';
import EditItemModal from '@/components/common/EditItemModal';
import ItemCard from '@/components/common/ItemCard';
import SkeletonCard from '@/components/common/SkeletonCard';
import Pagination from '@/components/common/Pagination';
import MessagesContent from '@/components/profile/MessagesContent';
import NotificationsContent from '@/components/profile/NotificationsContent';
import WalletContent from '@/components/profile/WalletContent';
import { useTranslation } from 'react-i18next';
import Meta from '@/components/common/Meta';
import CustomSelect from '@/components/common/CustomSelect';
import { getImageUrl, getItemImageUrl, safeString } from '@/utils/constants';
import { validateTextField, getTextFieldError, validateAlphaField, getAlphaError } from '@/utils/validation';
import OrderTimeline from '@/components/profile/OrderTimeline';
import { printShippingLabel } from '@/utils/shippingLabel';

const ProfileContent = () => {
    const { user, loading, updateUser, logout, mode, toggleMode, setMode } = useContext(AuthContext);
    const { formatPrice } = useContext(CurrencyContext);
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Tab derivation (URL is Source of Truth)
    // searchParams is already similar to URLSearchParams
    const urlTab = searchParams.get('tab');
    const urlMode = searchParams.get('mode');
    
    // Fallback logic for initial load or missing params
    const activeTab = urlTab || localStorage.getItem('profileActiveTab') || 'dashboard';

    // Refs to track previous values to distinguish change sources
    const lastUrlModeRef = React.useRef(urlMode);
    const lastModeRef = React.useRef(mode);

    // Synchronize URL, Context Mode, and Tab Protection
    useEffect(() => {
        // Detect the source of the mode change
        const isUrlModeChange = lastUrlModeRef.current !== urlMode;
        const isContextModeChange = lastModeRef.current !== mode;
        
        lastUrlModeRef.current = urlMode;
        lastModeRef.current = mode;

        let targetMode = mode;
        let targetTab = activeTab;

        if (isUrlModeChange && urlMode && (urlMode === 'buyer' || urlMode === 'seller')) {
            // 1a. URL Change wins (e.g. clicked a specific link)
            if (mode !== urlMode) {
                setMode(urlMode);
                targetMode = urlMode;
            } else {
                targetMode = urlMode;
            }
        } else {
            // 1b. Context Change (e.g. toggle button) or missing URL param wins
            targetMode = mode;
        }

        // 2. Mode-to-Tab Enforcement
        // Instead of redirecting to dashboard, we force the correct mode for these specialty tabs
        if (['listings', 'bundle_settings'].includes(targetTab)) {
            targetMode = 'seller';
        } else if (['favorites'].includes(targetTab)) {
            targetMode = 'buyer';
        }


        // 3. Official URL Synchronization
        // If we don't have a mode in URL, or it doesn't match the determined target
        if (targetTab !== urlTab || targetMode !== urlMode) {
            router.replace(`/profile?tab=${targetTab}&mode=${targetMode}`);
        }

        // 4. Always persist valid tab
        localStorage.setItem('profileActiveTab', targetTab);
    }, [urlTab, urlMode, mode, router, activeTab, setMode]);

    // Reset pagination on tab change
    useEffect(() => {
        setListingsPage(1);
        setFavoritesPage(1);
        setBoughtPage(1);
        setSoldPage(1);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [activeTab]);

    // Pagination state (Permanently set to standard page-based)
    const paginationMode = 'number';


    // Listings State
    const [myListings, setMyListings] = useState([]);
    const [listingsLoading, setListingsLoading] = useState(false);
    const [listingsPage, setListingsPage] = useState(1);
    const [listingsTotalPages, setListingsTotalPages] = useState(1);
    const [listingsTotalCount, setListingsTotalCount] = useState(0);
    const [allListingsCount, setAllListingsCount] = useState(0);

    // Favorites State
    const [favorites, setFavorites] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    const [favoritesPage, setFavoritesPage] = useState(1);
    const [favoritesTotalPages, setFavoritesTotalPages] = useState(1);
    const [favoritesTotalCount, setFavoritesTotalCount] = useState(0);

    // Edit Item State
    const [editingItem, setEditingItem] = useState(null);

    // Orders State
    const [boughtOrders, setBoughtOrders] = useState([]);
    const [soldOrders, setSoldOrders] = useState([]);
    const [boughtPage, setBoughtPage] = useState(1);
    const [soldPage, setSoldPage] = useState(1);
    const [boughtTotalPages, setBoughtTotalPages] = useState(1);
    const [soldTotalPages, setSoldTotalPages] = useState(1);
    const [boughtTotalCount, setBoughtTotalCount] = useState(0);
    const [soldTotalCount, setSoldTotalCount] = useState(0);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [addressForm, setAddressForm] = useState({ full_name: '', address_line: '', city: '', pincode: '', phone: '', state: '', country: '', lat: null, lng: null });
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    
    // Address Autocomplete states for order address edit
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [loadingAddressSuggestions, setLoadingAddressSuggestions] = useState(false);
    const addressSuggestionsRef = React.useRef(null);
    const addressDebounceRef = React.useRef(null);

    const [orderSubTab, setOrderSubTab] = useState('all');
    const [listingsSubTab, setListingsSubTab] = useState('all');
    const [paymentSubTab, setPaymentSubTab] = useState('wallet');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Deep link support for payment subtabs
    const urlSub = searchParams.get('sub');
    useEffect(() => {
        if (urlSub) {
            setPaymentSubTab(urlSub);
        }
    }, [urlSub]);

    // Review state
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHover, setReviewHover] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [existingReview, setExistingReview] = useState(null);
    const [shippingCompanies, setShippingCompanies] = useState([]);
    const [dispatchForm, setDispatchForm] = useState({
        shipping_company_id: '',
        tracking_id: '',
        dispatch_date: new Date().toISOString().split('T')[0]
    });
    const [isDispatching, setIsDispatching] = useState(false);

    // Custom Action Modal State
    const [actionModal, setActionModal] = useState({
        show: false,
        type: '', // 'cancel', 'return', 'refund_partial', 'success', 'error'
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        onConfirm: null,
        inputValue: '',
        inputValue2: '', // for partial refund amount
        isLoading: false
    });

    // Tab label helper
    const getTabLabel = (tab) => {
        const labels = {
            dashboard: t('profile.dashboard'),
            profile_settings: t('user_menu.my_profile'),
            orders: mode === 'seller' ? t('profile.orders_received', 'Orders Received') : t('user_menu.my_orders', 'My orders'),
            listings: t('user_menu.manage_listings', 'Manage listings'),
            favorites: t('profile.favorites'),
            messages: t('user_menu.messages', 'Messages'),
            notifications: t('notifications.title', 'Notifications'),
            payments: t('profile.payment_account', 'Payment & Account'),
            bundle_settings: 'Bundle Discounts'
        };
        return labels[tab] || tab;
    };

    // Derived State
    const currentOrders = mode === 'buyer' ? boughtOrders : soldOrders;

    const filteredOrders = currentOrders.filter(order => {
        if (orderSubTab === 'all') return true;
        if (orderSubTab === 'booked' && (order.order_status === 'pending' || order.order_status === 'placed')) return true;
        if (orderSubTab === 'dispatched' && (order.order_status === 'shipped' || order.order_status === 'dispatched' || order.order_status === 'packed')) return true;
        if (orderSubTab === 'on_the_way' && (order.order_status === 'out_for_delivery' || order.order_status === 'on_the_way')) return true;
        if (orderSubTab === 'returns' && (order.order_status === 'returned' || order.order_status === 'return_requested')) return true;

        return order.order_status === orderSubTab;
    });

    const [paginationModeForced, setPaginationModeForced] = useState(false);

    const handleTabChange = (tab) => {
        let newMode = mode;
        if (['listings', 'bundle_settings'].includes(tab)) {
            newMode = 'seller';
        } else if (['favorites'].includes(tab)) {
            newMode = 'buyer';
        }
        
        router.replace(`/profile?tab=${tab}&mode=${newMode}`);
    };



    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="d-flex align-items-center justify-content-center vh-100 bg-white">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="text-muted fw-500">Syncing your profile...</div>
                </div>
            </div>
        );
    }

    // Body scroll lock
    useEffect(() => {
        if (showOrderModal) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => document.body.classList.remove('modal-open');
    }, [showOrderModal]);


    // Fetch Listings
    const fetchMyListings = useCallback(async (pageNum, isAppend = false) => {
        if (!user) return;
        setListingsLoading(true);
        try {
            const params = { page: pageNum, limit: 12, sort: 'newest' };
            if (listingsSubTab === 'sold') {
                params.is_sold = 'true';
            }
            const res = await axios.get('/api/items/myitems', { params });
            const { items, totalPages, totalCount, total_count } = res.data;
            const currentTotal = totalCount || total_count || 0;
 
            setListingsTotalPages(totalPages);
            setListingsTotalCount(currentTotal);
            
            // Only update the global 'All' count if we are on the 'all' tab
            if (listingsSubTab === 'all') {
                setAllListingsCount(currentTotal);
            }

            if (isAppend) {
                setMyListings(prev => {
                    const existingIds = new Set(prev.map(i => i._id));
                    const uniqueNew = items.filter(i => !existingIds.has(i._id));
                    return [...prev, ...uniqueNew];
                });
            } else {
                setMyListings(items);
            }
        } catch (error) {
            console.error("Error fetching listings:", error);
        } finally {
            setListingsLoading(false);
        }
    }, [user, listingsSubTab]);

    // Fetch Favorites
    const fetchMyFavorites = useCallback(async (pageNum, isAppend = false) => {
        if (!user) return;
        setFavoritesLoading(true);
        try {
            const res = await axios.get('/api/favorites', {
                params: { populate: 'true', page: pageNum, limit: 12 }
            });
            const { items, totalPages, totalCount } = res.data;

            setFavoritesTotalPages(totalPages);
            setFavoritesTotalCount(totalCount);

            if (isAppend) {
                setFavorites(prev => {
                    const existingIds = new Set(prev.map(i => i._id));
                    const uniqueNew = items.filter(i => !existingIds.has(i._id));
                    return [...prev, ...uniqueNew];
                });
            } else {
                setFavorites(items);
            }
        } catch (error) {
            console.error("Error fetching favorites:", error);
        } finally {
            setFavoritesLoading(false);
        }
    }, [user]);


    const fetchMyOrders = useCallback(async () => {
        if (!user) return;
        setOrdersLoading(true);
        try {
            // Fetch both, but we use the relevant page based on current mode for the query
            // In a more complex app, we might fetch them separately, but this maintains consistency
            const currentPage = mode === 'buyer' ? boughtPage : soldPage;
            const res = await axios.get(`/api/orders?page=${currentPage}&limit=10`);
            
            setBoughtOrders(res.data.bought || []);
            setSoldOrders(res.data.sold || []);
            
            if (res.data.pagination) {
                setBoughtTotalPages(res.data.pagination.boughtPages || 1);
                setSoldTotalPages(res.data.pagination.soldPages || 1);
                setBoughtTotalCount(res.data.pagination.boughtTotal || 0);
                setSoldTotalCount(res.data.pagination.soldTotal || 0);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setOrdersLoading(false);
        }
    }, [user, mode, boughtPage, soldPage]); // Restored dependencies for correct page tracking

    const handleOrderAddressSearch = (query) => {
        if (!query || query.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = setTimeout(async () => {
            setLoadingAddressSuggestions(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
                    {
                        headers: {
                            'User-Agent': 'VintedClone/1.0'
                        }
                    }
                );
                const data = await res.json();
                setAddressSuggestions(data || []);
                setShowAddressSuggestions(true);
            } catch (err) {
                console.error("Address search failed:", err);
                setAddressSuggestions([]);
            } finally {
                setLoadingAddressSuggestions(false);
            }
        }, 500);
    };

    const handleAddressSuggestionClick = (suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        const label = suggestion.display_name;

        const addrComp = {
            city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || '',
            state: suggestion.address?.state || '',
            country: suggestion.address?.country || '',
            pincode: suggestion.address?.postcode || ''
        };

        setAddressForm(prev => ({
            ...prev,
            address_line: label,
            city: addrComp.city || prev.city,
            state: addrComp.state || prev.state,
            country: addrComp.country || prev.country,
            pincode: addrComp.pincode || prev.pincode,
            lat,
            lng
        }));

        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
    };

    // Close address suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (addressSuggestionsRef.current && !addressSuggestionsRef.current.contains(e.target)) {
                setShowAddressSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddressUpdate = async (e) => {
        if (e) e.preventDefault();
        try {
            // Custom Validation
            if (addressForm.full_name && !validateAlphaField(addressForm.full_name)) return alert(getAlphaError('Full Name'));
            if (addressForm.city && !validateAlphaField(addressForm.city)) return alert(getAlphaError('City'));
            if (addressForm.state && !validateAlphaField(addressForm.state)) return alert(getAlphaError('State'));
            if (addressForm.country && !validateAlphaField(addressForm.country)) return alert(getAlphaError('Country'));
            if (addressForm.pincode && addressForm.pincode.length < 4) return alert('Pincode should be at least 4 digits');

            // Update order address
            const res = await axios.put(`/api/orders/${selectedOrder._id}/address`, {
                shipping_address: addressForm
            });
            setSelectedOrder(res.data);
            setIsEditingAddress(false);
            fetchMyOrders();

            // Sync with profile address (as requested: "if they provide address then that the user address in this profile page and the form use the same update db crtly")
            const profilePayload = new FormData();
            profilePayload.append('address', JSON.stringify({
                full_name: addressForm.full_name,
                address_line: addressForm.address_line,
                city: addressForm.city,
                state: addressForm.state || '',
                country: addressForm.country || '',
                pincode: addressForm.pincode,
                lat: addressForm.lat,
                lng: addressForm.lng
            }));
            
            await axios.put('/api/users/profile', profilePayload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            
            // Re-fetch profile to keep local user state in sync
            const userRes = await axios.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            updateUser(userRes.data);

            alert('Address updated successfully and saved to your profile.');
        } catch (err) {
            console.error('Error updating address:', err);
            alert(err.response?.data?.message || 'Failed to update address');
        }
    };

    const handleAddressInputChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'pincode') {
            finalValue = value.replace(/\D/g, '').slice(0, 8);
        } else if (name === 'phone') {
            finalValue = value.replace(/[^0-9+]/g, '');
        }

        setAddressForm(prev => ({ ...prev, [name]: finalValue }));
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'PENDING',
            'confirmed': 'CONFIRMED',
            'packed': 'PACKED / DISPATCHED',
            'shipped': 'SHIPPED',
            'out_for_delivery': 'OUT FOR DELIVERY',
            'delivered': 'DELIVERED',
            'cancelled': 'CANCELLED',
            'return_requested': 'RETURN REQUESTED',
            'returned': 'RETURNED'
        };
        // Backwards compatibility for old statuses
        const legacyLabels = {
            'placed': 'PENDING',
            'dispatched': 'SHIPPED',
            'on_the_way': 'OUT FOR DELIVERY'
        };
        return labels[status] || legacyLabels[status] || (status || 'PENDING').toUpperCase().replace(/_/g, ' ');
    };

    const handleCancelOrder = () => {
        setActionModal({
            show: true,
            type: 'cancel',
            title: t('profile.cancel_order_title', 'Cancel Order'),
            message: t('profile.cancel_order_confirm', 'Are you sure you want to cancel this order? You will receive a full refund in your wallet.'),
            confirmLabel: t('profile.confirm_cancel', 'Confirm Cancellation'),
            inputValue: '',
            onConfirm: async (reason) => {
                if (!reason.trim()) return alert('Reason is required for cancellation');
                if (!validateTextField(reason)) return alert(getTextFieldError('Reason'));
                try {
                    await axios.post(`/api/orders/${selectedOrder._id}/cancel`, { reason });
                    fetchMyOrders();
                    setShowOrderModal(false);
                    setActionModal(prev => ({ ...prev, show: false }));
                    // Success pop
                    setTimeout(() => {
                        setActionModal({
                            show: true,
                            type: 'success',
                            title: 'Order Cancelled',
                            message: 'Your order has been cancelled and a full refund was issued to your wallet.',
                            confirmLabel: 'Got it'
                        });
                    }, 300);
                } catch (err) {
                    alert(err.response?.data?.message || 'Failed to cancel order');
                }
            }
        });
    };

    const [returningOrderId, setReturningOrderId] = useState(null);

    const handleRequestReturn = () => {
        setActionModal({
            show: true,
            type: 'return',
            title: 'Request Return',
            message: 'Tell us why you would like to return this item. This will be sent to the seller for review.',
            confirmLabel: 'Submit Request',
            inputValue: '',
            onConfirm: async (reason) => {
                if (!reason.trim()) return alert('Please provide a reason for the return');
                if (!validateTextField(reason)) return alert(getTextFieldError('Reason'));
                setReturningOrderId(selectedOrder._id);
                try {
                    const res = await axios.post(`/api/orders/${selectedOrder._id}/return`, { reason });
                    setSelectedOrder(res.data.order);
                    fetchMyOrders();
                    setActionModal(prev => ({ ...prev, show: false }));
                    // Success pop
                    setTimeout(() => {
                        setActionModal({
                            show: true,
                            type: 'success',
                            title: 'Return Requested',
                            message: 'Your return request has been sent to the seller.',
                            confirmLabel: 'OK'
                        });
                    }, 300);
                } catch (err) {
                    alert(err.response?.data?.message || 'Failed to request return');
                } finally {
                    setReturningOrderId(null);
                }
            }
        });
    };

    const handleProcessReturn = (refundType) => {
        if (refundType === 'partial') {
            setActionModal({
                show: true,
                type: 'refund_partial',
                title: 'Process Partial Refund',
                message: `The buyer will receive a partial refund for their return.`,
                confirmLabel: 'Process Refund',
                inputValue: '', // reason
                inputValue2: '', // amount
                onConfirm: async (reason, amountStr) => {
                    const amount = Number(amountStr);
                    if (!amountStr || isNaN(amount) || amount <= 0 || amount > selectedOrder.total_amount) {
                        return alert("Please enter a valid refund amount");
                    }
                    if (!reason.trim()) return alert("Please provide a reason for the partial refund");
                    if (!validateTextField(reason)) return alert(getTextFieldError('Reason'));

                    try {
                        const res = await axios.post(`/api/orders/${selectedOrder._id}/process-return`, { refundType, amount, reason });
                        setSelectedOrder(res.data.order);
                        fetchMyOrders();
                        setActionModal(prev => ({ ...prev, show: false }));

                        setTimeout(() => {
                            setActionModal({
                                show: true,
                                type: 'success',
                                title: 'Refund Processed',
                                message: `A partial refund of ${formatPrice(amount)} has been issued to the buyer.`,
                                confirmLabel: 'Close'
                            });
                        }, 300);
                    } catch (err) {
                        alert(err.response?.data?.message || 'Failed to process return');
                    }
                }
            });
        } else {
            setActionModal({
                show: true,
                type: 'confirm',
                title: 'Process Full Refund',
                message: `Are you sure you want to issue a full refund of ${formatPrice(selectedOrder.total_amount)} to the buyer? This action cannot be undone.`,
                confirmLabel: 'Confirm Full Refund',
                onConfirm: async () => {
                    try {
                        const res = await axios.post(`/api/orders/${selectedOrder._id}/process-return`, { refundType: 'full', amount: selectedOrder.total_amount, reason: 'Full Refund processed' });
                        setSelectedOrder(res.data.order);
                        fetchMyOrders();
                        setActionModal(prev => ({ ...prev, show: false }));

                        setTimeout(() => {
                            setActionModal({
                                show: true,
                                type: 'success',
                                title: 'Full Refund Issued',
                                message: 'The buyer has been fully refunded and the item has been re-listed.',
                                confirmLabel: 'Got it'
                            });
                        }, 300);
                    } catch (err) {
                        alert(err.response?.data?.message || 'Failed to process refund');
                    }
                }
            });
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        let cancel_reason = '';
        if (newStatus === 'cancelled') {
            setActionModal({
                show: true,
                type: 'cancel',
                title: 'Cancel Order',
                message: 'Are you sure you want to cancel this order?',
                confirmLabel: 'Cancel Order',
                inputValue: '',
                onConfirm: async (cancel_reason) => {
                    if (!cancel_reason.trim()) return alert("Cancel reason is required");
                    if (!validateTextField(cancel_reason)) return alert(getTextFieldError('Reason'));
                    try {
                        const res = await axios.put(`/api/orders/${selectedOrder._id}/status`, {
                            status: newStatus,
                            cancel_reason
                        });
                        setSelectedOrder(res.data);
                        fetchMyOrders();
                        setActionModal(prev => ({ ...prev, show: false }));

                        setTimeout(() => {
                            setActionModal({
                                show: true,
                                type: 'success',
                                title: 'Order Cancelled',
                                message: 'Order has been successfully cancelled and buyer has been notified.',
                                confirmLabel: 'OK'
                            });
                        }, 300);
                    } catch (err) {
                        alert(err.response?.data?.message || 'Failed to cancel order');
                    }
                }
            });
            return;
        }

        try {
            const res = await axios.put(`/api/orders/${selectedOrder._id}/status`, {
                status: newStatus
            });
            setSelectedOrder(res.data);
            fetchMyOrders();
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDispatchOrder = async (e) => {
        if (e) e.preventDefault();

        if (!dispatchForm.shipping_company_id) return alert('Please select a shipping company');
        if (!dispatchForm.tracking_id) return alert('Please enter a tracking ID');

        setIsDispatching(true);
        try {
            const res = await axios.put(`/api/shipping/dispatch/${selectedOrder._id}`, dispatchForm);
            setSelectedOrder(res.data);
            fetchMyOrders();
            alert('Tracking information updated successfully!');
        } catch (err) {
            console.error('Error dispatching order:', err);
            alert(err.response?.data?.message || 'Failed to dispatch order');
        } finally {
            setIsDispatching(false);
        }
    };

    // Fetch Initial Counts
    useEffect(() => {
        if (user && activeTab === 'dashboard') {
            axios.get('/api/items/myitems', { params: { limit: 1 } })
                .then(res => setAllListingsCount(res.data.totalCount || res.data.total_count || 0))
                .catch(() => {});

            axios.get('/api/favorites', { params: { limit: 1 } })
                .then(res => setFavoritesTotalCount(res.data.totalCount || res.data.total_count || 0))
                .catch(() => {});
        }
    }, [user, activeTab, mode]);

    // Trigger Listings Fetch
    useEffect(() => {
        if (activeTab === 'listings') {
            fetchMyListings(listingsPage, false);
        }
    }, [activeTab, listingsPage, fetchMyListings]);

    // Trigger Favorites Fetch
    useEffect(() => {
        if (activeTab === 'favorites') {
            fetchMyFavorites(favoritesPage, false);
        }
    }, [activeTab, favoritesPage, fetchMyFavorites]);

    // Trigger Orders Fetch
    useEffect(() => {
        if (activeTab === 'orders' || activeTab === 'dashboard') {
            fetchMyOrders();
        }
    }, [activeTab, mode, boughtPage, soldPage, fetchMyOrders]);

    // Auto-open order details if orderId is in URL
    useEffect(() => {
        if (!ordersLoading && activeTab === 'orders' && !showOrderModal) {
            const orderId = searchParams.get('orderId');
            if (orderId) {
                const order = [...boughtOrders, ...soldOrders].find(o => o._id === orderId);
                if (order) {
                    setSelectedOrder(order);
                    setShowOrderModal(true);
                    setIsEditingAddress(false);
                    checkExistingReview(order._id);
                    setAddressForm({
                        full_name: order.shipping_address?.full_name || '',
                        address_line: order.shipping_address?.address_line || '',
                        city: order.shipping_address?.city || '',
                        state: order.shipping_address?.state || '',
                        pincode: order.shipping_address?.pincode || '',
                        phone: order.shipping_address?.phone || ''
                    });
                }
            }
        }
    }, [ordersLoading, activeTab, searchParams, boughtOrders, soldOrders, showOrderModal]);

    // Fetch Shipping Companies for Seller
    useEffect(() => {
        if (mode === 'seller' && activeTab === 'orders') {
            const fetchShippingCompanies = async () => {
                try {
                    const res = await axios.get('/api/shipping/companies');
                    setShippingCompanies(res.data);
                } catch (err) {
                    console.error('Error fetching shipping companies:', err);
                }
            };
            fetchShippingCompanies();
        }
    }, [mode, activeTab]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    if (!user) return null;

    const handleNextPage = () => {
        if (activeTab === 'listings' && listingsPage < listingsTotalPages) {
            setListingsPage(p => p + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (activeTab === 'favorites' && favoritesPage < favoritesTotalPages) {
            setFavoritesPage(p => p + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevPage = () => {
        if (activeTab === 'listings' && listingsPage > 1) {
            setListingsPage(p => p - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (activeTab === 'favorites' && favoritesPage > 1) {
            setFavoritesPage(p => p - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Fetch existing review when order modal opens
    const checkExistingReview = async (orderId) => {
        try {
            const res = await axios.get(`/api/reviews/order/${orderId}`);
            if (res.data) {
                setExistingReview(res.data);
                setReviewRating(res.data.rating);
                setReviewComment(res.data.comment || '');
            } else {
                setExistingReview(null);
                setReviewRating(0);
                setReviewComment('');
            }
        } catch (err) {
            setExistingReview(null);
        }
    };

    const handleSubmitReview = async () => {
        if (reviewRating === 0) return alert('Please select a rating');
        if (reviewComment && !validateTextField(reviewComment)) return alert(getTextFieldError('Comment'));
        setReviewSubmitting(true);
        try {
            await axios.post('/api/reviews', {
                order_id: selectedOrder._id,
                rating: reviewRating,
                comment: reviewComment,
            });
            alert('Review submitted! Thank you for your feedback.');
            checkExistingReview(selectedOrder._id);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteAccount = () => {
        if (user?.balance > 0) {
            setActionModal({
                show: true,
                type: 'error',
                title: t('profile.cannot_delete_account', 'Account Deletion Blocked'),
                message: t('profile.balance_remaining_error', 'You have a remaining balance of {{balance}} in your wallet. Please withdraw all funds before deleting your account.', { balance: formatPrice(user?.balance) }),
                confirmLabel: t('common.ok', 'OK')
            });
            return;
        }

        setActionModal({
            show: true,
            type: 'cancel',
            title: t('profile.delete_account', 'Delete Account'),
            message: t('profile.delete_account_confirm', 'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data, listings, and wallet balance will be lost.'),
            confirmLabel: t('profile.delete_my_account', 'Delete My Account'),
            onConfirm: async (reason) => {
                if (!reason.trim()) return alert('Please tell us why you are leaving (reason is required)');
                if (!validateTextField(reason)) return alert(getTextFieldError('Reason'));
                try {
                    await axios.delete('/api/users/delete', { data: { reason } });
                    alert('Your account has been deleted successfully.');
                    logout();
                    router.push('/');
                } catch (err) {
                    alert(err.response?.data?.message || 'Failed to delete account');
                }
            }
        });
    };

    const handleDeleteItem = (item) => {
        setActionModal({
            show: true,
            type: 'cancel',
            title: 'Delete Listing',
            message: `Are you sure you want to permanently delete "${safeString(item.title || item.name)}"? This action cannot be undone and will remove the item from all wishlists.`,
            confirmLabel: 'Confirm Delete',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/items/${item._id}`);
                    setMyListings(prev => prev.filter(it => it._id !== item._id));
                    setListingsTotalCount(prev => Math.max(0, prev - 1));
                    setActionModal({
                        show: true,
                        type: 'success',
                        title: 'Item Deleted',
                        message: 'Product successfully removed from your listings.',
                        confirmLabel: 'OK'
                    });
                } catch (err) {
                    console.error("Error deleting item:", err);
                    alert(err.response?.data?.message || 'Failed to delete item');
                }
            }
        });
    };

    return (
        <div className="profile-dashboard">
            <Meta title={getTabLabel(activeTab)} description="Manage your account, orders, and listings on our marketplace." />
            {/* ─── Mobile Header ─── */}
            <div className="pd-mobile-header">
                <button className="pd-mobile-hamburger" onClick={() => setMobileMenuOpen(true)}>
                    <FaBars />
                </button>
                <span className="pd-mobile-tab-title">{getTabLabel(activeTab)}</span>
                <div
                    className={`pd-mode-toggle-wrapper pd-mode-toggle-mobile ${mode === 'seller' ? 'seller-active' : ''}`}
                    onClick={toggleMode}
                >
                    <div className="pd-mode-toggle-slider" />
                    <div className={`pd-mode-option ${mode === 'buyer' ? 'active' : ''}`}>Buy</div>
                    <div className={`pd-mode-option ${mode === 'seller' ? 'active' : ''}`}>Sell</div>
                </div>
            </div>

            {/* ─── Mobile Drawer ─── */}
            {mobileMenuOpen && <div className="pd-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
            <div className={`pd-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="pd-mobile-drawer-header">
                    <span className="pd-mobile-drawer-title">Menu</span>
                    <button className="pd-mobile-close" onClick={() => setMobileMenuOpen(false)}><FaTimes /></button>
                </div>
                <div className="pd-mobile-drawer-items">
                    {['dashboard', 'profile_settings',
                        ...(mode === 'buyer' ? ['orders', 'favorites'] : ['listings', 'orders', 'bundle_settings']),
                        'messages', 'notifications', 'payments'
                    ].map(tab => (
                        <div
                            key={tab}
                            className={`pd-mobile-drawer-item ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => { handleTabChange(tab); setMobileMenuOpen(false); }}
                        >
                            {getTabLabel(tab)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="pd-container" key={searchParams.toString()}>
                {/* ─── Top Navigation ─── */}
                <div className="pd-header-full">
                    <div className="pd-nav">
                        <div className="pd-nav-items">
                            <div className={`pd-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>{t('profile.dashboard')}</div>
                            <div className={`pd-nav-item ${activeTab === 'profile_settings' ? 'active' : ''}`} onClick={() => handleTabChange('profile_settings')}>{t('user_menu.my_profile')}</div>

                            {mode === 'buyer' && (
                                <>
                                    <div className={`pd-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>{t('user_menu.my_orders', 'My orders')}</div>
                                    <div className={`pd-nav-item ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => handleTabChange('favorites')}>{t('profile.favorites')}</div>
                                </>
                            )}

                            {mode === 'seller' && (
                                <>
                                    <div className={`pd-nav-item ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => handleTabChange('listings')}>{t('user_menu.manage_listings', 'Manage listings')}</div>
                                    <div className={`pd-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>{t('profile.orders_received', 'Orders Received')}</div>
                                    <div className={`pd-nav-item ${activeTab === 'bundle_settings' ? 'active' : ''}`} onClick={() => handleTabChange('bundle_settings')}>Bundle Discounts</div>
                                </>
                            )}

                            <div className={`pd-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => handleTabChange('messages')}>{t('user_menu.messages', 'Messages')}</div>
                            <div className={`pd-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabChange('notifications')}>{t('notifications.title', 'Notifications')}</div>
                            <div className={`pd-nav-item ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => handleTabChange('payments')}>{t('profile.payment_account', 'Payment & Account')}</div>
                        </div>

                        <div
                            className={`pd-mode-toggle-wrapper ${mode === 'seller' ? 'seller-active' : ''}`}
                            onClick={toggleMode}
                            title={`Switch to ${mode === 'buyer' ? 'Seller' : 'Buyer'} Mode`}
                        >
                            <div className="pd-mode-toggle-slider" />
                            <div className={`pd-mode-option ${mode === 'buyer' ? 'active' : ''}`}>{t('user_menu.buyer_mode', 'Buyer')}</div>
                            <div className={`pd-mode-option ${mode === 'seller' ? 'active' : ''}`}>{t('user_menu.seller_mode', 'Seller')}</div>
                        </div>
                    </div>
                </div>

                {/* ─── Sidebar ─── */}
                <div className="pd-sidebar">
                    <div className="pd-card pd-profile-card">
                        <div className="pd-avatar-outer-container">
                            <div className="pd-avatar-wrapper">
                                <div className="pd-avatar-placeholder">
                                    {safeString(user?.username || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                {user.profile_image && (
                                    <img
                                        src={getImageUrl(user.profile_image)}
                                        alt="Profile"
                                        className="pd-avatar"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                            </div>
                            <div className="pd-avatar-upload-icon" onClick={() => handleTabChange('profile_settings')}>
                                <FaUserEdit />
                            </div>
                        </div>
                        <div className="d-grid gap-2 mt-3">
                            <button className="btn btn-outline-danger btn-sm rounded-pill py-2" onClick={logout}>{t('user_menu.logout', 'Logout')}</button>
                        </div>
                        <div className="mt-3 pt-3 border-top">
                            <p className="text-muted extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>{t('profile.account_security', 'Account & Privacy')}</p>
                            <button className="btn btn-link text-danger btn-sm text-decoration-none fw-bold p-0" style={{ fontSize: '0.8rem' }} onClick={handleDeleteAccount}>{t('profile.delete_account', 'Delete Account')}</button>
                        </div>

                        {/* Sub-menu Items (Now inside Profile Card for a cleaner look) */}
                        {activeTab === 'orders' && (
                            <div className="mt-3 pt-3 border-top">
                                <p className="extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>{t('profile.order_status', 'Order Status')}</p>
                                <div className="d-flex flex-column gap-1">
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'all' ? 'active' : ''}`} onClick={() => setOrderSubTab('all')}>{t('profile.all_orders', 'All Orders')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'pending' ? 'active' : ''}`} onClick={() => setOrderSubTab('pending')}>{t('order_status.pending', 'Pending')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'confirmed' ? 'active' : ''}`} onClick={() => setOrderSubTab('confirmed')}>{t('order_status.confirmed', 'Confirmed')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'packed' ? 'active' : ''}`} onClick={() => setOrderSubTab('packed')}>{t('order_status.packed', 'Packed')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'shipped' ? 'active' : ''}`} onClick={() => setOrderSubTab('shipped')}>{t('order_status.shipped', 'Shipped')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'delivered' ? 'active' : ''}`} onClick={() => setOrderSubTab('delivered')}>{t('order_status.delivered', 'Delivered')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'returns' ? 'active' : ''}`} onClick={() => setOrderSubTab('returns')}>{t('order_status.returns', 'Returns')}</div>
                                    <div className={`pd-sidemenu-item ${orderSubTab === 'cancelled' ? 'active' : ''}`} onClick={() => setOrderSubTab('cancelled')}>{t('order_status.cancelled', 'Cancelled')}</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'payments' && (
                            <div className="mt-3 pt-3 border-top">
                                <p className="extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>{t('profile.payment_section', 'Payment Section')}</p>
                                <div className="d-flex flex-column gap-1">
                                    <div className={`pd-sidemenu-item ${paymentSubTab === 'wallet' ? 'active' : ''}`} onClick={() => setPaymentSubTab('wallet')}>{t('profile.wallet', 'Wallet')}</div>
                                    <div className={`pd-sidemenu-item ${paymentSubTab === 'transactions' ? 'active' : ''}`} onClick={() => setPaymentSubTab('transactions')}>{t('profile.transactions', 'Transactions')}</div>
                                    <div className={`pd-sidemenu-item ${paymentSubTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setPaymentSubTab('withdrawals')}>{t('profile.withdraw_requests', 'Withdraw Requests')}</div>
                                    <div className={`pd-sidemenu-item ${paymentSubTab === 'payout-methods' ? 'active' : ''}`} onClick={() => setPaymentSubTab('payout-methods')}>{t('profile.payout_methods', 'Payout Methods')}</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'listings' && (
                            <div className="mt-3 pt-3 border-top text-start">
                                <p className="extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>Listings Summary</p>
                                <div className="d-flex flex-column gap-2">
                                    <div className="small d-flex justify-content-between clickable-sidebar-stat" onClick={() => setListingsSubTab('all')}>
                                        <span>Total Items</span>
                                        <span className="fw-bold" style={{ color: listingsSubTab === 'all' ? 'var(--primary-color)' : 'inherit' }}>{allListingsCount || 0}</span>
                                    </div>
                                    <div className="small d-flex justify-content-between clickable-sidebar-stat" onClick={() => setListingsSubTab('sold')}>
                                        <span>Sold Items</span>
                                        <span className="fw-bold text-success" style={{ textDecoration: listingsSubTab === 'sold' ? 'underline' : 'none' }}>{soldOrders.length || user.sold_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'bundle_settings' && (
                            <div className="mt-3 pt-3 border-top text-start">
                                <p className="extra-small mb-3 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>Bundle Tips</p>
                                <div className="pd-bundle-help-sidebar-card p-3 rounded-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <FaLightbulb className="text-warning" />
                                        <span className="fw-bold small">Seller Tips</span>
                                    </div>
                                    <ul className="ps-3 mb-0 small text-muted" style={{ fontSize: '0.75rem' }}>
                                        <li>Items with discounts get a special badge in search results.</li>
                                        <li className="mt-1">Sellers with bundles enabled sell 3x faster on average.</li>
                                        <li className="mt-1">All bundle items are shipped in a single package.</li>
                                    </ul>
                                </div>
                                <div className="pd-bundle-preview-mini p-3 rounded-3" style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <FaCheckCircle className="text-primary" />
                                        <span className="fw-bold small text-primary">Live Now</span>
                                    </div>
                                    <p className="mb-0 mt-1 text-primary" style={{ fontSize: '0.7rem' }}>Discounts are applied automatically at checkout.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'favorites' && (
                            <div className="mt-3 pt-3 border-top text-start">
                                <p className="extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>FAVORITES SCORE</p>
                                <div className="small d-flex justify-content-between">
                                    <span>Items Saved</span>
                                    <span className="fw-bold text-primary">{favoritesTotalCount}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Main Content ─── */}
                <div className={`pd-main ${['messages', 'notifications'].includes(activeTab) ? 'pd-main-p0' : ''}`}>
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="pd-stats-row">
                                {mode === 'seller' ? (
                                    <>
                                        <div className="pd-stat-card clickable" onClick={() => handleTabChange('listings')}>
                                            <div className="pd-stat-icon blue"><FaListAlt /></div>
                                            <div className="pd-stat-value">{listingsTotalCount}</div>
                                            <div className="pd-stat-label">{t('profile.active_listings')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => handleTabChange('orders')}>
                                            <div className="pd-stat-icon orange"><FaBoxOpen /></div>
                                            <div className="pd-stat-value">{soldOrders.length || user?.sold_count || 0}</div>
                                            <div className="pd-stat-label">{t('profile.orders_received', 'Orders Received')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => handleTabChange('payments')}>
                                            <div className="pd-stat-icon yellow"><FaWallet /></div>
                                            <div className="pd-stat-value">{formatPrice(user?.balance || 0)}</div>
                                            <div className="pd-stat-label">{t('profile.available_balance')}</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="pd-stat-card clickable" onClick={() => handleTabChange('orders')}>
                                            <div className="pd-stat-icon blue"><FaBoxOpen /></div>
                                            <div className="pd-stat-value">{boughtOrders.length || user?.orders_count || 0}</div>
                                            <div className="pd-stat-label">{t('user_menu.my_orders')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => handleTabChange('favorites')}>
                                            <div className="pd-stat-icon purple"><FaHeart /></div>
                                            <div className="pd-stat-value">{(user?.favorites_count !== undefined ? user.favorites_count : favoritesTotalCount) || 0}</div>
                                            <div className="pd-stat-label">{t('profile.favorites')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => handleTabChange('payments')}>
                                            <div className="pd-stat-icon yellow"><FaWallet /></div>
                                            <div className="pd-stat-value">{formatPrice(user?.balance || 0)}</div>
                                            <div className="pd-stat-label">{t('profile.available_balance')}</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pd-section-card">
                                <h3 className="pd-section-title">{t('profile.bio', 'Bio')}</h3>
                                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{safeString(user?.bio) || t('profile.no_bio', 'No bio added yet.')}</p>
                            </div>
                        </>
                    )}

                    {activeTab === 'profile_settings' && (
                        <div className="pd-section-card">
                            <h3 className="pd-section-title mb-3">{t('profile.profile_settings', 'Profile Settings')}</h3>
                            <EditProfileModal user={user} inline={true} onUpdate={updateUser} />
                        </div>
                    )}

                    {activeTab === 'bundle_settings' && (
                        <div className="pd-section-card">
                            <div className="pd-bundle-page-header mb-4">
                                <div className="pd-bundle-icon-main">
                                    <FaTag />
                                </div>
                                <div className="pd-bundle-header-text">
                                    <h3 className="m-0 fw-bold">Bundle Discounts</h3>
                                    <p className="text-muted small m-0">Increase your sales by offering bulk purchase incentives.</p>
                                </div>
                            </div>

                            <div className="pd-bundle-dashboard-layout single-column">
                                <div className="pd-bundle-main-settings">
                                    <div className="pd-bundle-intro-card">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h4 className="h6 fw-bold mb-1">Status</h4>
                                                <p className="text-muted xsmall mb-0">Discounts are currently {user.bundle_discounts?.enabled ? 'active' : 'paused'} for your closet.</p>
                                            </div>
                                            <div className="form-check form-switch pd-mode-toggle-custom">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="bundleEnabled"
                                                    checked={user.bundle_discounts?.enabled || false}
                                                    onChange={(e) => {
                                                        const updated = { ...user.bundle_discounts, enabled: e.target.checked };
                                                        updateUser({ bundle_discounts: updated });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`pd-bundle-config-section ${!(user.bundle_discounts?.enabled) ? 'is-disabled' : ''}`}>
                                        <h5 className="pd-config-title">Set Your Discounts</h5>
                                        <div className="pd-discount-grid">
                                            <div className="pd-discount-item">
                                                <div className="pd-di-label">2 Items</div>
                                                <div className="pd-di-input-wrap">
                                                    <input
                                                        type="number"
                                                        value={user.bundle_discounts?.two_items || 0}
                                                        onChange={(e) => {
                                                            const updated = { ...user.bundle_discounts, two_items: Number(e.target.value) };
                                                            updateUser({ bundle_discounts: updated });
                                                        }}
                                                    />
                                                    <span className="unit">%</span>
                                                </div>
                                            </div>
                                            <div className="pd-discount-item">
                                                <div className="pd-di-label">3 Items</div>
                                                <div className="pd-di-input-wrap">
                                                    <input
                                                        type="number"
                                                        value={user.bundle_discounts?.three_items || 0}
                                                        onChange={(e) => {
                                                            const updated = { ...user.bundle_discounts, three_items: Number(e.target.value) };
                                                            updateUser({ bundle_discounts: updated });
                                                        }}
                                                    />
                                                    <span className="unit">%</span>
                                                </div>
                                            </div>
                                            <div className="pd-discount-item">
                                                <div className="pd-di-label">5+ Items</div>
                                                <div className="pd-di-input-wrap">
                                                    <input
                                                        type="number"
                                                        value={user.bundle_discounts?.five_items || 0}
                                                        onChange={(e) => {
                                                            const updated = { ...user.bundle_discounts, five_items: Number(e.target.value) };
                                                            updateUser({ bundle_discounts: updated });
                                                        }}
                                                    />
                                                    <span className="unit">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-3 border-top d-flex justify-content-end">
                                            <button
                                                className="btn btn-primary px-5 py-2 fw-bold"
                                                style={{ borderRadius: '12px' }}
                                                onClick={async () => {
                                                    try {
                                                        await axios.put('/api/users/profile', { bundle_discounts: user.bundle_discounts });
                                                        alert(t('profile.settings_updated', 'Settings updated successfully!'));
                                                    } catch (err) {
                                                        alert(t('profile.settings_failed', 'Failed to save settings'));
                                                    }
                                                }}
                                            >
                                                {t('profile.update_closet_settings', 'Update closet settings')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'listings' && (
                        <div className="pd-section-card pd-listings-container">
                            <div className="pd-section-header mb-4">
                                <div className="pd-section-title-wrap">
                                    <h2 className="fw-bold m-0" style={{ fontSize: '1.4rem' }}>{t('user_menu.manage_listings', 'Manage listings')}</h2>
                                    <div className="d-flex gap-2 align-items-center mt-1">
                                        <span 
                                            className={`pd-badge-count clickable ${listingsSubTab === 'all' ? 'active' : ''}`}
                                            onClick={() => setListingsSubTab('all')}
                                        >
                                            {allListingsCount || 0} items
                                        </span>
                                        <span 
                                            className={`pd-badge-count clickable sold ${listingsSubTab === 'sold' ? 'active' : ''}`}
                                            onClick={() => setListingsSubTab('sold')}
                                        >
                                            {soldOrders.length || user.sold_count || 0} sold
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex gap-2 align-items-center">
                                    <Link href="/sell" className="btn btn-primary btn-sm px-3 d-flex align-items-center gap-2">
                                        <FaPlusCircle /> {t('profile.add_new_item', 'Add New Item')}
                                    </Link>
                                </div>
                            </div>

                            {/* Debugging Log - Hidden but useful for check */}
                            {console.log("Rendering Listings:", { count: myListings.length, loading: listingsLoading })}

                            <div className="vinted-product-grid mb-4" style={{ minHeight: '300px' }}>
                                {listingsLoading && myListings.length === 0 ? (
                                    [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                                ) : myListings.length > 0 ? (
                                    myListings.map(item => (
                                        <ItemCard
                                            key={item._id}
                                            item={item}
                                            onEdit={(it) => setEditingItem(it)}
                                            onDelete={handleDeleteItem}
                                        />
                                    ))
                                ) : !listingsLoading && (
                                    <div className="w-100 pd-empty-state-full" style={{ gridColumn: '1 / -1', border: 'none' }}>
                                        <div className="pd-empty-illustration">
                                            <div className="pd-empty-blob"></div>
                                            <FaBoxOpen size={48} className="text-muted opacity-50" style={{ position: 'relative', zIndex: 2 }} />
                                        </div>
                                        <h4 className="pd-empty-title">{t('profile.no_listings_yet', "You haven't listed anything yet.")}</h4>
                                        <p className="pd-empty-text">Turn your unused items into cash! Start listing your pre-loved fashion today.</p>
                                        <Link href="/sell" className="btn btn-primary rounded-pill px-4 fw-bold">{t('profile.start_selling_now', 'Start Selling Now')}</Link>
                                    </div>
                                )}
                            </div>

                            {listingsTotalPages > 1 && (
                                <Pagination 
                                    currentPage={listingsPage} 
                                    totalPages={listingsTotalPages} 
                                    onPageChange={setListingsPage} 
                                />
                            )}
                        </div>
                    )}



                    {activeTab === 'favorites' && (
                        <div className="pd-section-card">
                            <div className="pd-section-header mb-4">
                                <div className="pd-section-title-wrap">
                                    <h2 className="fw-bold m-0" style={{ fontSize: '1.4rem' }}>{t('profile.favorites')}</h2>
                                    <span className="pd-badge-count">{favoritesTotalCount || 0} items</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button 
                                        className="btn btn-light btn-sm border d-flex align-items-center gap-2" 
                                        onClick={() => fetchMyFavorites(favoritesPage)}
                                        disabled={favoritesLoading}
                                    >
                                        {favoritesLoading ? (
                                            <div className="spinner-border spinner-border-sm" role="status"></div>
                                        ) : <FaClock />} 
                                        {t('profile.refresh', 'Refresh')}
                                    </button>
                                </div>
                            </div>

                            <div className="vinted-product-grid mb-4">
                                {favoritesLoading && favorites.length === 0 ? (
                                    [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                                ) : favorites.length > 0 ? (
                                    favorites.map(item => (
                                        <ItemCard key={item._id} item={item} />
                                    ))
                                ) : !favoritesLoading && (
                                    <div className="w-100 pd-empty-state-full" style={{ border: 'none', borderTop: 'none', gridColumn: '1 / -1' }}>
                                        <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="130" height="130" rx="65" fill="#FFF7ED" />
                                            <rect x="30" y="52" width="70" height="55" rx="8" fill="#FED7AA" stroke="#F97316" strokeWidth="2" />
                                            <path d="M48 52V44a17 17 0 0134 0v8" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                            <path d="M65 68l2.5 5 5.5.8-4 3.9.95 5.5L65 80.5l-4.95 2.7.95-5.5-4-3.9 5.5-.8z" fill="#FB923C" stroke="#F97316" strokeWidth="1" />
                                            <path d="M88 32c0 0-6-4-6 2a3 3 0 006 0 3 3 0 006 0c0-6-6-2-6-2z" fill="#F43F5E" opacity="0.8" />
                                            <circle cx="38" cy="38" r="3" fill="#FDBA74" />
                                            <circle cx="92" cy="45" r="2" fill="#FCA5A5" />
                                        </svg>
                                        <h4 className="pd-empty-title">{t('profile.wishlist_empty', 'Your Wishlist is Empty')}</h4>
                                        <p className="pd-empty-text">Browse items and tap the heart icon to save your favourites here.</p>
                                        <Link href="/products" className="btn btn-sm px-4 rounded-pill" style={{ background: '#F97316', color: 'white', fontWeight: 600 }}>{t('home.explore_items', 'Browse Items')}</Link>
                                    </div>
                                )}
                            </div>

                            {favoritesTotalPages > 1 && (
                                <Pagination 
                                    currentPage={favoritesPage} 
                                    totalPages={favoritesTotalPages} 
                                    onPageChange={setFavoritesPage} 
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="pd-orders-container">
                            <div className="pd-orders-header mb-4">
                                <div className="pd-orders-header-title">
                                    <h2 className="m-0">
                                        {mode === 'buyer' ? t('user_menu.my_orders', 'My orders') : t('profile.orders_received', 'Orders Received')}
                                        <span className="pd-badge-count">{mode === 'buyer' ? boughtTotalCount : soldTotalCount}</span>
                                    </h2>
                                    <p className="text-muted small m-0">{mode === 'buyer' ? 'Track and manage your purchases' : 'Manage your sales and shipments'}</p>
                                </div>
                                <div className="pd-orders-header-actions">
                                    <div className="pd-orders-filter-wrap">
                                        <CustomSelect
                                            options={[
                                                { value: 'all', label: t('profile.all_orders', 'All Orders') },
                                                { value: 'pending', label: t('order_status.pending', 'Pending') },
                                                { value: 'confirmed', label: t('order_status.confirmed', 'Confirmed') },
                                                { value: 'packed', label: t('order_status.packed', 'Packed') },
                                                { value: 'shipped', label: t('order_status.shipped', 'Shipped') },
                                                { value: 'delivered', label: t('order_status.delivered', 'Delivered') },
                                                { value: 'returns', label: t('order_status.returns', 'Returns') },
                                                { value: 'cancelled', label: t('order_status.cancelled', 'Cancelled') }
                                            ]}
                                            value={orderSubTab}
                                            onChange={(val) => setOrderSubTab(val)}
                                            placeholder="Filter Status"
                                        />
                                    </div>
                                </div>
                            </div>

                            {ordersLoading && filteredOrders.length === 0 ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                </div>
                            ) : filteredOrders.length > 0 ? (
                                <>
                                <div className="pd-orders-grid">
                                    {filteredOrders.map(order => (
                                        <div
                                            key={order._id}
                                            className="pd-order-item-card"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowOrderModal(true);
                                                setIsEditingAddress(false);
                                                checkExistingReview(order._id);
                                                setAddressForm({
                                                    full_name: order.shipping_address?.full_name || '',
                                                    address_line: order.shipping_address?.address_line || '',
                                                    city: order.shipping_address?.city || '',
                                                    state: order.shipping_address?.state || '',
                                                    pincode: order.shipping_address?.pincode || '',
                                                    phone: order.shipping_address?.phone || ''
                                                });
                                            }}
                                        >
                                            <div className="pd-oic-header">
                                                <div className="pd-oic-order-ref">
                                                    <span className="pd-oic-ref-label">Order</span>
                                                    <span className="pd-oic-ref-value">#{order.order_number?.split('-')[1]}</span>
                                                </div>
                                                <div className="pd-oic-order-date">
                                                    {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>

                                            <div className="pd-oic-main">
                                                <div className="pd-oic-image-wrapper">
                                                    <img
                                                        src={getItemImageUrl(order.item_id?.images?.[0])}
                                                        alt={safeString(order.item_id?.title)}
                                                    />
                                                    <div className={`pd-oic-status-badge ${order.order_status || 'placed'}`}>
                                                        {getStatusLabel(order.order_status)}
                                                    </div>
                                                </div>

                                                <div className="pd-oic-body">
                                                    <div className="pd-oic-info">
                                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                                            <h3 className="pd-oic-title">{safeString(order.item_id?.title) || 'Unknown Item'}</h3>
                                                            <div className={`pd-oic-mobile-status ${order.order_status || 'placed'}`}>
                                                                {getStatusLabel(order.order_status)}
                                                            </div>
                                                        </div>
                                                        <div className="pd-oic-participant-mini">
                                                            {mode === 'buyer' ? (
                                                                <>
                                                                    <div className="pd-oic-participant-icon buyer"><FaUserEdit /></div>
                                                                    <span>Seller: <strong>{safeString(order.seller_id?.username)}</strong></span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="pd-oic-participant-icon seller"><FaCheckCircle /></div>
                                                                    <span>Buyer: <strong>{safeString(order.buyer_id?.username)}</strong></span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="pd-oic-financials">
                                                        <div className="pd-oic-price-tag">
                                                            <span className="pd-oic-price-label">Total Amount</span>
                                                            <span className="pd-oic-price-value">{formatPrice(order.total_amount, order.currency_id)}</span>
                                                        </div>
                                                        {order.payment_status === 'paid' && (
                                                            <div className="pd-oic-payment-status paid">
                                                                <FaCheckCircle /> <span>PAID</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pd-oic-footer">
                                                <button className="pd-oic-view-btn">
                                                    <span>View Details</span>
                                                    <FaAngleRight />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {mode === 'buyer' && boughtTotalPages > 1 && (
                                    <div className="mt-4">
                                        <Pagination 
                                            currentPage={boughtPage} 
                                            totalPages={boughtTotalPages} 
                                            onPageChange={setBoughtPage} 
                                        />
                                    </div>
                                )}
                                {mode === 'seller' && soldTotalPages > 1 && (
                                    <div className="mt-4">
                                        <Pagination 
                                            currentPage={soldPage} 
                                            totalPages={soldTotalPages} 
                                            onPageChange={setSoldPage} 
                                        />
                                    </div>
                                )}
                            </>
                            ) : (
                                <div className="pd-empty-state-full">
                                    <div className="pd-empty-icon-circle">
                                        <FaBoxOpen size={40} />
                                    </div>
                                    <h4 className="pd-empty-title">{mode === 'buyer' ? t('profile.no_purchases', 'No Purchases Yet') : t('profile.no_sales', 'No Sales Yet')}</h4>
                                    <p className="pd-empty-text">
                                        {mode === 'buyer'
                                            ? t('profile.no_purchases_text', 'Items you buy will appear here for tracking.')
                                            : t('profile.no_sales_text', 'Items you sell will appear here for management.')}
                                    </p>
                                    {mode === 'buyer' && (
                                        <Link href="/products" className="btn btn-primary px-4 rounded-pill">{t('home.start_shopping', 'Start Shopping')}</Link>
                                    )}
                                </div>
                            )}

                            {/* Order Detail Modal */}
                            {showOrderModal && selectedOrder && (
                                <div className="pd-modal-overlay" onClick={() => setShowOrderModal(false)}>
                                    <div className="pd-modal-content order-detail-modal" onClick={e => e.stopPropagation()}>
                                        <div className="d-flex justify-content-between align-items-start py-3 px-4 border-bottom">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="modal-icon-bg"><FaTruck /></div>
                                                <div>
                                                    <h3 className="m-0 h5 fw-bold">{t('profile.order_details', 'Order Details')}</h3>
                                                    <p className="mb-0 text-muted small">#{selectedOrder.order_number}</p>
                                                </div>
                                            </div>
                                            <button className="btn-close mt-1" onClick={() => setShowOrderModal(false)}></button>
                                        </div>
                                        <div className="pd-modal-body p-4">
                                            <div className="order-detail-grid">
                                                <div className="order-detail-main">
                                                    <div className="order-tracker-container mb-4">
                                                        <h4 className="detail-section-title">{t('profile.delivery_progress', 'Delivery Progress')}</h4>
                                                        <OrderTimeline 
                                                            status={selectedOrder.order_status} 
                                                            history={{
                                                                created_at: selectedOrder.created_at,
                                                                confirmed_at: selectedOrder.confirmed_at,
                                                                packed_at: selectedOrder.packed_at,
                                                                shipped_at: selectedOrder.shipped_at,
                                                                delivered_at: selectedOrder.delivered_at
                                                            }} 
                                                        />
                                                    </div>

                                                    <div className="detail-section mt-5">
                                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <FaTruck className="text-primary" />
                                                                <h4 className="detail-section-title mb-0">{t('profile.shipping_address', 'Shipping Address')}</h4>
                                                            </div>
                                                            {mode === 'buyer' && !['shipped', 'out_for_delivery', 'on_the_way', 'delivered', 'cancelled', 'returned', 'return_requested'].includes(selectedOrder.order_status) && !isEditingAddress && (
                                                                <button
                                                                    className="btn btn-link btn-sm text-primary p-0 text-decoration-none"
                                                                    style={{ fontSize: '0.8rem', fontWeight: 'bold' }}
                                                                    onClick={() => setIsEditingAddress(true)}
                                                                >
                                                                    {t('profile.change', 'Change')}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isEditingAddress ? (
                                                            <form onSubmit={handleAddressUpdate} className="pd-address-edit-form">
                                                                <div className="row g-2">
                                                                    <div className="col-12">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.full_name', 'Full Name')}
                                                                            value={addressForm.full_name}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <div className="position-relative" ref={addressSuggestionsRef}>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-sm"
                                                                                placeholder={t('profile.address_line', 'Address Line')}
                                                                                value={addressForm.address_line}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    setAddressForm({ ...addressForm, address_line: val });
                                                                                    handleOrderAddressSearch(val);
                                                                                }}
                                                                                required
                                                                                autoComplete="off"
                                                                            />
                                                                            {loadingAddressSuggestions && (
                                                                                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 5 }}>
                                                                                    <FaSpinner className="fa-spin" />
                                                                                </div>
                                                                            )}
                                                                            {showAddressSuggestions && addressSuggestions.length > 0 && (
                                                                                <ul className="address-suggestions-dropdown" style={{ 
                                                                                    position: 'absolute', top: '100%', left: 0, right: 0, 
                                                                                    backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px',
                                                                                    listStyle: 'none', padding: 0, margin: '2px 0 0 0', zIndex: 1000,
                                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto'
                                                                                }}>
                                                                                    {addressSuggestions.map((s, i) => (
                                                                                        <li 
                                                                                            key={i} 
                                                                                            onClick={() => handleAddressSuggestionClick(s)}
                                                                                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                                                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                                                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                                                        >
                                                                                            <FaMapMarkerAlt style={{ marginTop: '3px', color: '#64748b', flexShrink: 0 }} />
                                                                                            <span>{s.display_name}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-6">
                                                                        <input
                                                                            type="text"
                                                                            name="city"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.city', 'City')}
                                                                            value={addressForm.city}
                                                                            onChange={handleAddressInputChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-6">
                                                                        <input
                                                                            type="text"
                                                                            name="state"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.state', 'State')}
                                                                            value={addressForm.state}
                                                                            onChange={handleAddressInputChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-6">
                                                                        <input
                                                                            type="text"
                                                                            name="country"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.country', 'Country')}
                                                                            value={addressForm.country}
                                                                            onChange={handleAddressInputChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-6">
                                                                        <input
                                                                            type="text"
                                                                            name="pincode"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.pincode', 'Pincode')}
                                                                            value={addressForm.pincode}
                                                                            onChange={handleAddressInputChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.phone', 'Phone')}
                                                                            value={addressForm.phone}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-2 mt-3">
                                                                    <button type="submit" className="btn btn-primary btn-sm px-3">{t('profile.save', 'Save')}</button>
                                                                    <button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => setIsEditingAddress(false)}>{t('common.cancel', 'Cancel')}</button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <div className="detail-address-card">
                                                                <p className="fw-bold mb-1 text-dark">{safeString(selectedOrder.shipping_address?.full_name)}</p>
                                                                <p className="mb-1">{selectedOrder.shipping_address?.address_line}</p>
                                                                <p className="mb-1">{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} {selectedOrder.shipping_address?.pincode}</p>
                                                                <div className="mt-3 pt-3 border-top d-flex align-items-center gap-2 text-muted small">
                                                                    <FaClock /> {t('profile.phone', 'Phone')}: {selectedOrder.shipping_address?.phone}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="detail-section mt-5">
                                                        <h4 className="detail-section-title mb-3">{t('profile.purchased_item', 'Purchased Item')}</h4>
                                                        <Link 
                                                            href={`/items/${selectedOrder.item_id?.slug || selectedOrder.item_id?._id || selectedOrder.item_id}`}                                                            className="detail-item-card p-3 bg-white border rounded-3 shadow-sm d-block text-decoration-none transition-all hover-shadow-md"
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex align-items-center gap-4">
                                                                <img className="rounded-3 shadow-sm" style={{ width: '80px', height: '80px', objectFit: 'cover' }} src={getItemImageUrl(selectedOrder.item_id?.images?.[0])} alt="" />
                                                                <div className="flex-grow-1">
                                                                    <h5 className="h6 fw-bold mb-1 text-dark">{safeString(selectedOrder.item_id?.title)}</h5>
                                                                    <p className="text-muted extra-small mb-2 fw-bold text-uppercase">
                                                                        {mode === 'buyer' ? `${t('profile.sold_by', 'Sold by:')} ${safeString(selectedOrder.seller_id?.username)}` : `${t('profile.bought_by', 'Bought by:')} ${safeString(selectedOrder.buyer_id?.username)}`}
                                                                    </p>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="badge bg-primary-soft text-primary px-2 py-1 rounded-pill extra-small">Item Price</span>
                                                                        <span className="fw-bold text-dark small">{formatPrice(selectedOrder.item_price, selectedOrder.currency_id)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                      {(selectedOrder.tracking_id || selectedOrder.shipping_company_id || selectedOrder.delivered_at) && (
                                                        <div className="detail-section mt-5">
                                                            <h4 className="detail-section-title mb-3">{t('profile.tracking_info', 'Courier Details')}</h4>
                                                            <div className="p-4 bg-white border rounded-3 shadow-sm tracker-history-box">
                                                                <div className="d-flex justify-content-between mb-2">
                                                                    <span className="text-muted small">Shipping Partner</span>
                                                                    <span className="small fw-bold text-dark">{selectedOrder.shipping_company_id?.company_name || 'Standard Shipping'}</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between mb-4">
                                                                    <span className="text-muted small">Tracking Number</span>
                                                                    <span className="small fw-bold text-dark text-uppercase">{selectedOrder.tracking_id || 'N/A'}</span>
                                                                </div>

                                                                {selectedOrder.shipping_company_id?.tracking_url && selectedOrder.tracking_id && (
                                                                    <a
                                                                        href={selectedOrder.shipping_company_id.tracking_url.replace('%tracking_id%', selectedOrder.tracking_id)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="btn btn-primary btn-sm w-100 fw-bold mt-3 py-2"
                                                                    >
                                                                        {t('profile.track_package', 'Track External Package')}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="order-detail-side">
                                                    <div className="detail-payment-card mb-3">
                                                        <h4 className="detail-section-title">{t('profile.payment_summary', 'Payment Summary')}</h4>
                                                        <div className="payment-row">
                                                            <span>{t('profile.method', 'Method')}</span>
                                                            <span className="badge bg-light text-dark border">{selectedOrder.payment_method?.toUpperCase()}</span>
                                                        </div>
                                                        <div className="payment-row">
                                                            <span>{t('profile.status', 'Status')}</span>
                                                            <span className={`status-pill ${selectedOrder.payment_status}`}>
                                                                {selectedOrder.payment_status === 'paid' ? <FaCheckCircle /> : <FaClock />}
                                                                {selectedOrder.payment_status?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="payment-row">
                                                            <span>{t('profile.order_status', 'Order Status')}</span>
                                                            <span className={`status-pill ${selectedOrder.order_status}`}>
                                                                {getStatusLabel(selectedOrder.order_status)}
                                                            </span>
                                                        </div>
                                                        <div className="payment-row mt-3 border-top pt-3 total">
                                                            <span>{t('profile.paid_total', 'Paid Total')}</span>
                                                            <span>{formatPrice(selectedOrder.total_amount, selectedOrder.currency_id)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Item info moved to main column */}

                                                    {mode === 'buyer' && ['pending', 'confirmed', 'packed'].includes(selectedOrder.order_status) && (
                                                        <div className="pd-section-card mt-3 p-3 bg-light border">
                                                            <h3 className="detail-section-title mb-3">{t('profile.order_actions', 'Order Actions')}</h3>
                                                            <div className="d-grid gap-2">
                                                                <button className="btn btn-outline-danger btn-sm fw-bold" onClick={handleCancelOrder}>{t('profile.cancel_order_refund', 'Cancel Order & Refund')}</button>
                                                            </div>
                                                            <p className="text-muted extra-small mt-2 mb-0">{t('profile.cancel_order_hint', 'Cancel before seller dispatches to get an instant refund.')}</p>
                                                        </div>
                                                    )}

                                                    {selectedOrder.order_status === 'cancelled' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-danger-soft border-danger" style={{ borderLeft: '4px solid #ef4444' }}>
                                                            <h4 className="detail-section-title text-danger mb-2">Order Cancelled</h4>
                                                            <p className="small mb-1"><strong>Reason:</strong> {selectedOrder.cancel_reason || 'N/A'}</p>
                                                            <p className="extra-small text-muted mb-0">Refund of {formatPrice(selectedOrder.total_amount, selectedOrder.currency_id)} has been credited back to the buyer's wallet.</p>
                                                        </div>
                                                    )}

                                                    {mode === 'buyer' && selectedOrder.order_status === 'delivered' && (
                                                        (() => {
                                                            const deliveredAt = selectedOrder.delivered_at;
                                                            if (!deliveredAt) return null;
                                                            const deliveryDate = new Date(deliveredAt);
                                                            const currentDate = new Date();
                                                            const diffTime = Math.abs(currentDate - deliveryDate);
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            
                                                            if (diffDays <= 5) {
                                                                return (
                                                                    <div className="pd-section-card mt-3 p-3 bg-light border">
                                                                        <h3 className="detail-section-title mb-3">Request Return</h3>
                                                                        <p className="text-muted extra-small mt-0 mb-3">You have {6 - diffDays} day(s) left to request a return if the item is not as described.</p>
                                                                        <div className="d-grid gap-2">
                                                                            <button 
                                                                                className="btn btn-outline-warning btn-sm fw-bold" 
                                                                                onClick={handleRequestReturn}
                                                                                disabled={returningOrderId === selectedOrder._id}
                                                                            >
                                                                                {returningOrderId === selectedOrder._id ? 'Processing...' : 'Request Return'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()
                                                    )}

                                                    {mode === 'buyer' && selectedOrder.order_status === 'return_requested' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-warning-soft border-warning" style={{ borderLeft: '4px solid #f59e0b' }}>
                                                            <h4 className="detail-section-title text-warning mb-2">Return Request Sent</h4>
                                                            <p className="small mb-1"><strong>Reason:</strong> {selectedOrder.return_reason || 'N/A'}</p>
                                                            <p className="extra-small text-muted mb-0">The seller has been notified of your return request. Please wait for their approval.</p>
                                                        </div>
                                                    )}

                                                    {mode === 'seller' && selectedOrder.order_status === 'return_requested' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-light border shadow-sm">
                                                            <h4 className="detail-section-title mb-3">Process Return Request</h4>
                                                            <div className="p-3 bg-warning-soft rounded-3 mb-3" style={{ border: '1px solid #fbbf24' }}>
                                                                <p className="small fw-bold mb-1">Buyer's Return Reason:</p>
                                                                <p className="small mb-0 italic">"{selectedOrder.return_reason || 'No reason provided'}"</p>
                                                            </div>
                                                            <p className="text-muted extra-small mt-0 mb-3">Please verify the returned product before processing. You can choose to refund the full amount or a partial amount (e.g. if the item condition changed).</p>
                                                            <div className="d-grid gap-2">
                                                                <button className="btn btn-success btn-sm fw-bold py-2" onClick={() => handleProcessReturn('full')}>Issue Full Refund</button>
                                                                <button className="btn btn-outline-warning btn-sm fw-bold py-2" onClick={() => handleProcessReturn('partial')}>Issue Partial Refund</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedOrder.order_status === 'returned' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-success-soft border-success" style={{ borderLeft: '4px solid #10b981' }}>
                                                            <h4 className="detail-section-title text-success mb-2">Return Completed</h4>
                                                            <p className="small mb-1"><strong>Refunded:</strong> {formatPrice(selectedOrder.refund_amount)}</p>
                                                            <p className="small mb-1"><strong>Processing Note:</strong> {selectedOrder.partial_refund_reason || 'N/A'}</p>
                                                            <p className="extra-small text-muted mb-0">The item has been successfully returned and payment settled.</p>
                                                        </div>
                                                    )}

                                                    {/* Tracking Info for Customer/Seller */}
                                                    {/* Tracking moved to main column */}

                                                    {/* Seller: Update Order Status / Dispatch */}
                                                    {mode === 'seller' && !['delivered', 'cancelled', 'returned'].includes(selectedOrder.order_status) && (
                                                        <div className="pd-section-card mt-3 p-3 bg-white border border-primary shadow-sm" style={{ borderLeftWidth: '4px' }}>
                                                            <h4 className="detail-section-title mb-3 d-flex align-items-center gap-2">
                                                                <FaTruck className="text-primary" />
                                                                {t('profile.shipping_management', 'Order Fulfillment')}
                                                            </h4>

                                                            <div className="mb-4">
                                                                <button 
                                                                    className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-bold"
                                                                    onClick={() => printShippingLabel(selectedOrder, user)}
                                                                >
                                                                    🖨️ {t('profile.print_label', 'Print Shipping Label')}
                                                                </button>
                                                                <p className="xx-small text-muted text-center mt-2">Generate a printable address label for your package.</p>
                                                            </div>

                                                            <div className="d-grid gap-2">
                                                                {/* Confirmed -> Packed */}
                                                                {(['confirmed', 'pending'].includes(selectedOrder.order_status) || !selectedOrder.order_status) && (
                                                                    <button className="btn btn-primary btn-sm fw-bold py-2 mb-2" onClick={() => handleStatusUpdate('packed')}>
                                                                        {t('profile.mark_as_packed', 'Mark as Packed')}
                                                                    </button>
                                                                )}

                                                                {/* Step: Update Tracking Information (Required before Shipping) */}
                                                                {['confirmed', 'packed'].includes(selectedOrder.order_status) && (
                                                                    <div className="mt-1 p-3 bg-light rounded-3 border">
                                                                        <p className="extra-small fw-bold text-primary mb-2 text-uppercase">1. Set Tracking Details</p>
                                                                        <label className="form-label mb-1 extra-small text-muted">{t('profile.courier_company', 'Courier Company')}</label>
                                                                        <CustomSelect
                                                                            options={shippingCompanies.map(comp => ({ value: comp._id, label: comp.company_name }))}
                                                                            value={dispatchForm.shipping_company_id}
                                                                            onChange={(val) => setDispatchForm({ ...dispatchForm, shipping_company_id: val })}
                                                                            placeholder={t('profile.select_courier', '-- Select Courier --')}
                                                                        />

                                                                        <label className="form-label mb-1 extra-small text-muted">{t('profile.tracking_id', 'Tracking ID')}</label>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm mb-3"
                                                                            placeholder="Enter Tracking ID"
                                                                            value={dispatchForm.tracking_id}
                                                                            onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_id: e.target.value })}
                                                                        />

                                                                        <button
                                                                            className="btn btn-info btn-sm w-100 fw-bold py-2 text-white"
                                                                            onClick={handleDispatchOrder}
                                                                            disabled={isDispatching}
                                                                        >
                                                                            {isDispatching ? t('common.processing', 'Processing...') : t('profile.update_tracking', 'Update Tracking Info')}
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Step: Mark as Shipped (Manual update after tracking exists) */}
                                                                {['confirmed', 'packed'].includes(selectedOrder.order_status) && (
                                                                    <div className="mt-3">
                                                                        <p className="extra-small fw-bold text-success mb-2 text-uppercase">2. Confirm Package Handover</p>
                                                                        <button
                                                                            className="btn btn-success btn-sm w-100 fw-bold py-2"
                                                                            onClick={() => {
                                                                                if (!selectedOrder.tracking_id) return alert('Please update tracking information first.');
                                                                                handleStatusUpdate('shipped');
                                                                            }}
                                                                        >
                                                                            {t('profile.mark_as_shipped', 'Confirm Shipped')}
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Shipped -> Out for Delivery */}
                                                                {selectedOrder.order_status === 'shipped' && (
                                                                    <button className="btn btn-primary btn-sm fw-bold py-2" onClick={() => handleStatusUpdate('out_for_delivery')}>
                                                                        {t('profile.mark_out_for_delivery', 'Mark Out for Delivery')}
                                                                    </button>
                                                                )}

                                                                {/* Out for Delivery -> Delivered */}
                                                                {selectedOrder.order_status === 'out_for_delivery' && (
                                                                    <button className="btn btn-success btn-sm fw-bold py-2" onClick={() => handleStatusUpdate('delivered')}>
                                                                        {t('profile.mark_as_delivered', 'Mark as Delivered')}
                                                                    </button>
                                                                )}

                                                                <div className="border-top mt-3 pt-3 text-center">
                                                                    <button className="btn btn-link link-danger btn-sm text-decoration-none fw-bold" onClick={() => handleStatusUpdate('cancelled')}>
                                                                        {t('profile.cancel_order', 'Cancel Order')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {mode === 'buyer' && selectedOrder.order_status === 'delivered' && (
                                                        <div className="pd-review-section mt-3">
                                                            <h4 className="detail-section-title mb-2">
                                                                <FaStar className="text-warning me-2" />
                                                                {t('profile.rate_your_experience', 'Rate Your Experience')}
                                                            </h4>
                                                            <p className="text-muted extra-small mb-3">
                                                                {t('profile.rate_hint', 'Honest reviews help other buyers trust sellers. All items here are pre-owned — your feedback matters!')}
                                                            </p>

                                                            {existingReview ? (
                                                                <div className="pd-review-existing">
                                                                    <div className="pd-review-stars mb-2">
                                                                        {[1, 2, 3, 4, 5].map(star => (
                                                                            <FaStar
                                                                                key={star}
                                                                                className={star <= existingReview.rating ? 'star-filled' : 'star-empty'}
                                                                            />
                                                                        ))}
                                                                        <span className="ms-2 fw-bold">{existingReview.rating}/5</span>
                                                                    </div>
                                                                    {existingReview.comment && (
                                                                        <p className="pd-review-comment">"{existingReview.comment}"</p>
                                                                    )}
                                                                    <p className="text-success extra-small fw-bold mb-0">
                                                                        <FaCheckCircle className="me-1" /> {t('profile.review_submitted', 'Review submitted')}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="pd-review-form">
                                                                    <div className="pd-review-stars-input mb-3">
                                                                        {[1, 2, 3, 4, 5].map(star => (
                                                                            <FaStar
                                                                                key={star}
                                                                                className={star <= (reviewHover || reviewRating) ? 'star-filled' : 'star-empty'}
                                                                                onClick={() => setReviewRating(star)}
                                                                                onMouseEnter={() => setReviewHover(star)}
                                                                                onMouseLeave={() => setReviewHover(0)}
                                                                                style={{ cursor: 'pointer' }}
                                                                            />
                                                                        ))}
                                                                        {reviewRating > 0 && (
                                                                            <span className="ms-2 fw-bold small">{reviewRating}/5</span>
                                                                        )}
                                                                    </div>
                                                                    <textarea
                                                                        className="form-control form-control-sm mb-3"
                                                                        rows="3"
                                                                        placeholder={t('profile.review_placeholder', 'How was the product? Was the seller trustworthy? Share your experience...')}
                                                                        value={reviewComment}
                                                                        onChange={(e) => setReviewComment(e.target.value)}
                                                                    />
                                                                    <button
                                                                        className="btn btn-warning btn-sm w-100 fw-bold"
                                                                        onClick={handleSubmitReview}
                                                                        disabled={reviewSubmitting || reviewRating === 0}
                                                                    >
                                                                        {reviewSubmitting ? t('common.saving', 'Submitting...') : t('profile.submit_review', '⭐ Submit Review')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <button className="btn btn-primary w-100 mt-4 py-2 fw-bold" onClick={() => router.push('/messages')}>
                                                        <FaEnvelope className="me-2" /> {mode === 'buyer' ? t('profile.message_seller', 'Message Seller') : t('profile.message_buyer', 'Message Buyer')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="p-0">
                            <MessagesContent />
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="p-0">
                            <NotificationsContent />
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="p-0">
                            <WalletContent activeSubTab={paymentSubTab} />
                        </div>
                    )}

                </div> {/* End pd-main */}
            </div> {/* End pd-container */}

            {/* Action Modal (Prompt/Confirm Replacement) */}
            {actionModal.show && (
                <div className="pd-modal-overlay" style={{ zIndex: 10001 }}>
                    <div className="pd-modal-card" style={{ maxWidth: '450px', margin: 'auto' }}>
                        <div className="pd-modal-header border-0 pb-0">
                            <h4 className="fw-800 mb-0 d-flex align-items-center gap-2">
                                {['success'].includes(actionModal.type) && <FaCheckCircle className="text-success" />}
                                {['cancel', 'error'].includes(actionModal.type) && <FaExclamationTriangle className="text-danger" />}
                                {actionModal.title}
                            </h4>
                            <button className="btn-close" onClick={() => setActionModal({ ...actionModal, show: false })}></button>
                        </div>
                        <div className="pd-modal-body py-4">
                            <p className="text-muted small mb-4">{actionModal.message}</p>

                            {['cancel', 'return', 'refund_partial'].includes(actionModal.type) && (
                                <div className="mb-3">
                                    {actionModal.type === 'refund_partial' && (
                                        <div className="mb-3">
                                            <label className="extra-small fw-bold text-muted text-uppercase mb-1">Refund Amount</label>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text bg-light">₹</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="0.00"
                                                    value={actionModal.inputValue2}
                                                    onChange={(e) => setActionModal({ ...actionModal, inputValue2: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <label className="extra-small fw-bold text-muted text-uppercase mb-1">
                                        {actionModal.type === 'refund_partial' ? 'Reason for partial refund' : 'Please provide a reason'}
                                    </label>
                                    <textarea
                                        className="form-control form-control-sm"
                                        rows="3"
                                        placeholder="Write here..."
                                        value={actionModal.inputValue}
                                        onChange={(e) => setActionModal({ ...actionModal, inputValue: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="d-flex gap-2 mt-4">
                                {!['success', 'error'].includes(actionModal.type) && (
                                    <button className="btn btn-light flex-fill fw-bold py-2 border" onClick={() => setActionModal({ ...actionModal, show: false })}>
                                        {t('common.cancel', 'Back')}
                                    </button>
                                )}
                                <button
                                    className={`btn btn-${['cancel', 'error'].includes(actionModal.type) ? 'danger' : (['success'].includes(actionModal.type) ? 'success' : 'primary')} flex-fill fw-bold py-2`}
                                    onClick={() => actionModal.onConfirm ? actionModal.onConfirm(actionModal.inputValue, actionModal.inputValue2) : setActionModal({ ...actionModal, show: false })}
                                >
                                    {actionModal.confirmLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <EditItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onUpdate={(updatedItem) => {
                        setMyListings(prev => prev.map(it => it._id === updatedItem._id ? updatedItem : it));
                        setEditingItem(null); // Close the modal after successful update
                    }}
                />
            )}
        </div>
    );
};

export default function Profile() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </React.Suspense>
    );
}
