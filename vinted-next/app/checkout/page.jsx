'use client';

import React, { useContext, useState, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    FaLock, FaTruck, FaShieldAlt, FaCreditCard,
    FaChevronRight, FaArrowLeft, FaCheckCircle, FaTimes
} from 'react-icons/fa';
import axios from '@/utils/axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/checkout/StripePaymentForm';
import { useCart } from '@/context/CartContext';
import CurrencyContext from '@/context/CurrencyContext';
import AuthContext from '@/context/AuthContext';
import LanguageContext from '@/context/LanguageContext';
import { getImageUrl, getItemImageUrl, safeString } from '@/utils/constants';
import Meta from '@/components/common/Meta';
import { usePopup } from '@/components/common/Popup';
import '@/app/styles/Checkout.css';
import { useTranslation } from 'react-i18next';
import { 
    validateAlphaField, 
    getAlphaError, 
    validateTextField, 
    getTextFieldError 
} from '@/utils/validation';


// Promise to be resolved when settings are fetched
let stripePromise = null;

const SHIPPING_FEE = 200; // In INR (Base currency)

const Checkout = () => {
    const router = useRouter();
    const { user } = useContext(AuthContext);
    const { formatPrice, currentCurrency, defaultCurrency, currencies } = useContext(CurrencyContext);
    const { cartItems, toggleSelect, selectedItems, clearCart } = useCart();
    const { showPopup, PopupComponent } = usePopup();
    const { t, i18n } = useTranslation();
    const { currentLanguage } = useContext(LanguageContext);

    const calculateBundleTotals = () => {
        let subtotal = 0; // In default currency
        let shippingTotal = 0; // In default currency
        let discountTotal = 0; // In default currency

        const getInDefault = (price, currId) => {
            if (!price) return 0;
            if (!defaultCurrency?.exchange_rate) return price;
            
            const targetCurr = currencies.find(c => 
                c._id === (currId?._id || currId) || 
                c.code?.toLowerCase() === (currId?.code || currId || '').toString().toLowerCase()
            );
            
            // If it's 'inr' and not found in list, use rate 1.0 (internal base)
            const itemRate = targetCurr ? targetCurr.exchange_rate : (currId === 'inr' || currId?.code === 'INR' ? 1 : defaultCurrency.exchange_rate);
            
            return (price / itemRate) * defaultCurrency.exchange_rate;
        };

        // Group selected items by seller
        const selectedBySeller = selectedItems.reduce((acc, item) => {
            const sid = item.seller_id?._id || item.seller_id;
            if (!acc[sid]) acc[sid] = { items: [], seller: item.seller_id };
            acc[sid].items.push(item);
            return acc;
        }, {});

        Object.values(selectedBySeller).forEach(group => {
            const { items, seller } = group;
            if (items.length === 0) return;

            // 1. Add item prices to subtotal
            items.forEach(item => {
                subtotal += getInDefault(item.price, item.currency_id);
            });

            // 2. Calculate Combined Shipping (200 INR per seller if not free)
            const anyFreeShipping = items.some(i => i.shipping_included);
            if (!anyFreeShipping) {
                // SHIPPING_FEE in backend is 200 INR
                shippingTotal += getInDefault(200, 'inr');
            }

            // 3. Calculate Bundle Discount
            if (seller && seller.bundle_discounts?.enabled) {
                const count = items.length;
                let pct = 0;
                if (count >= 5) pct = seller.bundle_discounts.five_items;
                else if (count >= 3) pct = seller.bundle_discounts.three_items;
                else if (count >= 2) pct = seller.bundle_discounts.two_items;

                if (pct > 0) {
                    const groupSubtotal = items.reduce((s, i) => s + getInDefault(i.price, i.currency_id), 0);
                    discountTotal += (groupSubtotal * pct) / 100;
                }
            }
        });

        return { subtotal, shippingTotal, discountTotal, total: subtotal + shippingTotal - discountTotal };
    };

    const formatDualPrice = (amount, amountCurrency = defaultCurrency) => {
        const defaultFormatted = formatPrice(amount, amountCurrency, defaultCurrency);
        if (currentCurrency && currentCurrency._id !== defaultCurrency?._id) {
            const currentFormatted = formatPrice(amount, amountCurrency);
            return `${defaultFormatted} (${currentFormatted})`;
        }
        return defaultFormatted;
    };

    const { subtotal, shippingTotal, discountTotal, total } = calculateBundleTotals();

    const commonCountry = useMemo(() => {
        if (selectedItems.length === 0) return '';
        const countries = [...new Set(selectedItems.map(item => item.country || 'India'))];
        return countries.length === 1 ? countries[0] : 'Multiple';
    }, [selectedItems]);

    const [availableMethods, setAvailableMethods] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [stripeError, setStripeError] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [step, setStep] = useState('details'); // 'details' | 'done'
    const [showSuccess, setShowSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [paypalSettings, setPaypalSettings] = useState(null);
    const [paypalLoaded, setPaypalLoaded] = useState(false);
    const [paypalError, setPaypalError] = useState(null);
    const handlePlaceOrderRef = React.useRef(null);

    // Fetch methods and settings on mount
    React.useEffect(() => {
        const fetchPaymentConfigs = async () => {
            try {
                // 1. Fetch settings to get Stripe & PayPal keys
                const settingsRes = await axios.get('/api/settings');
                const settings = settingsRes.data;

                if (settings) {
                    // Stripe Logic
                    const isStripeTest = settings.stripe_test_mode !== false;
                    const stripePubKey = isStripeTest ? settings.stripe_test_public_key : settings.stripe_live_public_key;
                    if (stripePubKey) {
                        stripePromise = loadStripe(stripePubKey);
                    }

                    // PayPal Settings Logic
                    if (settings.paypal_enabled) {
                        const isPaypalTest = settings.paypal_test_mode !== false;
                        const clientId = isPaypalTest ? settings.paypal_test_client_id : settings.paypal_live_client_id;
                        if (clientId) {
                            setPaypalSettings({ clientId, isTest: isPaypalTest });
                        }
                    }
                }

                // 2. Fetch user wallet balance
                let currentBalance = 0;
                try {
                    const walletRes = await axios.get('/api/wallet/me');
                    currentBalance = walletRes.data?.wallet?.balance || 0;
                    setWalletBalance(currentBalance);
                } catch (walletErr) {
                    console.error("Error fetching wallet:", walletErr);
                }

                // 3. Fetch payment methods from dynamic API
                const methodsRes = await axios.get('/api/payments/methods');
                const dbMethods = methodsRes.data || [];
                
                const langCode = currentLanguage?.code || i18n.language || 'en';
                const methods = dbMethods.map(m => {
                    const rawName = m.name?.[langCode] || m.name?.en || m.name || m.key;
                    const rawDesc = m.description?.[langCode] || m.description?.en || m.description || '';
                    
                    let icon = m.icon ? getImageUrl(m.icon) : null;
                    let defaultIcon = <FaShieldAlt />;
                    let finalName = typeof rawName === 'object' ? (rawName.en || rawName[Object.keys(rawName)[0]] || m.key) : rawName;
                    let finalDesc = typeof rawDesc === 'object' ? (rawDesc.en || rawDesc[Object.keys(rawDesc)[0]] || '') : rawDesc;

                    if (m.key === 'wallet') {
                        defaultIcon = <FaShieldAlt style={{ color: '#10b981' }} />;
                        finalName = 'Wallet';
                        finalDesc = ''; 
                    } else if (m.key === 'stripe') {
                        finalName = 'Stripe';
                        if (!icon || icon.includes('undefined') || icon.includes('null') || icon.endsWith('/')) {
                            icon = 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg';
                        }
                        defaultIcon = <FaCreditCard style={{ color: '#6366f1' }} />;
                    } else if (m.key === 'paypal') {
                        finalName = 'PayPal';
                        if (!icon || icon.includes('undefined') || icon.includes('null') || icon.endsWith('/')) {
                            icon = 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg';
                        }
                        defaultIcon = <span style={{ color: '#002f86', fontWeight: 'bold' }}>PayPal</span>;
                    }
                    
                    return {
                        key: m.key,
                        name: finalName,
                        description: finalDesc,
                        icon,
                        defaultIcon
                    };
                });

                // 4. Filter methods: Hide wallet if balance < total
                const filteredMethods = methods.filter(m => {
                    if (m.key === 'wallet') {
                        return currentBalance >= total && total > 0;
                    }
                    return true;
                });

                setAvailableMethods(filteredMethods);
                if (filteredMethods.length > 0) {
                    // Only set default if no valid method is currently selected
                    setPaymentMethod(prev => {
                        const exists = filteredMethods.find(m => m.key === prev);
                        if (exists) return prev;
                        const stripeMethod = filteredMethods.find(m => m.key === 'stripe');
                        return stripeMethod ? 'stripe' : filteredMethods[0].key;
                    });
                }
            } catch (err) {
                console.error("Error fetching payment configuration:", err);
            }
        };
        if (total > 0) {
            fetchPaymentConfigs();
        }
    }, [total, currentLanguage, i18n.language, walletBalance]);

    // Payment Success Sound & Redirect Logic
    React.useEffect(() => {
        if (showSuccess) {
            // Play success sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Sound play blocked:', e));

            // Auto redirect after 3 seconds
            const timer = setTimeout(() => {
                router.push('/profile?tab=orders');
            }, 3500);

            return () => clearTimeout(timer);
        }
    }, [showSuccess, router]);


    // Create PaymentIntent if stripe is selected
    React.useEffect(() => {
        if (paymentMethod === 'stripe' && total > 0) {
            const createIntent = async () => {
                setStripeError(null);
                try {
                    const rate = currentCurrency?.exchange_rate || 1;
                    const baseRate = defaultCurrency?.exchange_rate || 1;
                    const convertedAmount = (total / baseRate) * rate;

                    console.log(`Creating Stripe intent for: ${convertedAmount} ${currentCurrency?.code || 'INR'}`);
                    const res = await axios.post('/api/payments/stripe/create-intent', {
                        amount: convertedAmount,
                        currency: (currentCurrency?.code || 'INR').toLowerCase()
                    });
                    setClientSecret(res.data.clientSecret);
                } catch (err) {
                    console.error("Error creating intent:", err);
                    setClientSecret('');
                    setStripeError(err.response?.data?.message || 'Failed to initialize payment gateway.');
                }
            };
            createIntent();
        }
    }, [paymentMethod, total, currentCurrency?.code, defaultCurrency?._id]);

    // Dedicated PayPal Script Manager
    React.useEffect(() => {
        if (!paypalSettings?.clientId || !currentCurrency?.code || step !== 'details') {
            return;
        }

        const clientId = paypalSettings.clientId;
        const currency = defaultCurrency?.code || 'USD'; // Always use default currency for PayPal
        const scriptId = 'paypal-sdk-v4';
        
        console.log(`[PayPal] Manager triggered for ${currency}. Client ID exists.`);

        let isMounted = true;

        const loadScript = () => {
            const existingScript = document.getElementById(scriptId);
            
            if (existingScript && existingScript.getAttribute('data-curr') === currency) {
                if (window.paypal) {
                    setPaypalLoaded(true);
                    setPaypalError(null);
                } else {
                    existingScript.onload = () => isMounted && setPaypalLoaded(true);
                }
                return;
            }

            if (existingScript) existingScript.remove();
            
            setPaypalLoaded(false);
            setPaypalError(null);

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`;
            script.async = true;
            script.setAttribute('data-curr', currency);
            
            script.onload = () => {
                if (isMounted) {
                    console.log(`PayPal SDK (${currency}) loaded`);
                    setPaypalLoaded(true);
                }
            };
            
            script.onerror = () => {
                if (isMounted) {
                    setPaypalError("PayPal could not be loaded. Please check your connection.");
                }
            };

            document.body.appendChild(script);
        };

        loadScript();

        return () => { isMounted = false; };
    }, [paypalSettings?.clientId, defaultCurrency?.code, step]); // Use defaultCurrency code for PayPal script

    // Handle PayPal buttons initialization
    React.useEffect(() => {
        if (paymentMethod === 'paypal' && paypalLoaded && step === 'details' && total > 0) {
            const container = document.getElementById('paypal-button-container');
            if (container) {
                // Clear container for fresh render if it was destroyed or needs update
                container.innerHTML = ''; 
                
                try {
                    const buttons = window.paypal.Buttons({
                        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
                        createOrder: (data, actions) => {
                            return actions.order.create({
                                purchase_units: [{
                                    amount: {
                                        currency_code: defaultCurrency?.code || 'USD',
                                        value: total.toFixed(2).toString() // total is already in default currency
                                    },
                                    description: `Purchase on ${window.location.hostname}`
                                }]
                            });
                        },
                        onApprove: async (data, actions) => {
                            const details = await actions.order.capture();
                            console.log('PayPal Payment Approved:', details);
                            if (handlePlaceOrderRef.current) {
                                handlePlaceOrderRef.current(null, details.id);
                            }
                        },
                        onError: (err) => {
                            console.error('PayPal Error:', err);
                            // Only set error if it's not a zoid destruction (which happens on nav)
                            if (err?.message?.includes('destroyed')) return;
                            setStripeError('PayPal checkout process failed. Please try again.');
                        }
                    });

                    if (buttons.isEligible()) {
                        buttons.render('#paypal-button-container');
                    } else {
                        setStripeError('PayPal is unavailable for this currency/transaction.');
                    }
                } catch (renderErr) {
                    console.error('PayPal Render Error:', renderErr);
                }
            }
        }
    }, [paymentMethod, paypalLoaded, total, step, defaultCurrency?.code]); // handlePlaceOrder removed to prevent flicker

    const [form, setForm] = useState({
        full_name: user?.address?.full_name || user?.username || '',
        phone: user?.phone || '',
        address_line: user?.address?.address_line || '',
        city: user?.address?.city || '',
        state: user?.address?.state || '',
        country: commonCountry !== 'Multiple' ? commonCountry : (user?.address?.country || 'India'),
        pincode: user?.address?.pincode || ''
    });

    // Update country if commonCountry changes (and not multiple)
    React.useEffect(() => {
        if (commonCountry && commonCountry !== 'Multiple') {
            setForm(f => ({ ...f, country: commonCountry }));
        }
    }, [commonCountry]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let sanitizedValue = value;

        if (name === 'pincode') {
            sanitizedValue = value.replace(/\D/g, '').slice(0, 8); // Numeric only, max 8
        } else if (name === 'phone') {
            // Allow only + and numbers, no letters
            sanitizedValue = value.replace(/[^0-9+]/g, '');
            // Ensure + is only at the beginning
            if (sanitizedValue.indexOf('+') > 0) {
                sanitizedValue = sanitizedValue.replace(/\+/g, '');
                if (value.startsWith('+')) sanitizedValue = '+' + sanitizedValue;
            }
        }

        setForm(f => ({ ...f, [name]: sanitizedValue }));
        
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const validateForm = React.useCallback(() => {
        const errors = {};
        const required = ['full_name', 'phone', 'address_line', 'city', 'pincode'];

        required.forEach(field => {
            if (!form[field] || form[field].trim() === '') {
                errors[field] = 'Required';
            }
        });

        // Alphabetical Validations
        if (form.full_name && !validateAlphaField(form.full_name)) {
            errors.full_name = getAlphaError('Full Name');
        }
        if (form.city && !validateAlphaField(form.city)) {
            errors.city = getAlphaError('City');
        }
        if (form.state && !validateAlphaField(form.state)) {
            errors.state = getAlphaError('State');
        }
        if (form.country && !validateAlphaField(form.country)) {
            errors.country = getAlphaError('Country');
        }

        // Phone Validation (at least 10 digits, optional + at start)
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (form.phone && !phoneRegex.test(form.phone)) {
            errors.phone = 'Invalid phone format (e.g. +919876543210)';
        }

        // Pincode Validation (5-8 digits)
        if (form.pincode && (form.pincode.length < 5 || form.pincode.length > 8)) {
            errors.pincode = 'Invalid pincode';
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            const firstError = Object.keys(errors)[0];
            const element = document.getElementsByName(firstError)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
            return false;
        }
        return true;
    }, [form]);

    const handlePlaceOrder = React.useCallback(async (e, stripePaymentId = null) => {
        if (e) e.preventDefault();

        if (commonCountry === 'Multiple') {
            showPopup({ 
                type: 'error', 
                title: 'International Shipping', 
                message: 'Items in your cart are from different countries. Please checkout items from the same country separately.' 
            });
            return;
        }

        if (!validateForm()) return;

        if (selectedItems.length === 0) {
            showPopup({ type: 'info', title: 'Empty Cart', message: 'No items selected to checkout.' });
            return;
        }

        if ((paymentMethod === 'stripe' || paymentMethod === 'paypal') && !stripePaymentId) {
            // These methods handle their own capture flow; 
            // handlePlaceOrder should only proceed after capture (when stripePaymentId is present)
            return;
        }

        setPlacing(true);

        try {
            await axios.post('/api/orders', {
                items: selectedItems,
                payment_method: paymentMethod,
                shipping_address: form,
                stripe_payment_id: stripePaymentId
            });
            setPlacing(false);
            setShowSuccess(true);
            setStep('done');
            clearCart();
        } catch (err) {
            console.error(err);
            setPlacing(false);
            showPopup({
                type: 'error',
                title: 'Order Failed',
                message: err.response?.data?.message || 'There was an error placing your order.'
            });
        }
    }, [validateForm, selectedItems, paymentMethod, form, showPopup, clearCart]);

    // Keep ref updated for PayPal callbacks to prevent button re-rendering on every keystroke
    React.useEffect(() => {
        handlePlaceOrderRef.current = handlePlaceOrder;
    });

    const stripeOptions = useMemo(() => {
        if (!clientSecret) return null;
        return {
            clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#6366f1',
                },
            },
        };
    }, [clientSecret]);

    if (!user) {
        router.push('/login');
        return null;
    }

    if (selectedItems.length === 0 && !showSuccess) {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <FaShieldAlt />
                    <h2>{t('checkout.nothing_to_checkout')}</h2>
                    <p>{t('checkout.select_items_first')}</p>
                    <Link href="/cart" className="checkout-back-link">← {t('checkout.back_to_cart')}</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <Meta title="Checkout" description="Complete your purchase securely on our marketplace." />
            <div className="checkout-container">
                <div className="checkout-breadcrumb">
                    <Link href="/">{t('checkout.home')}</Link><FaChevronRight />
                    <Link href="/cart">{t('checkout.cart')}</Link><FaChevronRight />
                    <span>{t('checkout.checkout_title')}</span>
                </div>

                <div className="checkout-header">
                    <button className="checkout-back-btn" onClick={() => router.push('/cart')}>
                        <FaArrowLeft /> {t('checkout.back_to_cart')}
                    </button>
                    <h1 className="checkout-title">{t('checkout.checkout_title')} <FaLock className="checkout-lock-icon" /></h1>
                </div>

                <div className="checkout-layout">
                    <div className="checkout-form-col">
                        <div className="checkout-section">
                            <h2 className="checkout-section-title"><FaTruck /> {t('checkout.shipping_address')}</h2>
                            <div className="checkout-grid-2">
                                <div className={`checkout-field ${fieldErrors.full_name ? 'error' : ''}`}>
                                    <label>{t('checkout.full_name')}</label>
                                    <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="John Doe" required />
                                    {fieldErrors.full_name && <span className="field-error-text">{fieldErrors.full_name}</span>}
                                </div>
                                <div className={`checkout-field ${fieldErrors.phone ? 'error' : ''}`}>
                                    <label>{t('checkout.phone_number')}</label>
                                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+919876543210" required />
                                    {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
                                </div>
                            </div>
                            <div className={`checkout-field ${fieldErrors.address_line ? 'error' : ''}`}>
                                <label>{t('checkout.street_address')}</label>
                                <input name="address_line" value={form.address_line} onChange={handleChange} placeholder="123 Main Street, Apt 4B" required />
                                {fieldErrors.address_line && <span className="field-error-text">{fieldErrors.address_line}</span>}
                            </div>
                            <div className="checkout-grid-3">
                                <div className={`checkout-field ${fieldErrors.city ? 'error' : ''}`}>
                                    <label>{t('checkout.city')}</label>
                                    <input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai" required />
                                    {fieldErrors.city && <span className="field-error-text">{fieldErrors.city}</span>}
                                </div>
                                <div className="checkout-field">
                                    <label>{t('checkout.state')}</label>
                                    <input name="state" value={form.state} onChange={handleChange} placeholder="Maharashtra" />
                                </div>
                                <div className={`checkout-field ${fieldErrors.pincode ? 'error' : ''}`}>
                                    <label>{t('checkout.pincode')}</label>
                                    <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="400001" required maxLength={8} />
                                    {fieldErrors.pincode && <span className="field-error-text">{fieldErrors.pincode}</span>}
                                </div>
                            </div>
                            <div className="checkout-field">
                                <label>{t('checkout.country')}</label>
                                <input 
                                    name="country" 
                                    value={form.country} 
                                    onChange={handleChange} 
                                    disabled={commonCountry !== 'Multiple'}
                                    style={{ background: commonCountry !== 'Multiple' ? '#f8fafc' : '#fff', cursor: commonCountry !== 'Multiple' ? 'not-allowed' : 'text' }}
                                />
                                {commonCountry !== 'Multiple' && (
                                    <p className="xx-small text-muted mt-1">
                                        <FaShieldAlt className="me-1" /> Domestic shipping only. Country is locked to seller's location.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="checkout-section">
                            <h2 className="checkout-section-title"><FaCreditCard /> {t('checkout.payment_method')}</h2>
                            <div className="checkout-pay-methods">
                                {availableMethods.map(m => (
                                    <button
                                        key={m.key}
                                        type="button"
                                        className={`checkout-pay-btn ${paymentMethod === m.key ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod(m.key)}
                                    >
                                        <div className="checkout-pay-icon-wrapper">
                                            {m.icon ? (
                                                <img src={m.icon} alt={m.name} className="checkout-method-logo" />
                                            ) : (
                                                <span className="checkout-pay-icon">{m.defaultIcon}</span>
                                            )}
                                        </div>
                                        <div className="checkout-pay-text">
                                            <span className="fw-bold">{m.name}</span>
                                            {m.description && <small className="d-block text-muted xx-small">{m.description}</small>}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'wallet' && (
                                <div className="checkout-stripe-notice" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginTop: '10px' }}>
                                    <FaShieldAlt style={{ color: '#059669' }} />
                                    <div>
                                        <strong>{t('profile.wallet_balance') || 'Wallet Balance'}: {formatPrice(walletBalance, 'inr', defaultCurrency)}</strong>
                                        {currentCurrency && defaultCurrency && currentCurrency._id !== defaultCurrency._id && (
                                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>
                                                {t('checkout.approx_balance') || 'Estimated Balance'}: {formatPrice(walletBalance, 'inr', currentCurrency)}
                                            </p>
                                        )}
                                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>Pay safely using your internal marketplace funds.</p>
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'stripe' && stripeError && (
                                <div className="alert alert-danger mt-2" style={{ fontSize: '0.85rem' }}>
                                    <FaShieldAlt className="me-2" /> {stripeError}
                                </div>
                            )}

                            {paymentMethod === 'paypal' && !paypalSettings && (
                                <div className="alert alert-info mt-2" style={{ fontSize: '0.85rem' }}>
                                    PayPal is not configured correctly in the admin panel.
                                </div>
                            )}

                            {paymentMethod === 'paypal' && paypalSettings && !paypalLoaded && !paypalError && (
                                <div className="checkout-loading-stripe" style={{ marginTop: '15px', color: '#666' }}>
                                    <div className="spinner-border spinner-border-sm me-2" role="status" style={{ color: '#003087' }}></div>
                                    <span>Syncing with PayPal...</span>
                                    <button 
                                        type="button" 
                                        className="btn btn-link btn-sm p-0 ms-2" 
                                        onClick={() => setPaypalSettings({...paypalSettings})} 
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        Click if stuck
                                    </button>
                                </div>
                            )}

                            {paymentMethod === 'paypal' && paypalError && (
                                <div className="alert alert-warning mt-2" style={{ fontSize: '0.85rem' }}>
                                    <FaShieldAlt className="me-2" /> {paypalError}
                                    <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => window.location.reload()}>Retry</button>
                                </div>
                            )}

                            {paymentMethod === 'paypal' && paypalLoaded && (
                                <div id="paypal-button-container" style={{ marginTop: '20px', minHeight: '150px' }}></div>
                            )}

                            {paymentMethod === 'stripe' && clientSecret && (
                                <div className="checkout-card-fields">
                                    <Elements stripe={stripePromise} options={stripeOptions}>
                                        <StripePaymentForm
                                            amount={total}
                                            formattedAmount={formatPrice(total, defaultCurrency, defaultCurrency)}
                                            validateForm={validateForm}
                                            billingDetails={{
                                                name: form.full_name,
                                                email: user.email,
                                                phone: form.phone,
                                                address: {
                                                    line1: form.address_line,
                                                    city: form.city,
                                                    state: form.state,
                                                    postal_code: form.pincode,
                                                    country: 'IN' // Stripe expects ISO codes
                                                }
                                            }}
                                            onPaymentSuccess={(pi) => {
                                                console.log('Payment success:', pi);
                                                handlePlaceOrder(null, pi.id);
                                            }}
                                        />
                                    </Elements>
                                </div>
                            )}

                            {paymentMethod === 'stripe' && !clientSecret && !stripeError && (
                                <div className="checkout-loading-stripe">{t('checkout.loading_secure_payment')}</div>
                            )}

                            {paymentMethod === 'stripe' && stripeError && (
                                <div className="payment-error" style={{ margin: '10px 0' }}>
                                    <strong>{t('checkout.payment_error')}</strong> {stripeError}
                                    <p style={{ fontSize: '0.75rem', marginTop: '5px' }}>Please ensure your Stripe keys are correctly configured in the .env file.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="checkout-summary-col">
                        <div className="checkout-summary-card">
                            <h2 className="checkout-summary-title">{t('checkout.order_summary')}</h2>

                            <div className="checkout-items-list">
                                {selectedItems.map(item => (
                                    <div key={item._id} className="checkout-summary-item">
                                        <img
                                            src={getItemImageUrl(item.images?.[0])}
                                            alt={safeString(item.title)}
                                        />
                                        <div className="checkout-summary-item-info">
                                            <p className="checkout-summary-item-name">{safeString(item.title)}</p>
                                            {item.condition && <span>{safeString(item.condition)}</span>}
                                        </div>
                                        <div className="checkout-summary-item-price">
                                            <strong>{formatPrice(item.price, item.currency_id, defaultCurrency)}</strong>
                                            {item.shipping_included && (
                                                <small className="ship-inc">{t('checkout.shipping_included')}</small>
                                            )}
                                        </div>
                                        <button 
                                            className="checkout-item-remove" 
                                            onClick={() => toggleSelect(item._id)}
                                            title="Exclude from checkout"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-summary-divider" />

                            <div className="checkout-summary-row">
                                <span>{t('checkout.subtotal')} ({selectedItems.length} {t('checkout.items')})</span>
                                <span>{formatPrice(subtotal, defaultCurrency, defaultCurrency)}</span>
                            </div>
                            <div className="checkout-summary-row">
                                <span>{t('checkout.shipping')}</span>
                                <span className={shippingTotal === 0 ? 'ship-free-label' : ''}>
                                    {shippingTotal === 0 ? t('checkout.free') : formatPrice(shippingTotal, defaultCurrency, defaultCurrency)}
                                </span>
                            </div>
                            {discountTotal > 0 && (
                                <div className="checkout-summary-row checkout-discount-row">
                                    <span>{t('checkout.bundle_discount') || 'Bundle Discount'}</span>
                                    <span className="text-success">-{formatPrice(discountTotal, defaultCurrency, defaultCurrency)}</span>
                                </div>
                            )}

                            <div className="checkout-summary-divider" />

                            <div className="checkout-summary-row checkout-total-row">
                                <strong>{t('checkout.total')}</strong>
                                <strong>{formatPrice(total, defaultCurrency, defaultCurrency)}</strong>
                            </div>

                            {currentCurrency && defaultCurrency && currentCurrency._id !== defaultCurrency._id && (
                                <div className="checkout-converted-reference">
                                    {t('checkout.approx_total') || 'Approx. Total'}: {formatPrice(total, defaultCurrency, currentCurrency)}
                                </div>
                            )}

                            {paymentMethod === 'stripe' && (
                                <div className="checkout-stripe-notice">
                                    <FaCreditCard /> {t('checkout.complete_payment_details')}
                                </div>
                            )}

                            {paymentMethod !== 'stripe' && paymentMethod !== 'paypal' && availableMethods.length > 0 && (
                                <button
                                    type="button"
                                    className="checkout-place-btn"
                                    disabled={placing}
                                    onClick={handlePlaceOrder}
                                >
                                    {placing ? (
                                        <><span className="checkout-spinner" /> {t('checkout.placing_order')}</>
                                    ) : (
                                        <><FaLock /> {t('checkout.place_order')} ({formatPrice(total, defaultCurrency, defaultCurrency)})</>
                                    )}
                                </button>
                            )}

                            <p className="checkout-terms">
                                {t('checkout.agree_terms')} <Link href="/terms">{t('checkout.terms_service')}</Link>.
                            </p>

                            <div className="checkout-trust-badges">
                                <span><FaShieldAlt /> {t('checkout.buyer_protection')}</span>
                                <span><FaLock /> {t('checkout.ssl_secured')}</span>
                                <span><FaTruck /> {t('checkout.track_delivery')}</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
            <PopupComponent />

            {/* Payment Success Animation Overlay */}
            {showSuccess && (
                <div className="payment-success-overlay">
                    <div className="payment-success-modal">
                        <div className="success-icon-wrap">
                            <FaCheckCircle />
                            <div className="success-circle-outline"></div>
                        </div>
                        <h2>{t('checkout.payment_complete') || 'Payment Complete!'}</h2>
                        <p>{t('checkout.order_placed_sub') || 'Your order has been placed successfully. Thank you for shopping with us!'}</p>
                        
                        <div className="redirect-countdown">
                            <span>{t('checkout.redirecting_orders') || 'Redirecting to your orders'}</span>
                            <div className="redirect-dots">
                                <div className="redirect-dot"></div>
                                <div className="redirect-dot"></div>
                                <div className="redirect-dot"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CheckoutPage() { return <Checkout />; }
