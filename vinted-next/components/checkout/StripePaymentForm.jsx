'use client';

import React, { useState, useEffect } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements,
    AddressElement
} from '@stripe/react-stripe-js';
import { FaLock } from 'react-icons/fa';

const StripePaymentForm = ({ onPaymentSuccess, amount, formattedAmount, billingDetails, validateForm, buttonText, successMessage, isDeposit }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate main address form before Stripe logic
        if (validateForm && !validateForm()) {
            return;
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

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL can be a success page
                return_url: window.location.origin + '/profile?tab=orders&success=true',
                ...(billingDetails && Object.keys(billingDetails).length > 0 ? {
                    payment_method_data: {
                        billing_details: billingDetails
                    }
                } : {}),
                ...(!isDeposit && billingDetails ? {
                    shipping: {
                        name: billingDetails.name,
                        address: billingDetails.address
                    }
                } : {})
            },
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
                    <AddressElement options={{ mode: 'billing', defaultValues: { address: { country: 'IN' } } }} />
                </div>
            )}
            <PaymentElement 
                id="payment-element" 
                onChange={(e) => {
                    if (e.error) {
                        setMessage(e.error.message);
                    } else {
                        setMessage(null);
                    }
                }}
            />
            {message && <div id="payment-message" className="payment-error">{message}</div>}
            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="checkout-place-btn stripe-submit"
                style={{ marginTop: '20px' }}
            >
                {isLoading ? (
                    <><span className="checkout-spinner" /> Processing...</>
                ) : (
                    <><FaLock /> {buttonText || 'Pay and Place Order'} {formattedAmount && `(${formattedAmount})`}</>
                )}
            </button>
        </form>
    );
};

export default StripePaymentForm;
