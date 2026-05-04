import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import {
    FaRegMoneyBillAlt, FaSearch, FaSync, FaCheck, FaTimes, FaCommentDots,
    FaClock, FaCheckCircle, FaTimesCircle, FaWallet, FaUniversity,
    FaMobileAlt, FaPaypal
} from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import axios from '../utils/axios';
import { showToast } from '../utils/swal';
import { useLocalization } from '../context/LocalizationContext';
import '../styles/WalletPages.css';

/* ── helpers ─────────────────────────────────────────────── */
const getInitials = (name = '') => name.slice(0, 2).toUpperCase() || 'U?';

const statusConf = {
    approved: { cls: 'success', label: 'Approved' },
    pending: { cls: 'pending', label: 'Pending' },
    rejected: { cls: 'danger', label: 'Rejected' },
    completed: { cls: 'info', label: 'Completed' },
};

const PayoutIcon = ({ method }) => {
    if (method === 'Bank') return <FaUniversity />;
    if (method === 'UPI') return <FaMobileAlt />;
    if (method === 'PayPal') return <FaPaypal />;
    return <FaWallet />;
};

const PayoutIconClass = (method) => {
    if (method === 'Bank') return 'bank';
    if (method === 'UPI') return 'upi';
    if (method === 'PayPal') return 'paypal';
    return 'card';
};

