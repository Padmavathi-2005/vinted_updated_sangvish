import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import {
    FaUniversity, FaMobileAlt, FaPaypal, FaSearch, FaSync,
    FaWallet, FaUsers, FaShieldAlt
} from 'react-icons/fa';
import Table from '../components/Table';
import axios from '../utils/axios';
import '../styles/WalletPages.css';

/* ── helpers ─────────────────────────────────────────────── */
const getInitials = (name = '') => name.slice(0, 2).toUpperCase() || 'U?';

const TypeIcon = ({ type }) => {
    if (type === 'Bank') return <FaUniversity />;
    if (type === 'UPI') return <FaMobileAlt />;
    if (type === 'PayPal') return <FaPaypal />;
    return <FaWallet />;
};

const typeClass = (type) => {
    if (type === 'Bank') return 'bank';
    if (type === 'UPI') return 'upi';
    if (type === 'PayPal') return 'paypal';
    return 'card';
};

/* ── Component ───────────────────────────────────────────── */
const UserPayoutMethods = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => { fetchMethods(); }, []);

    const fetchMethods = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const { data } = await axios.get('/api/admin/payout-methods');
            setMethods(data);
        } catch (err) {
            console.error('Error fetching payout methods:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /* ── Stats ─────────────────────────────────────────────── */
    const stats = useMemo(() => {
        const banks = methods.filter(m => m.payout_type === 'Bank').length;
        const upis = methods.filter(m => m.payout_type === 'UPI').length;
        const paypals = methods.filter(m => m.payout_type === 'PayPal').length;
        const defaults = methods.filter(m => m.is_default).length;
        return { total: methods.length, banks, upis, paypals, defaults };
    }, [methods]);

    /* ── Filtered ──────────────────────────────────────────── */
    const filteredData = useMemo(() => {
        return methods.filter(m => {
            const term = searchTerm.toLowerCase();
            const matchSearch =
                m.user_id?.username?.toLowerCase().includes(term) ||
                m.user_id?.email?.toLowerCase().includes(term) ||
                m.bank_name?.toLowerCase().includes(term) ||
                m.upi_id?.toLowerCase().includes(term) ||
                m.paypal_email?.toLowerCase().includes(term);
            const matchType = filterType === 'all' || m.payout_type === filterType;
            return matchSearch && matchType;
        });
    }, [methods, searchTerm, filterType]);

    /* ── Columns ───────────────────────────────────────────── */
    const columns = [
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
            header: 'Type',
            accessor: 'payout_type',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className={`wallet-pm-icon ${typeClass(row.payout_type)}`}>
                        <TypeIcon type={row.payout_type} />
                    </div>
                    <div>
                        <div className="wallet-pm-name">{row.payout_type}</div>
                        {row.is_default && (
                            <span className="wallet-badge wallet-badge-info" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                Default
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Account Details',
            accessor: 'details',
            render: (row) => {
                if (row.payout_type === 'Bank') return (
                    <div className="wallet-payout-detail">
                        <div><strong>{row.bank_name}</strong></div>
                        <div>{row.account_holder_name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                            {'·'.repeat(8)}{String(row.account_number || '').slice(-4)}
                            {row.ifsc_code ? ` · ${row.ifsc_code}` : ''}
                        </div>
                    </div>
                );
                if (row.payout_type === 'UPI') return (
                    <div className="wallet-payout-detail">
                        <strong>{row.upi_id}</strong>
                    </div>
                );
                return (
                    <div className="wallet-payout-detail">
                        <strong>{row.paypal_email}</strong>
                    </div>
                );
            }
        },
        {
            header: 'Location',
            accessor: 'branch_city',
            render: (row) => row.payout_type === 'Bank'
                ? <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{[row.branch_city, row.country].filter(Boolean).join(', ') || '—'}</span>
                : <span style={{ color: '#94a3b8' }}>—</span>
        },
        {
            header: 'Default',
            accessor: 'is_default',
            render: (row) => row.is_default
                ? <FaShieldAlt style={{ color: '#0ea5e9', fontSize: '1rem' }} title="Default method" />
                : <span style={{ color: '#e2e8f0', fontSize: '1rem' }}>—</span>
        }
    ];

    /* ── Mobile card ───────────────────────────────────────── */
    const MobileCard = ({ row }) => (
        <div className="wallet-mobile-card">
            <div className="wallet-mobile-card-header">
                <div className="wallet-user-cell">
                    <div className={`wallet-pm-icon ${typeClass(row.payout_type)}`}>
                        <TypeIcon type={row.payout_type} />
                    </div>
                    <div>
                        <div className="wallet-user-name">{row.payout_type}</div>
                        {row.is_default && (
                            <span className="wallet-badge wallet-badge-info" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Default</span>
                        )}
                    </div>
                </div>
                <div className="wallet-user-cell">
                    <div className="wallet-user-avatar">{getInitials(row.user_id?.username)}</div>
                    <div>
                        <div className="wallet-user-name">{row.user_id?.username || 'Unknown'}</div>
                        <div className="wallet-user-email">{row.user_id?.email || '—'}</div>
                    </div>
                </div>
            </div>
            {row.payout_type === 'Bank' && (
                <>
                    <div className="wallet-mobile-card-row">
                        <span className="wallet-mobile-card-key">Bank</span>
                        <span className="wallet-mobile-card-val">{row.bank_name}</span>
                    </div>
                    <div className="wallet-mobile-card-row">
                        <span className="wallet-mobile-card-key">Account</span>
                        <span className="wallet-mobile-card-val" style={{ fontFamily: 'monospace' }}>····{String(row.account_number || '').slice(-4)}</span>
                    </div>
                    <div className="wallet-mobile-card-row">
                        <span className="wallet-mobile-card-key">IFSC</span>
                        <span className="wallet-mobile-card-val">{row.ifsc_code}</span>
                    </div>
                </>
            )}
            {row.payout_type === 'UPI' && (
                <div className="wallet-mobile-card-row">
                    <span className="wallet-mobile-card-key">UPI ID</span>
                    <span className="wallet-mobile-card-val">{row.upi_id}</span>
                </div>
            )}
            {row.payout_type === 'PayPal' && (
                <div className="wallet-mobile-card-row">
                    <span className="wallet-mobile-card-key">Email</span>
                    <span className="wallet-mobile-card-val">{row.paypal_email}</span>
                </div>
            )}
            {row.branch_city && (
                <div className="wallet-mobile-card-row">
                    <span className="wallet-mobile-card-key">Location</span>
                    <span className="wallet-mobile-card-val">{[row.branch_city, row.country].filter(Boolean).join(', ')}</span>
                </div>
            )}
        </div>
    );

    /* ── Render ────────────────────────────────────────────── */
    return (
        <div className="wallet-page">

            {/* Header */}
            <div className="wallet-page-header">
                <div className="wallet-page-header-left">
                    <div className="wallet-page-icon" style={{ background: 'linear-gradient(135deg,#14b8a6,#0f766e)' }}>
                        <FaUniversity />
                    </div>
                    <div>
                        <h1 className="wallet-page-title">User Payout Methods</h1>
                        <p className="wallet-page-subtitle">Saved bank and payout accounts of all users</p>
                    </div>
                </div>
                <div className="wallet-header-actions">
                </div>
            </div>

            {/* Stats */}
            <div className="wallet-stats-row">
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap blue"><FaUsers /></div>
                    <div><div className="wallet-stat-value">{stats.total}</div><div className="wallet-stat-label">Total Methods</div></div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap blue"><FaUniversity /></div>
                    <div><div className="wallet-stat-value">{stats.banks}</div><div className="wallet-stat-label">Bank Accounts</div></div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap green"><FaMobileAlt /></div>
                    <div><div className="wallet-stat-value">{stats.upis}</div><div className="wallet-stat-label">UPI IDs</div></div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap purple"><FaPaypal /></div>
                    <div><div className="wallet-stat-value">{stats.paypals}</div><div className="wallet-stat-label">PayPal</div></div>
                </div>
            </div>

            {/* Main card */}
            <div className="wallet-content-card">
                {/* Controls */}
                <div className="wallet-controls">
                    <div className="wallet-controls-left">
                        <div className="wallet-search-wrap search-box-container">
                            <FaSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none' }} />
                            <input
                                className="wallet-search-input"
                                placeholder="Search user, bank, UPI, email…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="wallet-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="all">All Types</option>
                            <option value="Bank">Bank</option>
                            <option value="UPI">UPI</option>
                            <option value="PayPal">PayPal</option>
                        </select>
                    </div>
                    <div className="wallet-controls-right" style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                        {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {loading ? (
                    <div className="wallet-loading"><Spinner animation="border" variant="primary" size="sm" /> Loading payout methods…</div>
                ) : filteredData.length === 0 ? (
                    <div className="wallet-empty">
                        <div className="wallet-empty-icon"><FaUniversity /></div>
                        <div className="wallet-empty-title">No payout methods found</div>
                        <div className="wallet-empty-sub">Users' registered payout methods will appear here</div>
                    </div>
                ) : (
                    <>
                        <div className="wallet-table-wrapper">
                            <Table columns={columns} data={filteredData} pagination={true} emptyMessage="No payout methods found" />
                        </div>
                        <div className="wallet-mobile-list">
                            {filteredData.map((row, i) => <MobileCard key={row._id || i} row={row} />)}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default UserPayoutMethods;
