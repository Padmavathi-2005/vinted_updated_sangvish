'use client';

import React, { useState, useEffect, useContext } from 'react';
import axios from '@/utils/axios';
import {
    FaWallet, FaArrowDown, FaArrowUp, FaClock, FaCheckCircle,
    FaExclamationCircle, FaExchangeAlt, FaMoneyBillWave, FaUniversity, FaPlus
} from 'react-icons/fa';
import CurrencyContext from '@/context/CurrencyContext';
import { useTranslation } from 'react-i18next';
import { safeString } from '@/utils/constants';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/checkout/StripePaymentForm';
import PayoutMethodsContent from './PayoutMethodsContent';
import { useRouter } from 'next/navigation';
import '@/app/styles/WalletContent.css';

// Load stripe promise outside component to avoid recreating

if (typeof window !== 'undefined') {
    // We'll init this inside the component once settings are fetched, but keep ref here
}

/* ── Component ───────────────────────────────────────────── */
const WalletContent = ({ activeSubTab: propSubTab = 'wallet' }) => {
    const { t } = useTranslation();

    /* ── sub-tab config ──────────────────────────────────────── */
    const SUB_TABS = [
        { key: 'wallet', icon: <FaWallet />, label: t('wallet.wallet', 'Wallet') },
        { key: 'transactions', icon: <FaExchangeAlt />, label: t('wallet.transactions', 'Transactions') },
        { key: 'withdrawals', icon: <FaMoneyBillWave />, label: t('wallet.withdraw', 'Withdraw') },
        { key: 'payout-methods', icon: <FaUniversity />, label: t('wallet.payout', 'Payout') },
    ];
    const router = useRouter();
    const { formatPrice, convertPrice, currentCurrency, defaultCurrency } = useContext(CurrencyContext);

    /* internal sub-tab state — kept in sync with sidebar prop */
    const [activeSubTab, setActiveSubTab] = useState(propSubTab);

    useEffect(() => {
        setActiveSubTab(propSubTab);
    }, [propSubTab]);

    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState(null);
    const [withdrawHistory, setWithdrawHistory] = useState([]);
    const [userPayoutMethods, setUserPayoutMethods] = useState([]);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({ amount: '', payout_method_id: '' });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [isPayoutDropdownOpen, setIsPayoutDropdownOpen] = useState(false);
    
    // Deposit State
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositClientSecret, setDepositClientSecret] = useState('');
    const [depositLoading, setDepositLoading] = useState(false);
    const [stripePromise, setStripePromise] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [wRes, hRes, pRes] = await Promise.all([
                axios.get('/api/wallet/me'),
                axios.get('/api/wallet/withdrawals'),
                axios.get('/api/wallet/payout-methods'),
            ]);
            setWalletData(wRes.data);
            setWithdrawHistory(hRes.data);

            const savedMethods = pRes.data || [];
            setUserPayoutMethods(savedMethods);
            if (savedMethods.length > 0) {
                const def = savedMethods.find(m => m.is_default) || savedMethods[0];
                setWithdrawForm(prev => ({ ...prev, payout_method_id: def._id }));
            }
        } catch (err) {
            console.error('Error fetching wallet data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStripeSettings = async () => {
        try {
            const settingsRes = await axios.get('/api/settings');
            const settings = settingsRes.data;
            if (settings && !stripePromise) {
                const isStripeTest = settings.stripe_test_mode !== false;
                const stripePubKey = isStripeTest ? settings.stripe_test_public_key : settings.stripe_live_public_key;
                if (stripePubKey) {
                    setStripePromise(loadStripe(stripePubKey));
                }
            }
        } catch (err) {
            console.error('Error fetching stripe settings:', err);
        }
    };

    useEffect(() => { 
        fetchData(); 
        fetchStripeSettings();
    }, []);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        try {
            await axios.post('/api/wallet/withdraw', {
                amount: parseFloat(withdrawForm.amount),
                payout_method_id: withdrawForm.payout_method_id,
                currency: currentCurrency?.code || 'INR'
            });
            alert('Withdrawal request submitted successfully!');
            const def = userPayoutMethods.find(m => m.is_default) || userPayoutMethods[0];
            setWithdrawForm({ amount: '', payout_method_id: def?._id || '' });
            setShowWithdrawModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Withdrawal failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        if (!depositAmount || depositAmount <= 0) return;
        setDepositLoading(true);
        try {
            const res = await axios.post('/api/payments/stripe/create-intent', {
                amount: parseFloat(depositAmount),
                currency: (currentCurrency?.code || 'INR').toLowerCase(),
                purpose: 'deposit'
            });
            setDepositClientSecret(res.data.clientSecret);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initialize deposit.');
        } finally {
            setDepositLoading(false);
        }
    };

    const onDepositSuccess = async (paymentIntent) => {
        if (!paymentIntent || !paymentIntent.id) {
            alert('Payment completed, but could not verify immediately. Your wallet will update shortly once confirmed.');
            setShowDepositModal(false);
            setDepositAmount('');
            setDepositClientSecret(null);
            fetchData();
            return;
        }

        try {
            await axios.post('/api/payments/stripe/verify-deposit', {
                paymentIntentId: paymentIntent.id
            });
            alert('Funds successfully added!');
        } catch (err) {
            console.error('Verify deposit error:', err);
            alert('Payment successful, but immediate wallet sync failed. It will reflect shortly.');
        }

        setShowDepositModal(false);
        setDepositAmount('');
        setDepositClientSecret(null);
        fetchData();
    };

    if (loading) return (
        <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
        </div>
    );

    /* ── Wallet Hero ─────────────────────────────────────── */
    const renderWallet = () => (
        <div className="wc-hero">
            <div className="wc-hero-inner">
                <div className="wc-hero-icon"><FaWallet /></div>
                <div className="wc-hero-text">
                    <div className="wc-hero-label">{t('wallet.total_balance', 'Total Balance')}</div>
                    <div className="wc-hero-amount">
                        {formatPrice((walletData?.wallet?.balance || 0) + (walletData?.wallet?.pending_balance || 0), walletData?.wallet?.currency, currentCurrency)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="wc-withdraw-btn" onClick={() => setShowDepositModal(true)} style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                        <FaArrowDown size={13} />
                        {t('wallet.add_funds', 'Add Funds')}
                    </button>
                    {withdrawHistory?.some(r => r.status === 'pending') ? (
                    <button className="wc-withdraw-btn pending" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                        <FaClock size={13} />
                        {t('wallet.withdrawal_pending', 'Withdrawal Pending')}
                    </button>
                ) : (
                    <button className="wc-withdraw-btn" onClick={() => setShowWithdrawModal(true)} disabled={walletData?.wallet?.balance <= 0}>
                        <FaArrowUp size={13} />
                        {t('wallet.withdraw_funds', 'Withdraw')}
                    </button>
                )}
                </div>
            </div>
        </div>
    );

    /* ── Transactions ────────────────────────────────────── */
    const renderTransactions = (limit = null) => {
        const txns = limit
            ? (walletData?.transactions?.slice(0, limit) || [])
            : (walletData?.transactions || []);

        return (
            <div className="wc-section">
                <div className="wc-section-header">
                    <h3 className="wc-section-title">
                        <FaExchangeAlt /> {t('wallet.transaction_history', 'Transaction History')}
                    </h3>
                    {limit && walletData?.transactions?.length > limit && (
                        <button
                            className="wc-link-btn"
                            onClick={() => setActiveSubTab('transactions')}
                        >
                            {t('common.show_all', 'Show All')}
                        </button>
                    )}
                </div>

                {/* Mobile stack */}
                <div className="wc-tx-list">
                    {txns.length > 0 ? txns.map(tx => (
                        <div key={tx._id} className="wc-tx-row">
                            <div className={`wc-tx-icon ${tx.type === 'credit' ? 'credit' : 'debit'}`}>
                                {tx.type === 'credit' ? <FaArrowDown size={12} /> : <FaArrowUp size={12} />}
                            </div>
                            <div className="wc-tx-info">
                                <div className="wc-tx-desc">
                                    {(() => {
                                        let desc = tx.description ? safeString(tx.description) : '';
                                        if (desc.startsWith('Full refund for cancelled order ')) {
                                            return t('wallet.full_refund_desc', 'Full refund for cancelled order {{id}}').replace('{{id}}', desc.replace('Full refund for cancelled order ', ''));
                                        }
                                        if (desc.startsWith('Payment for order ')) {
                                            return t('wallet.payment_for_order', 'Payment for order {{id}}').replace('{{id}}', desc.replace('Payment for order ', ''));
                                        }
                                        return desc || (tx.type === 'credit' ? t('wallet.credit', 'Credit') : t('wallet.debit', 'Debit'));
                                    })()}
                                </div>
                                <div className="wc-tx-meta">
                                    <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                    {tx.purpose && <span className="wc-tx-purpose">{t(`wallet.purpose_${tx.purpose}`, tx.purpose.replace(/_/g, ' '))}</span>}
                                </div>
                            </div>
                            <div className="wc-tx-right">
                                <span className={`wc-tx-amount ${tx.type === 'credit' ? 'credit' : 'debit'}`}>
                                    {tx.type === 'credit' ? '+' : '−'}{formatPrice(tx.amount, walletData?.wallet?.currency, currentCurrency)}
                                </span>
                                <span className={`wc-tx-status ${tx.status}`}>
                                    {tx.status === 'completed' ? <><FaCheckCircle size={9} /> {t('wallet.completed', 'Completed')}</> :
                                        tx.status === 'failed' ? <><FaExclamationCircle size={9} /> {t('wallet.failed', 'Failed')}</> :
                                            <><FaClock size={9} /> {t('wallet.pending', 'Pending')}</>}
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="wc-empty">
                            <FaExchangeAlt className="wc-empty-icon" />
                            <p>{t('wallet.no_transactions', 'No transactions yet.')}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    /* ── Withdrawals ─────────────────────────────────────── */
    const renderWithdrawals = () => (
        <div className="wc-section">
            <div className="wc-section-header">
                <h3 className="wc-section-title">
                    <FaMoneyBillWave /> {t('wallet.withdrawal_requests', 'Withdrawal Requests')}
                </h3>
            </div>
            <div className="wc-tx-list">
                {withdrawHistory?.length > 0 ? withdrawHistory.map(req => (
                    <div key={req._id} className="wc-tx-row">
                        <div className="wc-tx-icon debit">
                            <FaArrowUp size={12} />
                        </div>
                        <div className="wc-tx-info">
                            <div className="wc-tx-desc">
                                {req.payment_method
                                    ? safeString(req.payment_method)
                                    : 'Bank Transfer'} Withdrawal
                            </div>
                            <div className="wc-tx-meta">
                                <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                <span>#{req._id.slice(-6).toUpperCase()}</span>
                            </div>
                            {req.admin_note && (
                                <div className="wc-tx-note">{req.admin_note}</div>
                            )}
                        </div>
                        <div className="wc-tx-right">
                            <span className="wc-tx-amount debit">{formatPrice(req.amount, walletData?.wallet?.currency, currentCurrency)}</span>
                            <span className={`wc-tx-status ${req.status === 'completed' ? 'completed' : req.status === 'pending' ? 'pending' : 'failed'}`}>
                                {req.status === 'completed' ? <><FaCheckCircle size={9} /> Done</> :
                                    req.status === 'pending' ? <><FaClock size={9} /> Pending</> :
                                        <><FaExclamationCircle size={9} /> {req.status}</>}
                            </span>
                        </div>
                    </div>
                )) : (
                    <div className="wc-empty">
                        <FaMoneyBillWave className="wc-empty-icon" />
                        <p>{t('wallet.no_withdrawals', 'No withdrawal requests yet.')}</p>
                    </div>
                )}
            </div>
        </div>
    );

    /* ── Withdraw Request Modal ───────────────────────────── */
    const renderWithdrawModal = () => (
        <div className="wc-modal-overlay" onClick={() => setShowWithdrawModal(false)}>
            <div className="wc-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="wc-modal-header">
                    <div>
                        <h3 className="wc-modal-title">{t('wallet.request_withdrawal', 'Request Withdrawal')}</h3>
                        <p className="wc-modal-sub">
                            {t('wallet.available', 'Available')}: <strong>{formatPrice(walletData?.wallet?.balance || 0, walletData?.wallet?.currency, currentCurrency)}</strong>
                        </p>
                    </div>
                    <button className="btn-close" onClick={() => setShowWithdrawModal(false)} />
                </div>

                {/* Body */}
                <div className="wc-modal-body">
                    {message && (
                        <div className={`wc-alert wc-alert-${message.type}`}>
                            {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleWithdraw}>
                        {/* Amount */}
                        <div className="wc-form-group">
                            <label className="wc-label">
                                {t('wallet.amount_to_withdraw', 'Amount to withdraw')}
                            </label>
                            <div className="wc-input-row">
                                <span className="wc-currency-sym">{currentCurrency?.symbol || '₹'}</span>
                                <input
                                    type="number"
                                    className="wc-input"
                                    value={withdrawForm.amount}
                                    onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                    placeholder="0.00"
                                    min="1"
                                    max={convertPrice(walletData?.wallet?.balance || 0, walletData?.wallet?.currency, currentCurrency)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Payout method picker */}
                        <div className="wc-form-group">
                            <label className="wc-label">
                                {t('wallet.payout_method', 'Select Payout Method')}
                            </label>

                            {userPayoutMethods.length > 0 ? (
                                <div className="wc-payout-list">
                                    {userPayoutMethods.map(m => (
                                        <div
                                            key={m._id}
                                            className={`wc-payout-option ${withdrawForm.payout_method_id === m._id ? 'selected' : ''}`}
                                            onClick={() => setWithdrawForm({ ...withdrawForm, payout_method_id: m._id })}
                                        >
                                            <div className="wc-payout-radio">
                                                {withdrawForm.payout_method_id === m._id && <div className="wc-payout-radio-dot" />}
                                            </div>
                                            <div className="wc-payout-icon">
                                                <FaUniversity />
                                            </div>
                                            <div className="wc-payout-details">
                                                <span className="wc-payout-type">{m.payout_type}</span>
                                                <span className="wc-payout-sub">
                                                    {m.payout_type === 'Bank'
                                                        ? `${m.bank_name} · ····${String(m.account_number || '').slice(-4)}`
                                                        : (m.upi_id || m.paypal_email)}
                                                </span>
                                            </div>
                                            {m.is_default && <span className="wc-payout-default">Default</span>}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="wc-add-method-inline"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            marginTop: '10px',
                                            background: '#f8fafc',
                                            border: '1px dashed #cbd5e1',
                                            borderRadius: '12px',
                                            color: '#64748b',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                        onClick={() => {
                                            setShowWithdrawModal(false);
                                            setActiveSubTab('payout-methods');
                                        }}
                                    >
                                        <FaPlus size={10} /> {t('wallet.add_payout_method', 'Add Payout Method')}
                                    </button>
                                </div>
                            ) : (
                                <div className="wc-no-payout">
                                    <FaUniversity className="wc-no-payout-icon" />
                                    <p>{t('wallet.no_payout_methods', 'No payout methods saved yet.')}</p>
                                    <button
                                        type="button"
                                        className="wc-add-payout-btn"
                                        onClick={() => {
                                            setShowWithdrawModal(false);
                                            setActiveSubTab('payout-methods');
                                        }}
                                    >
                                        <FaPlus size={10} /> {t('wallet.add_payout_method', 'Add Payout Method')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="wc-submit-btn"
                            disabled={submitting || !withdrawForm.payout_method_id || !withdrawForm.amount}
                        >
                            {submitting
                                ? t('common.processing', 'Processing…')
                                : t('wallet.submit_request', 'Submit Withdrawal Request')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );

    /* ── Deposit Modal ───────────────────────────── */
    const renderDepositModal = () => (
        <div className="wc-modal-overlay" onClick={() => setShowDepositModal(false)}>
            <div className="wc-modal-card" onClick={e => e.stopPropagation()}>
                <div className="wc-modal-header">
                    <div>
                        <h3 className="wc-modal-title">{t('wallet.add_funds', 'Add Funds')}</h3>
                        <p className="wc-modal-sub">Top up your wallet balance.</p>
                    </div>
                    <button className="btn-close" onClick={() => setShowDepositModal(false)} />
                </div>

                <div className="wc-modal-body">
                    {!depositClientSecret ? (
                        <form onSubmit={handleDepositSubmit}>
                            <div className="wc-form-group">
                                <label className="wc-label">{t('wallet.amount_to_deposit', 'Amount to deposit')}</label>
                                <div className="wc-input-row">
                                    <span className="wc-currency-sym">{currentCurrency?.symbol || '₹'}</span>
                                    <input
                                        type="number"
                                        className="wc-input"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="wc-submit-btn"
                                disabled={depositLoading || !depositAmount}
                            >
                                {depositLoading ? t('common.processing', 'Processing…') : t('common.continue', 'Continue')}
                            </button>
                        </form>
                    ) : (
                        <div>
                            {stripePromise && (
                                <Elements stripe={stripePromise} options={{ clientSecret: depositClientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#6366f1' } } }}>
                                    <StripePaymentForm 
                                        onPaymentSuccess={onDepositSuccess} 
                                        amount={depositAmount} 
                                        formattedAmount={formatPrice(depositAmount, defaultCurrency?.code, defaultCurrency)} 
                                        validateForm={() => true}
                                        isDeposit={true}
                                        buttonText={t('wallet.add_funds', 'Add Funds')}
                                        successMessage={t('wallet.funds_added_success', 'Funds successfully added!')}
                                    />
                                </Elements>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    /* ── Render ──────────────────────────────────────────── */
    return (
        <div className="wallet-content">
            {/* ── Inline pill tabs (always visible, critical on mobile) ── */}
            <div className="wc-tab-bar">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`wc-tab ${activeSubTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveSubTab(tab.key)}
                    >
                        <span className="wc-tab-icon">{tab.icon}</span>
                        <span className="wc-tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Content area ── */}
            <div className="wc-body">
                {activeSubTab === 'wallet' && (
                    <>
                        {renderWallet()}
                        <div className="mt-3">{renderTransactions(3)}</div>
                    </>
                )}
                {activeSubTab === 'transactions' && renderTransactions()}
                {activeSubTab === 'withdrawals' && renderWithdrawals()}
                {activeSubTab === 'payout-methods' && <PayoutMethodsContent />}
            </div>

            {/* Withdrawal modal */}
            {showWithdrawModal && renderWithdrawModal()}
            {showDepositModal && renderDepositModal()}
        </div>
    );
};

export default WalletContent;
