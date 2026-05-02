import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import {
    FaCreditCard, FaSearch, FaPlus, FaSync,
    FaCheckCircle, FaTimesCircle, FaEdit, FaTrash
} from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import axios from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';
import AdminSearchSelect from '../components/AdminSearchSelect';
import '../styles/WalletPages.css';

/* ── helpers ─────────────────────────────────────────────── */
const safeStr = (val, lang = 'en', fallback = '—') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    return val[lang] || val.en || Object.values(val)[0] || fallback;
};

/* ── Inner list component (also exported for DynamicSettings integration) ── */
export const PaymentMethodsList = ({ isIntegrated = false, activeGlobalLang }) => {
    const [selected, setSelected]   = useState(null);
    const [methods, setMethods]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [languages, setLanguages] = useState([]);
    const [activeLang, setActiveLang] = useState('en');
    const [formData, setFormData]   = useState({
        name: {}, key: '', description: {}, is_active: true, sort_order: 0
    });

    /* sync lang from parent */
    useEffect(() => {
        if (activeGlobalLang) setActiveLang(activeGlobalLang);
    }, [activeGlobalLang]);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const [mRes, lRes] = await Promise.all([
                axios.get('/api/admin/payment-methods'),
                axios.get('/api/admin/languages')
            ]);
            setMethods(mRes.data);
            setLanguages(lRes.data);
            if (!activeGlobalLang && lRes.data.length > 0) {
                const hasEn = lRes.data.find(l => l.code === 'en');
                setActiveLang(hasEn ? 'en' : lRes.data[0].code);
            }
        } catch (err) {
            showToast('error', 'Failed to load payment methods');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const openAdd = () => {
        setSelected(null);
        setFormData({ name: {}, key: '', description: {}, is_active: true, sort_order: 0 });
        setShowModal(true);
    };

    const openEdit = (method) => {
        setSelected(method);
        setFormData({
            name:        typeof method.name        === 'string' ? { en: method.name }        : (method.name        || {}),
            key:         method.key || '',
            description: typeof method.description === 'string' ? { en: method.description } : (method.description || {}),
            is_active:   method.is_active ?? true,
            sort_order:  method.sort_order || 0
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        const hasSomeName = Object.values(formData.name).some(n => n.trim() !== '');
        if (!hasSomeName || !formData.key) {
            showToast('error', 'At least one name and the Key are required');
            return;
        }
        try {
            setSaving(true);
            const payload = { ...formData, sort_order: parseInt(formData.sort_order) || 0 };
            if (selected) {
                await axios.put(`/api/admin/payment-methods/${selected._id}`, payload);
                showToast('success', 'Payment method updated');
            } else {
                await axios.post('/api/admin/payment-methods', payload);
                showToast('success', 'Payment method created');
            }
            setShowModal(false);
            fetchAll();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        const name = safeStr(row.name, activeLang);
        const result = await showConfirm('Delete Payment Method', `Remove "${name}"?`);
        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/admin/payment-methods/${row._id}`);
                showToast('success', 'Payment method deleted');
                fetchAll();
            } catch (err) {
                showToast('error', err.response?.data?.message || 'Failed to delete');
            }
        }
    };

    const handleToggle = async (row, checked) => {
        try {
            await axios.put(`/api/admin/payment-methods/${row._id}`, { is_active: checked });
            showToast('success', 'Status updated');
            fetchAll();
        } catch (err) {
            showToast('error', 'Failed to update status');
        }
    };

    /* ── Stats ─────────────────────────────────────────────── */
    const stats = useMemo(() => {
        const active   = methods.filter(m => m.is_active).length;
        const inactive = methods.length - active;
        return { total: methods.length, active, inactive };
    }, [methods]);

    /* ── Filtered ──────────────────────────────────────────── */
    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return methods.filter(m => {
            const nameMatch = typeof m.name === 'string'
                ? m.name.toLowerCase().includes(term)
                : Object.values(m.name || {}).some(v => v.toLowerCase().includes(term));
            return nameMatch || m.key?.toLowerCase().includes(term);
        });
    }, [methods, searchTerm]);

    /* ── Columns ───────────────────────────────────────────── */
    const columns = [
        {
            header: 'Method',
            accessor: 'name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="wallet-pm-icon card">
                        <FaCreditCard />
                    </div>
                    <div>
                        <div className="wallet-pm-name">{safeStr(row.name, activeLang)}</div>
                        <div className="wallet-pm-key">{row.key}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Description',
            accessor: 'description',
            render: (row) => (
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    {safeStr(row.description, activeLang) || '—'}
                </span>
            )
        },
        {
            header: 'Order',
            accessor: 'sort_order',
            render: (row) => (
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{row.sort_order ?? 0}</span>
            )
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (row) => (
                <Toggle
                    checked={row.is_active}
                    onChange={(checked) => handleToggle(row, checked)}
                    label={row.is_active ? 'Active' : 'Inactive'}
                />
            )
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (row) => (
                <div className="wallet-row-actions">
                    <button className="wallet-action-btn edit" onClick={() => openEdit(row)} title="Edit">
                        <FaEdit size={12} />
                    </button>
                    <button className="wallet-action-btn delete" onClick={() => handleDelete(row)} title="Delete">
                        <FaTrash size={12} />
                    </button>
                </div>
            )
        }
    ];

    /* ── Mobile card ───────────────────────────────────────── */
    const MobileCard = ({ row }) => (
        <div className="wallet-mobile-card">
            <div className="wallet-mobile-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="wallet-pm-icon card"><FaCreditCard /></div>
                    <div>
                        <div className="wallet-pm-name">{safeStr(row.name, activeLang)}</div>
                        <div className="wallet-pm-key">{row.key}</div>
                    </div>
                </div>
                <span className={`wallet-badge ${row.is_active ? 'wallet-badge-success' : 'wallet-badge-secondary'}`}>
                    {row.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </div>
            <div className="wallet-mobile-card-row">
                <span className="wallet-mobile-card-key">Description</span>
                <span className="wallet-mobile-card-val">{safeStr(row.description, activeLang) || '—'}</span>
            </div>
            <div className="wallet-mobile-card-row">
                <span className="wallet-mobile-card-key">Sort Order</span>
                <span className="wallet-mobile-card-val">{row.sort_order ?? 0}</span>
            </div>
            <div className="wallet-mobile-card-row">
                <span className="wallet-mobile-card-key">Toggle</span>
                <Toggle checked={row.is_active} onChange={(c) => handleToggle(row, c)} label={row.is_active ? 'Active' : 'Inactive'} />
            </div>
            <div className="wallet-mobile-card-actions">
                <button className="wallet-btn wallet-btn-outline wallet-btn-sm" onClick={() => openEdit(row)}>
                    <FaEdit size={11} /> Edit
                </button>
                <button className="wallet-btn wallet-btn-danger wallet-btn-sm" onClick={() => handleDelete(row)}>
                    <FaTrash size={11} /> Delete
                </button>
            </div>
        </div>
    );

    /* ── Render (inner list) ───────────────────────────────── */
    return (
        <div>
            {/* Integrated sub-header (when used inside DynamicSettings) */}
            {isIntegrated && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h5 style={{ fontWeight: 700, margin: 0 }}>Custom Payment Methods</h5>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '2px 0 0' }}>Manage manual or custom payment options</p>
                    </div>
                    <button className="wallet-btn wallet-btn-primary wallet-btn-sm" onClick={openAdd}>
                        <FaPlus size={11} /> Add Method
                    </button>
                </div>
            )}

            {/* Stats — only show on standalone page */}
            {!isIntegrated && (
                <div className="wallet-stats-row" style={{ padding: 0, marginBottom: 20 }}>
                    <div className="wallet-stat-card">
                        <div className="wallet-stat-icon-wrap blue"><FaCreditCard /></div>
                        <div><div className="wallet-stat-value">{stats.total}</div><div className="wallet-stat-label">Total Methods</div></div>
                    </div>
                    <div className="wallet-stat-card">
                        <div className="wallet-stat-icon-wrap green"><FaCheckCircle /></div>
                        <div><div className="wallet-stat-value">{stats.active}</div><div className="wallet-stat-label">Active</div></div>
                    </div>
                    <div className="wallet-stat-card">
                        <div className="wallet-stat-icon-wrap red"><FaTimesCircle /></div>
                        <div><div className="wallet-stat-value">{stats.inactive}</div><div className="wallet-stat-label">Inactive</div></div>
                    </div>
                </div>
            )}

            {/* Main card */}
            <div className="wallet-content-card" style={{ margin: 0 }}>
                {/* Controls */}
                <div className="wallet-controls">
                    <div className="wallet-controls-left">
                        <div className="wallet-search-wrap">
                            <FaSearch style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:'0.85rem',pointerEvents:'none'}}/>
                            <input
                                className="wallet-search-input"
                                placeholder="Search by name or key…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="wallet-controls-right" style={{ gap: 10 }}>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                            {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                        </div>
                        <button className="wallet-btn wallet-btn-outline wallet-btn-sm" onClick={() => fetchAll(true)} disabled={refreshing}>
                            <FaSync className={refreshing ? 'spin' : ''} />
                        </button>
                        {!isIntegrated && (
                            <button className="wallet-btn wallet-btn-primary wallet-btn-sm" onClick={openAdd}>
                                <FaPlus size={11} /> Add Gateway
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="wallet-loading"><Spinner animation="border" variant="primary" size="sm" /> Loading methods…</div>
                ) : filteredData.length === 0 ? (
                    <div className="wallet-empty">
                        <div className="wallet-empty-icon"><FaCreditCard /></div>
                        <div className="wallet-empty-title">No payment methods configured</div>
                        <div className="wallet-empty-sub">Add your first payment gateway to get started</div>
                    </div>
                ) : (
                    <>
                        <div className="wallet-table-wrapper">
                            <Table
                                columns={columns}
                                data={filteredData}
                                actions={false}
                                pagination={true}
                                emptyMessage="No payment methods configured"
                            />
                        </div>
                        <div className="wallet-mobile-list">
                            {filteredData.map((row, i) => <MobileCard key={row._id || i} row={row} />)}
                        </div>
                    </>
                )}
            </div>

            {/* Add / Edit Modal */}
            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                title={selected ? '✏️ Edit Payment Method' : '➕ Add Payment Method'}
                size="lg"
                footer={
                    <>
                        <button className="wallet-btn wallet-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="wallet-btn wallet-btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? <Spinner size="sm" animation="border" /> : (selected ? 'Save Changes' : 'Create Method')}
                        </button>
                    </>
                }
            >
                {/* Language selector tabs */}
                {languages.length > 1 && (
                    <div className="wallet-lang-tabs">
                        {languages.map(l => (
                            <button
                                key={l.code}
                                className={`wallet-lang-tab ${activeLang === l.code ? 'active' : ''}`}
                                onClick={() => setActiveLang(l.code)}
                            >
                                {l.name} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>{l.code.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Form fields */}
                <div className="wallet-form-group">
                    <label className="wallet-form-label">
                        Method Name — {activeLang.toUpperCase()} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        className="wallet-form-control"
                        type="text"
                        value={formData.name[activeLang] || ''}
                        onChange={e => setFormData({ ...formData, name: { ...formData.name, [activeLang]: e.target.value } })}
                        placeholder={`Name in ${activeLang}…`}
                    />
                </div>

                <div className="wallet-form-group">
                    <label className="wallet-form-label">
                        Unique Key <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        className="wallet-form-control"
                        type="text"
                        value={formData.key}
                        onChange={e => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="e.g. cash_delivery"
                        disabled={!!selected}
                    />
                    <div className="wallet-form-hint">
                        Unique identifier used internally. Cannot be changed after creation.
                    </div>
                </div>

                <div className="wallet-form-group">
                    <label className="wallet-form-label">Description — {activeLang.toUpperCase()}</label>
                    <textarea
                        className="wallet-form-control wallet-admin-note"
                        rows={2}
                        value={formData.description[activeLang] || ''}
                        onChange={e => setFormData({ ...formData, description: { ...formData.description, [activeLang]: e.target.value } })}
                        placeholder={`Description in ${activeLang}…`}
                        style={{ minHeight: 70 }}
                    />
                </div>

                <div className="wallet-form-row">
                    <div className="wallet-form-group" style={{ marginBottom: 0 }}>
                        <label className="wallet-form-label">Sort Order</label>
                        <input
                            className="wallet-form-control"
                            type="number"
                            min="0"
                            value={formData.sort_order}
                            onChange={e => setFormData({ ...formData, sort_order: e.target.value })}
                        />
                        <div className="wallet-form-hint">Lower = appears first</div>
                    </div>
                    <div className="wallet-form-group" style={{ marginBottom: 0 }}>
                        <label className="wallet-form-label">Active Status</label>
                        <div
                            className="wallet-toggle-row"
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        >
                            <span className="wallet-toggle-label">
                                {formData.is_active ? '✅ Method is Active' : '🔴 Method is Inactive'}
                            </span>
                            <Toggle
                                checked={formData.is_active}
                                onChange={(c) => setFormData({ ...formData, is_active: c })}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

/* ── Page wrapper ──────────────────────────────────────────── */
const PaymentMethods = () => {
    const [activeLang, setActiveLang] = useState('en');
    const [languages, setLanguages]   = useState([]);

    useEffect(() => {
        axios.get('/api/admin/languages').then(({ data }) => setLanguages(data)).catch(() => {});
    }, []);

    return (
        <div className="wallet-page">
            {/* Header */}
            <div className="wallet-page-header">
                <div className="wallet-page-header-left">
                    <div className="wallet-page-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                        <FaCreditCard />
                    </div>
                    <div>
                        <h1 className="wallet-page-title">Payment Methods</h1>
                        <p className="wallet-page-subtitle">Manage available payment gateways and their translations</p>
                    </div>
                </div>
                {languages.length > 0 && (
                    <div className="wallet-header-actions">
                        <div style={{ width: 200 }}>
                            <AdminSearchSelect
                                options={languages.map(l => ({ label: l.name, value: l.code }))}
                                value={activeLang}
                                onChange={setActiveLang}
                                placeholder="Select Language…"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Inner list */}
            <div style={{ padding: '0 28px 28px' }}>
                <PaymentMethodsList activeGlobalLang={activeLang} />
            </div>
        </div>
    );
};

export default PaymentMethods;
