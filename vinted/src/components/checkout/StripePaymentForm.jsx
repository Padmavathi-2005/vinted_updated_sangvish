import React, { useState, useEffect } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { FaLock } from 'react-icons/fa';

const StripePaymentForm = ({ onPaymentSuccess, amount, formattedAmount, billingDetails, validateForm }) => {
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

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL can be a success page
                return_url: window.location.origin + '/profile?tab=orders&success=true',
                payment_method_data: {
                    billing_details: billingDetails
                },
                shipping: {
                    name: billingDetails.name,
                    address: billingDetails.address
                }
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
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onPaymentSuccess(paymentIntent);
        }

        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="stripe-form">
            <PaymentElement id="payment-element" />
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
                    <><FaLock /> Pay and Place Order {formattedAmount && `(${formattedAmount})`}</>
                )}
            </button>
        </form>
    );
};

export default StripePaymentForm;