/* ── Component ───────────────────────────────────────────── */
const WithdrawalRequests = () => {
    const { formatPrice } = useLocalization();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [statusUpdate, setStatusUpdate] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const { data } = await axios.get('/api/admin/withdrawal-requests');
            setRequests(data);
        } catch (err) {
            showToast('error', 'Failed to load withdrawal requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const openAction = (request, status) => {
        setSelected(request);
        setStatusUpdate(status);
        setAdminNote(request.admin_note || '');
        setShowModal(true);
    };

    const confirmAction = async () => {
        try {
            setSaving(true);
            await axios.put(`/api/admin/withdrawal-requests/${selected._id}`, {
                status: statusUpdate,
                admin_note: adminNote,
                processed_at: new Date()
            });
            const successMsg = statusUpdate === 'approved' 
                ? 'Withdrawal Approved Successfully' 
                : 'Withdrawal Rejected Successfully';
            
            showToast('success', successMsg);
            setShowModal(false);
            fetchRequests();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to update request');
        } finally {
            setSaving(false);
        }
    };

    /* ── Stats ─────────────────────────────────────────────── */
    const stats = useMemo(() => {
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;
        const totalAmt = requests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0);
        return { pending, approved, rejected, totalAmt, total: requests.length };
    }, [requests]);

    /* ── Filtered data ─────────────────────────────────────── */
    const filteredData = useMemo(() => {
        return requests.filter(r => {
            const term = searchTerm.toLowerCase();
            const matchSearch =
                r.user_id?.username?.toLowerCase().includes(term) ||
                r.user_id?.email?.toLowerCase().includes(term) ||
                r.payment_method?.toLowerCase().includes(term);
            const matchStatus = filterStatus === 'all' || r.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [requests, searchTerm, filterStatus]);

    /* ── Columns ───────────────────────────────────────────── */
    const columns = [
        {
            header: 'Date',
            accessor: 'created_at',
            render: (row) => (
                <div style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>
                        {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            header: 'User',
            accessor: 'user',
            render: (row) => (
                <div className="wallet-user-cell">
                    <div className="wallet-user-avatar">{getInitials(row.user_id?.username)}</div>
                    <div>
                        <div className="wallet-user-name">{row.user_id?.username || 'Unknown'}</div>
                        <div className="wallet-user-email">{row.user_id?.email || '—'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => (
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1a2332' }}>
                    {row.currency || 'INR'} {Number(row.amount).toLocaleString()}
                </span>
            )
        },
        {
            header: 'Payout Method',
            accessor: 'payment_method',
            render: (row) => {
                const d = row.payment_details;
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div className={`wallet-pm-icon ${PayoutIconClass(row.payment_method)}`}>
                            <PayoutIcon method={row.payment_method} />
                        </div>
                        <div>
                            <div className="wallet-pm-name">{row.payment_method || 'N/A'}</div>
                            <div className="wallet-user-email">
                                {row.payment_method === 'Bank' && d && `${d.bank_name} ···${String(d.account_number || '').slice(-4)}`}
                                {row.payment_method === 'UPI' && d && d.upi_id}
                                {row.payment_method === 'PayPal' && d && d.paypal_email}
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const conf = statusConf[row.status] || { cls: 'secondary', label: row.status };
                return <span className={`wallet-badge wallet-badge-${conf.cls}`}>{conf.label.toUpperCase()}</span>;
            }
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (row) => row.status !== 'pending' ? (
                <span className="wallet-processed-label">Processed</span>
            ) : (
                <div className="wallet-row-actions">
                    <button
                        className="wallet-action-btn approve"
                        onClick={() => openAction(row, 'approved')}
                        title="Approve"
                    >
                        <FaCheck size={12} />
                    </button>
                    <button
                        className="wallet-action-btn reject"
                        onClick={() => openAction(row, 'rejected')}
                        title="Reject"
                    >
                        <FaTimes size={12} />
                    </button>
                </div>
            )
        }
    ];

    /* ── Mobile card ───────────────────────────────────────── */
    const MobileCard = ({ row }) => {
        const conf = statusConf[row.status] || { cls: 'secondary', label: row.status };
        return (
            <div className="wallet-mobile-card">
                <div className="wallet-mobile-card-header">
                    <div className="wallet-user-cell">
                        <div className="wallet-user-avatar">{getInitials(row.user_id?.username)}</div>
                        <div>
                            <div className="wallet-user-name">{row.user_id?.username || 'Unknown'}</div>
                            <div className="wallet-user-email">{new Date(row.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1a2332', fontSize: '1rem' }}>
                        {row.currency || 'INR'} {Number(row.amount).toLocaleString()}
                    </span>
                </div>
                <div className="wallet-mobile-card-row">
                    <span className="wallet-mobile-card-key">Method</span>
                    <span className="wallet-mobile-card-val">{row.payment_method}</span>
                </div>
                <div className="wallet-mobile-card-row">
                    <span className="wallet-mobile-card-key">Status</span>
                    <span className={`wallet-badge wallet-badge-${conf.cls}`}>{conf.label.toUpperCase()}</span>
                </div>
                {row.status === 'pending' && (
                    <div className="wallet-mobile-card-actions">
                        <button className="wallet-btn wallet-btn-success wallet-btn-sm" onClick={() => openAction(row, 'approved')}>
                            <FaCheck size={11} /> Approve
                        </button>
                        <button className="wallet-btn wallet-btn-danger wallet-btn-sm" onClick={() => openAction(row, 'rejected')}>
                            <FaTimes size={11} /> Reject
                        </button>
                    </div>
                )}
            </div>
        );
    };

    /* ── Render ────────────────────────────────────────────── */
    return (
        <div className="wallet-page">

            {/* Header */}
            <div className="wallet-page-header">
                <div className="wallet-page-header-left">
                    <div className="wallet-page-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                        <FaRegMoneyBillAlt />
                    </div>
                    <div>
                        <h1 className="wallet-page-title">Withdrawal Requests</h1>
                        <p className="wallet-page-subtitle">Review and process user payout requests</p>
                    </div>
                </div>
                <div className="wallet-header-actions">
                    <button className="wallet-btn wallet-btn-outline" onClick={() => fetchRequests(true)} disabled={refreshing}>
                        <FaSync className={refreshing ? 'spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="wallet-stats-row">
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap blue"><FaWallet /></div>
                    <div><div className="wallet-stat-value">{stats.total}</div><div className="wallet-stat-label">Total Requests</div></div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap amber"><FaClock /></div>
                    <div><div className="wallet-stat-value">{stats.pending}</div><div className="wallet-stat-label">Pending</div></div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap green"><FaCheckCircle /></div>
                    <div><div className="wallet-stat-value">{stats.approved}</div><div className="wallet-stat-label">Approved</div></div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap red"><FaTimesCircle /></div>
                    <div><div className="wallet-stat-value">{stats.rejected}</div><div className="wallet-stat-label">Rejected</div></div>
                </div>
            </div>

            {/* Main card */}
            <div className="wallet-content-card">
                {/* Controls */}
                <div className="wallet-controls">
                    <div className="wallet-controls-left">
                        <div className="wallet-search-wrap">
                            <FaSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none' }} />
                            <input
                                className="wallet-search-input"
                                placeholder="Search user, email, method…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="wallet-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <div className="wallet-controls-right" style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                        {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {loading ? (
                    <div className="wallet-loading"><Spinner animation="border" variant="primary" size="sm" /> Loading requests…</div>
                ) : filteredData.length === 0 ? (
                    <div className="wallet-empty">
                        <div className="wallet-empty-icon"><FaRegMoneyBillAlt /></div>
                        <div className="wallet-empty-title">No withdrawal requests found</div>
                        <div className="wallet-empty-sub">All pending requests will appear here</div>
                    </div>
                ) : (
                    <>
                        <div className="wallet-table-wrapper">
                            <Table columns={columns} data={filteredData} pagination={true} emptyMessage="No requests found" />
                        </div>
                        <div className="wallet-mobile-list">
                            {filteredData.map((row, i) => <MobileCard key={row._id || i} row={row} />)}
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation Modal */}
            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                title={statusUpdate === 'approved' ? '✅ Approve Withdrawal' : '❌ Reject Withdrawal'}
                size="md"
                footer={
                    <>
                        <button className="wallet-btn wallet-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                        <button
                            className={`wallet-btn ${statusUpdate === 'approved' ? 'wallet-btn-success' : 'wallet-btn-danger'}`}
                            onClick={confirmAction}
                            disabled={saving}
                        >
                            {saving ? <Spinner size="sm" animation="border" /> : (statusUpdate === 'approved' ? 'Confirm Approval' : 'Confirm Rejection')}
                        </button>
                    </>
                }
            >
                {/* Amount summary */}
                <div className="wallet-confirm-box">
                    <div className="wallet-confirm-label">Withdrawal Request</div>
                    <div className="wallet-confirm-amount">
                        {selected?.currency || 'INR'} {Number(selected?.amount || 0).toLocaleString()}
                    </div>
                    <div className="wallet-confirm-label">
                        by <strong>{selected?.user_id?.username}</strong>
                    </div>
                </div>

                {/* Payout details */}
                <div style={{ marginBottom: 16 }}>
                    <label className="wallet-form-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className={`wallet-pm-icon ${PayoutIconClass(selected?.payment_method)}`} style={{ width: 24, height: 24, borderRadius: 6, fontSize: '0.75rem' }}>
                            <PayoutIcon method={selected?.payment_method} />
                        </div>
                        Payout Details — {selected?.payment_method}
                    </label>
                    <div className="wallet-payout-box">
                        {selected?.payment_method === 'Bank' && selected?.payment_details && (
                            <>
                                <div className="wallet-payout-row">
                                    <span className="wallet-payout-row-key">Bank</span>
                                    <span className="wallet-payout-row-val">{selected.payment_details.bank_name}</span>
                                </div>
                                <div className="wallet-payout-row">
                                    <span className="wallet-payout-row-key">Holder</span>
                                    <span className="wallet-payout-row-val">{selected.payment_details.account_holder_name}</span>
                                </div>
                                <div className="wallet-payout-row">
                                    <span className="wallet-payout-row-key">Account</span>
                                    <span className="wallet-payout-row-val">{selected.payment_details.account_number}</span>
                                </div>
                                <div className="wallet-payout-row">
                                    <span className="wallet-payout-row-key">IFSC</span>
                                    <span className="wallet-payout-row-val">{selected.payment_details.ifsc_code}</span>
                                </div>
                                {selected.payment_details.branch_city && (
                                    <div className="wallet-payout-row">
                                        <span className="wallet-payout-row-key">Branch</span>
                                        <span className="wallet-payout-row-val">{selected.payment_details.branch_city}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {selected?.payment_method === 'UPI' && (
                            <div className="wallet-payout-row">
                                <span className="wallet-payout-row-key">UPI ID</span>
                                <span className="wallet-payout-row-val">{selected?.payment_details?.upi_id}</span>
                            </div>
                        )}
                        {selected?.payment_method === 'PayPal' && (
                            <div className="wallet-payout-row">
                                <span className="wallet-payout-row-key">Email</span>
                                <span className="wallet-payout-row-val">{selected?.payment_details?.paypal_email}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin note */}
                <div className="wallet-form-group">
                    <label className="wallet-form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FaCommentDots /> Admin Note {statusUpdate === 'rejected' ? '(required)' : '(optional)'}
                    </label>
                    <textarea
                        className="wallet-admin-note"
                        placeholder={statusUpdate === 'rejected'
                            ? 'Please explain why this request is rejected…'
                            : 'Optional: add a transaction ID or reference…'}
                        value={adminNote}
                        onChange={e => setAdminNote(e.target.value)}
                        rows={3}
                    />
                    <div className="wallet-form-hint">
                        {statusUpdate === 'rejected'
                            ? 'This note will be visible to the user.'
                            : 'Include UTR / transaction reference for user records.'}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WithdrawalRequests;
