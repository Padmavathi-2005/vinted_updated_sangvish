'use client';

import React, { useState, useEffect } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { FaLock } from 'react-icons/fa';
import LocationPickerMap from '@/components/common/LocationPickerMap';
import { useTranslation } from 'react-i18next';

const StripePaymentForm = ({ onPaymentSuccess, amount, formattedAmount, billingDetails, validateForm, buttonText, successMessage, isDeposit, primaryColor }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t } = useTranslation();

    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Custom Billing Details state for Deposit
    const [depositBilling, setDepositBilling] = useState({
        name: '',
        address_line: '',
        city: '',
        state: '',
        pincode: '',
        country: 'IN'
    });
    
    const handleDepositBillingChange = (e) => {
        setDepositBilling({ ...depositBilling, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate main address form before Stripe logic
        if (validateForm && !validateForm()) {
            return;
        }
        
        // Validate custom deposit billing form
        if (isDeposit) {
            if (!depositBilling.name || !depositBilling.address_line || !depositBilling.city || !depositBilling.pincode) {
                setMessage("Please fill out all required billing address fields.");
                return;
            }
        }

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        // Required by latest Stripe SDK before confirmPayment
        const { error: submitError } = await elements.submit();
        if (submitError) {
            setMessage(submitError.message);
            setIsLoading(false);
            return;
        }

        const confirmParams = {
            return_url: window.location.origin + '/profile?tab=orders&success=true',
        };

        if (isDeposit) {
            confirmParams.payment_method_data = {
                billing_details: {
                    name: depositBilling.name,
                    address: {
                        line1: depositBilling.address_line,
                        city: depositBilling.city,
                        state: depositBilling.state,
                        postal_code: depositBilling.pincode,
                        country: depositBilling.country || 'IN'
                    }
                }
            };
        } else {
            if (billingDetails && Object.keys(billingDetails).length > 0) {
                confirmParams.payment_method_data = {
                    billing_details: billingDetails
                };
            }
            if (billingDetails) {
                confirmParams.shipping = {
                    name: billingDetails.name,
                    address: billingDetails.address
                };
            }
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams,
            redirect: 'if_required',
        });

        if (error) {
            console.error('Stripe Confirm Error:', error);
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message);
            } else {
                setMessage(error.message || "An unexpected error occurred.");
            }
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setMessage(successMessage || "Payment completed, placing your order...");
            await onPaymentSuccess(paymentIntent);
            // Do NOT setIsLoading(false) here. Keep button disabled while order places.
        }
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="stripe-form">
            {isDeposit && (
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>Billing Address</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                        <input 
                            name="name" 
                            className="form-control" 
                            placeholder="Full Name *" 
                            value={depositBilling.name} 
                            onChange={handleDepositBillingChange} 
                            required 
                        />
                        
                        <div>
                            <LocationPickerMap 
                                initialLabel={depositBilling.address_line}
                                showMap={false}
                                onLocationSelect={(loc) => {
                                    setDepositBilling(prev => ({
                                        ...prev,
                                        address_line: loc.label || prev.address_line,
                                        city: loc.city || prev.city,
                                        state: loc.state || prev.state,
                                        pincode: loc.pincode || prev.pincode,
                                    }));
                                }} 
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                name="city" 
                                className="form-control" 
                                placeholder="City *" 
                                value={depositBilling.city} 
                                onChange={handleDepositBillingChange} 
                                required 
                            />
                            <input 
                                name="state" 
                                className="form-control" 
                                placeholder="State" 
                                value={depositBilling.state} 
                                onChange={handleDepositBillingChange} 
                            />
                        </div>
                        
                        <input 
                            name="pincode" 
                            className="form-control" 
                            placeholder="Postal Code *" 
                            value={depositBilling.pincode} 
                            onChange={handleDepositBillingChange} 
                            required 
                        />
                    </div>
                </div>
            )}
            <PaymentElement 
                id="payment-element" 
                options={isDeposit ? { fields: { billingDetails: 'never' } } : undefined}
                onChange={(e) => {
                    if (e.error) {
                        setMessage(e.error.message);
                    } else {
                        setMessage(null);
                    }
                }}
            />
            {message && <div id="payment-message" className="payment-error" style={{ color: 'red', marginTop: '10px' }}>{message}</div>}
            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="checkout-place-btn stripe-submit"
                style={{ 
                    marginTop: '20px', 
                    backgroundColor: primaryColor || '#0ea5e9', 
                    color: '#fff', 
                    padding: '12px 24px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    width: '100%', 
                    fontWeight: 'bold', 
                    cursor: (isLoading || !stripe || !elements) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (isLoading || !stripe || !elements) ? 0.7 : 1
                }}
            >
                {isLoading ? (
                    <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...</>
                ) : (
                    <><FaLock /> {buttonText || 'Pay and Place Order'} {formattedAmount && `(${formattedAmount})`}</>
                )}
            </button>
        </form>
    );
};

export default StripePaymentForm;
