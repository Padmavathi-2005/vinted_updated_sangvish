'use client';

import React, { useState, useEffect } from 'react';
import axios from '@/utils/axios';
import { FaUniversity, FaPlus, FaTrash, FaCheckCircle, FaGlobe, FaCreditCard, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const PayoutMethodsContent = () => {
    const { t } = useTranslation();
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        payout_type: 'Bank',
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        branch_city: '',
        branch_address: '',
        country: 'India',
        upi_id: '',
        paypal_email: '',
        is_default: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState(null);

    const fetchMethods = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/wallet/payout-methods');
            setMethods(res.data);
        } catch (err) {
            console.error("Error fetching payout methods:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleEdit = (method) => {
        setEditingMethod(method);
        setFormData({
            payout_type: method.payout_type || 'Bank',
            bank_name: method.bank_name || '',
            account_holder_name: method.account_holder_name || '',
            account_number: method.account_number || '',
            ifsc_code: method.ifsc_code || '',
            branch_name: method.branch_name || '',
            branch_city: method.branch_city || '',
            branch_address: method.branch_address || '',
            country: method.country || 'India',
            upi_id: method.upi_id || '',
            paypal_email: method.paypal_email || '',
            is_default: method.is_default || false
        });
        setShowAddForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingMethod) {
                await axios.put(`/api/wallet/payout-methods/${editingMethod._id}`, formData);
            } else {
                await axios.post('/api/wallet/payout-methods', formData);
            }
            setShowAddForm(false);
            setEditingMethod(null);
            setFormData({
                payout_type: 'Bank',
                bank_name: '',
                account_holder_name: '',
                account_number: '',
                ifsc_code: '',
                branch_name: '',
                branch_city: '',
                branch_address: '',
                country: 'India',
                upi_id: '',
                paypal_email: '',
                is_default: false
            });
            fetchMethods();
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${editingMethod ? 'update' : 'add'} payout method`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('common.confirm_delete', 'Are you sure you want to remove this payout method?'))) return;
        try {
            await axios.delete(`/api/wallet/payout-methods/${id}`);
            fetchMethods();
        } catch (err) {
            alert(t('common.delete_failed', 'Failed to delete method'));
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await axios.put(`/api/wallet/payout-methods/${id}/default`);
            fetchMethods();
        } catch (err) {
            alert(t('common.set_default_failed', 'Failed to set default method'));
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    const handleCloseForm = () => {
        setShowAddForm(false);
        setEditingMethod(null);
        setFormData({
            payout_type: 'Bank',
            bank_name: '',
            account_holder_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: '',
            branch_city: '',
            branch_address: '',
            country: 'India',
            upi_id: '',
            paypal_email: '',
            is_default: false
        });
    };

    return (
        <div className="payout-methods-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold m-0" style={{ fontSize: '1.25rem' }}>{t('wallet.payout_methods', 'Payout Methods')}</h3>
                {!showAddForm && (
                    <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={() => setShowAddForm(true)}>
                        <FaPlus className="me-2" /> {t('wallet.add_new_method', 'Add New Method')}
                    </button>
                )}
            </div>

            {showAddForm && (
                <div className="pd-modal-overlay">
                    <div className="pd-modal-card" style={{ maxWidth: '600px', width: '100%', borderRadius: '24px' }}>
                        <div className="pd-modal-header border-0 pb-0">
                            <h3 className="fw-bold m-0" style={{ fontSize: '1.25rem' }}>
                                {editingMethod ? t('wallet.edit_payout_details', 'Edit Payout Details') : t('wallet.add_payout_details', 'Add Payout Details')}
                            </h3>
                            <button className="btn-close" onClick={handleCloseForm}></button>
                        </div>

                        <div className="pd-modal-body p-4 pt-2">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-12 mb-3">
                                        <label className="form-label small fw-bold text-muted mb-2">{t('wallet.payout_method_type', 'Payout method')}*</label>

                                        {/* Custom Dropdown */}
                                        <div className="custom-payout-dropdown-container" style={{ position: 'relative' }}>
                                            <div
                                                className="form-control border-0 bg-light rounded-3 d-flex justify-content-between align-items-center"
                                                style={{ cursor: 'pointer', height: '48px', padding: '0 16px' }}
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    {formData.payout_type === 'Bank' && <FaUniversity className="text-primary" />}
                                                    {formData.payout_type === 'UPI' && <FaMapMarkerAlt className="text-success" />}
                                                    {formData.payout_type === 'PayPal' && <FaCreditCard className="text-info" />}
                                                    <span className="fw-500">{formData.payout_type}</span>
                                                </div>
                                                <div style={{ transition: 'transform 0.3s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                    <FaGlobe size={12} className="text-muted" />
                                                </div>
                                            </div>

                                            {isDropdownOpen && (
                                                <div
                                                    className="shadow-lg border-0 bg-white rounded-4 mt-2 p-2"
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        zIndex: 2000,
                                                        animation: 'fadeIn 0.2s ease'
                                                    }}
                                                >
                                                    {[
                                                        { id: 'Bank', icon: <FaUniversity className="text-primary" />, label: t('wallet.bank_transfer', 'Bank Transfer') },
                                                        { id: 'UPI', icon: <FaMapMarkerAlt className="text-success" />, label: t('wallet.upi_vpa', 'UPI / VPA') },
                                                        { id: 'PayPal', icon: <FaCreditCard className="text-info" />, label: t('wallet.paypal', 'PayPal') }
                                                    ].map(opt => (
                                                        <div
                                                            key={opt.id}
                                                            className="dropdown-item-custom p-3 rounded-3 d-flex align-items-center gap-3"
                                                            style={{ cursor: 'pointer', background: formData.payout_type === opt.id ? '#f1f5f9' : 'transparent' }}
                                                            onClick={() => {
                                                                setFormData({ ...formData, payout_type: opt.id });
                                                                setIsDropdownOpen(false);
                                                            }}
                                                        >
                                                            <div className="p-2 bg-light rounded-2">{opt.icon}</div>
                                                            <div className="fw-600" style={{ fontSize: '0.9rem' }}>{opt.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {formData.payout_type === 'Bank' && (
                                        <>
                                            <div className="col-md-6 mb-2">
                                                <label className="form-label small font-muted fw-bold">{t('wallet.bank_name', 'Bank Name')}*</label>
                                                <input className="form-control border-0 bg-light rounded-3" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="e.g. HDFC Bank" required />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <label className="form-label small font-muted fw-bold">{t('wallet.account_holder_name', 'Account Holder Name')}*</label>
                                                <input className="form-control border-0 bg-light rounded-3" name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} placeholder="John Doe" required />
                                            </div>
                                            <div className="col-md-12 mb-2">
                                                <label className="form-label small font-muted fw-bold">{t('wallet.account_number_iban', 'Account Number / IBAN')}*</label>
                                                <input className="form-control border-0 bg-light rounded-3" name="account_number" value={formData.account_number} onChange={handleChange} placeholder="1234567890" required />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <label className="form-label small font-muted fw-bold">{t('wallet.ifsc_code', 'IFSC / SWIFT Code')}*</label>
                                                <input className="form-control border-0 bg-light rounded-3" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} placeholder="HDFC0001234" required />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <label className="form-label small font-muted fw-bold">{t('wallet.branch_name', 'Branch Name')}*</label>
                                                <input className="form-control border-0 bg-light rounded-3" name="branch_name" value={formData.branch_name} onChange={handleChange} placeholder="Main Branch" required />
                                            </div>
                                            <div className="col-md-12 mb-2">
                                                <label className="form-label small font-muted fw-bold">{t('wallet.branch_address', 'Branch Address')}*</label>
                                                <input className="form-control border-0 bg-light rounded-3" name="branch_address" value={formData.branch_address} onChange={handleChange} placeholder="123 Street, City" required />
                                            </div>
                                        </>
                                    )}

                                    {formData.payout_type === 'UPI' && (
                                        <div className="col-md-12 mb-3">
                                            <label className="form-label small fw-bold text-muted">{t('wallet.upi_id', 'UPI ID')}*</label>
                                            <input className="form-control border-0 bg-light rounded-3 py-3" name="upi_id" value={formData.upi_id} onChange={handleChange} placeholder="username@upi" required />
                                        </div>
                                    )}

                                    {formData.payout_type === 'PayPal' && (
                                        <div className="col-md-12 mb-3">
                                            <label className="form-label small fw-bold text-muted">{t('wallet.paypal_email', 'PayPal Email')}*</label>
                                            <input type="email" className="form-control border-0 bg-light rounded-3 py-3" name="paypal_email" value={formData.paypal_email} onChange={handleChange} placeholder="your@paypal.com" required />
                                        </div>
                                    )}

                                    <div className="col-12 mb-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="form-check form-switch">
                                                <input type="checkbox" className="form-check-input" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} style={{ cursor: 'pointer' }} />
                                            </div>
                                            <label className="form-check-label small fw-bold text-muted mb-0" htmlFor="is_default" style={{ cursor: 'pointer' }}>{t('wallet.set_as_default', 'Set as default payout method')}</label>
                                        </div>
                                    </div>

                                    <div className="modal-actions d-flex gap-3 pt-4">
                                        <button type="submit" className="btn btn-primary rounded-pill flex-grow-1 py-3 fw-bold shadow-sm" style={{ height: '56px' }} disabled={submitting}>
                                            {submitting ? t('common.saving', 'Saving...') : (editingMethod ? t('common.update', 'Update Method') : t('common.save', 'Save Method'))}
                                        </button>
                                        <button type="button" className="btn btn-light rounded-pill px-4 text-muted border" style={{ height: '56px' }} onClick={handleCloseForm}>{t('common.cancel', 'Cancel')}</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-3">
                {methods.length > 0 ? (
                    [...methods].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)).map((m) => (
                        <div key={m._id} className="col-md-6">
                            <div className="pd-section-card p-3 border-0 shadow-sm h-100" style={{ borderRadius: '16px', background: m.is_default ? '#f0f9ff' : 'white', border: m.is_default ? '1px solid #bae6fd' : 'none', position: 'relative' }}>
                                {m.is_default && (
                                    <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#f59e0b', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FaGlobe size={8} /> {t('wallet.default_badge', 'PRIMARY')}
                                    </div>
                                )}
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="p-2 rounded-3" style={{ background: m.is_default ? '#e0f2fe' : '#f1f5f9', color: '#0ea5e9' }}>
                                            {m.payout_type === 'Bank' ? <FaUniversity size={20} /> : m.payout_type === 'UPI' ? <FaMapMarkerAlt size={20} /> : <FaCreditCard size={20} />}
                                        </div>
                                        <div>
                                            <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{m.payout_type}</div>
                                            <div className="text-muted xsmall">{m.payout_type === 'Bank' ? m.bank_name : m.payout_type === 'UPI' ? m.upi_id : m.paypal_email}</div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="btn-group shadow-sm rounded-3">
                                            {!m.is_default && (
                                                <button 
                                                    className="btn btn-sm btn-outline-success border-0 px-2" 
                                                    onClick={() => handleSetDefault(m._id)}
                                                    title={t('wallet.set_as_default', 'Set as Default')}
                                                    style={{ fontSize: '10px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <FaCheckCircle size={10} /> {t('wallet.set_default_short', 'DEFAULT')}
                                                </button>
                                            )}
                                            <button 
                                                className="btn btn-sm btn-light border-0 px-2" 
                                                onClick={() => handleEdit(m)}
                                                title={t('common.edit', 'Edit')}
                                                style={{ height: '28px' }}
                                            >
                                                <FaEdit size={12} className="text-info" />
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-light border-0 px-2" 
                                                onClick={() => handleDelete(m._id)}
                                                title={t('common.delete', 'Delete')}
                                                style={{ height: '28px' }}
                                            >
                                                <FaTrash size={12} className="text-danger" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="payout-details-mini mt-2 ps-1">
                                    {m.payout_type === 'Bank' && (
                                        <div className="small text-muted" style={{ fontSize: '0.8rem' }}>
                                            <div className="mb-1"><strong>{t('wallet.account_holder', 'Holder')}:</strong> {m.account_holder_name}</div>
                                            <div><strong>{t('wallet.account_number', 'A/C')}:</strong> ****{m.account_number.slice(-4)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-12">
                        <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                            <FaUniversity size={40} className="text-muted opacity-25 mb-3" />
                            <p className="text-muted">{t('wallet.no_payout_methods', 'No payout methods saved yet.')}</p>
                            <button className="btn btn-outline-primary btn-sm rounded-pill px-4" onClick={() => setShowAddForm(true)}>{t('wallet.add_first_method', 'Add your first method')}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayoutMethodsContent;
