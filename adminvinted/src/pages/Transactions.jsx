import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import {
    FaExchangeAlt, FaSearch, FaSync, FaDownload, FaFileCsv, FaFilePdf,
    FaChevronDown, FaArrowUp, FaArrowDown, FaCheckCircle, FaTimesCircle,
    FaClock, FaWallet, FaMoneyBillWave, FaUserCircle
} from 'react-icons/fa';
import Table from '../components/Table';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/WalletPages.css';

/* ── helpers ─────────────────────────────────────────────── */
const getInitials = (name = '') => name.slice(0, 2).toUpperCase() || 'U?';

const statusVariant = { completed: 'success', pending: 'pending', failed: 'danger', refunded: 'info' };
const typeVariant = { credit: 'credit', debit: 'debit' };

const purposeLabel = (p = '') =>
    p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/* ── Component ───────────────────────────────────────────── */
const Transactions = () => {
    const { formatPrice } = useLocalization();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    useEffect(() => { fetchTransactions(); }, []);

    /* close export dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/admin/transactions');
            setTransactions(data);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    /* ── Derived data ──────────────────────────────────────── */
    const filteredData = useMemo(() => {
        return transactions.filter(t => {
            const term = searchTerm.toLowerCase();
            const matchSearch =
                t.user_id?.username?.toLowerCase().includes(term) ||
                t.user_id?.email?.toLowerCase().includes(term) ||
                t.purpose?.toLowerCase().includes(term);
            const matchType = filterType === 'all' || t.type === filterType;
            const matchStatus = filterStatus === 'all' || t.status === filterStatus;
            return matchSearch && matchType && matchStatus;
        });
    }, [transactions, searchTerm, filterType, filterStatus]);

    const stats = useMemo(() => {
        const credits = transactions.filter(t => t.type === 'credit');
        const debits = transactions.filter(t => t.type !== 'credit');
        const pending = transactions.filter(t => t.status === 'pending').length;
        const totalIn = credits.reduce((s, t) => s + (t.amount || 0), 0);
        const totalOut = debits.reduce((s, t) => s + (t.amount || 0), 0);
        return { total: transactions.length, totalIn, totalOut, pending };
    }, [transactions]);

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
                        <div className="wallet-user-name">{row.user_id?.username || 'System'}</div>
                        <div className="wallet-user-email">{row.user_id?.email || '—'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Type',
            accessor: 'type',
            render: (row) => (
                <span className={`wallet-badge wallet-badge-${typeVariant[row.type] || 'secondary'}`}>
                    {row.type === 'credit' ? <FaArrowDown size={9} /> : <FaArrowUp size={9} />}
                    {row.type?.toUpperCase()}
                </span>
            )
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => (
                <span className={row.type === 'credit' ? 'wallet-amount-credit' : 'wallet-amount-debit'}>
                    {row.type === 'credit' ? '+' : '−'}{formatPrice(row.amount)}
                </span>
            )
        },
        {
            header: 'Purpose',
            accessor: 'purpose',
            render: (row) => (
                <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                    {purposeLabel(row.purpose)}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span className={`wallet-badge wallet-badge-${statusVariant[row.status] || 'secondary'}`}>
                    {row.status?.toUpperCase()}
                </span>
            )
        }
    ];

    /* ── Export helpers ────────────────────────────────────── */
    const exportToCSV = () => {
        if (!filteredData.length) return;
        setExportOpen(false);
        const headers = ['Date', 'User', 'Email', 'Type', 'Amount', 'Purpose', 'Status'];
        const rows = filteredData.map(t => [
            new Date(t.created_at).toLocaleDateString(),
            t.user_id?.username || 'System',
            t.user_id?.email || '',
            t.type?.toUpperCase() || '',
            `${t.type === 'credit' ? '+' : '-'}${t.amount}`,
            purposeLabel(t.purpose),
            t.status?.toUpperCase() || ''
        ].map(v => `"${v}"`).join(','));
        const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: `transactions_${new Date().toISOString().slice(0, 10)}.csv`
        });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (!filteredData.length) return;
        setExportOpen(false);
        const doc = new jsPDF();
        doc.setFontSize(16); doc.setFont(undefined, 'bold');
        doc.text('Transactions Report', 14, 20);
        doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        autoTable(doc, {
            head: [['Date', 'User', 'Type', 'Amount', 'Purpose', 'Status']],
            body: filteredData.map(t => [
                new Date(t.created_at).toLocaleDateString(),
                t.user_id?.username || 'System',
                t.type?.toUpperCase() || '',
                `${t.type === 'credit' ? '+' : '−'}${formatPrice(t.amount)}`,
                purposeLabel(t.purpose),
                t.status?.toUpperCase() || ''
            ]),
            startY: 34,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [14, 165, 233] },
        });
        doc.save(`transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    /* ── Mobile card list ──────────────────────────────────── */
    const MobileCard = ({ row }) => (
        <div className="wallet-mobile-card">
            <div className="wallet-mobile-card-header">
                <div className="wallet-user-cell">
                    <div className="wallet-user-avatar">{getInitials(row.user_id?.username)}</div>
                    <div>
                        <div className="wallet-user-name">{row.user_id?.username || 'System'}</div>
                        <div className="wallet-user-email">{new Date(row.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <span className={row.type === 'credit' ? 'wallet-amount-credit' : 'wallet-amount-debit'} style={{ fontSize: '1.1rem' }}>
                    {row.type === 'credit' ? '+' : '−'}{formatPrice(row.amount)}
                </span>
            </div>
            <div className="wallet-mobile-card-row">
                <span className="wallet-mobile-card-key">Type</span>
                <span className={`wallet-badge wallet-badge-${typeVariant[row.type] || 'secondary'}`}>{row.type?.toUpperCase()}</span>
            </div>
            <div className="wallet-mobile-card-row">
                <span className="wallet-mobile-card-key">Purpose</span>
                <span className="wallet-mobile-card-val">{purposeLabel(row.purpose)}</span>
            </div>
            <div className="wallet-mobile-card-row">
                <span className="wallet-mobile-card-key">Status</span>
                <span className={`wallet-badge wallet-badge-${statusVariant[row.status] || 'secondary'}`}>{row.status?.toUpperCase()}</span>
            </div>
        </div>
    );

    /* ── Render ────────────────────────────────────────────── */
    return (
        <div className="wallet-page">

            {/* Header */}
            <div className="wallet-page-header">
                <div className="wallet-page-header-left">
                    <div className="wallet-page-icon"><FaExchangeAlt /></div>
                    <div>
                        <h1 className="wallet-page-title">Transactions</h1>
                        <p className="wallet-page-subtitle">All financial records across the platform</p>
                    </div>
                </div>
                <div className="wallet-header-actions">
                    <div ref={exportRef} style={{ position: 'relative' }}>
                        <button
                            className="wallet-btn wallet-btn-primary"
                            onClick={() => setExportOpen(o => !o)}
                        >
                            <FaDownload /><span>Export</span><FaChevronDown size={10} />
                        </button>
                        {exportOpen && (
                            <div className="wallet-export-menu" style={{
                                position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 200
                            }}>
                                <button className="wallet-export-item" onClick={exportToCSV}>
                                    <FaFileCsv style={{ color: '#16a34a' }} /> Export CSV
                                </button>
                                <button className="wallet-export-item" onClick={exportToPDF}>
                                    <FaFilePdf style={{ color: '#dc2626' }} /> Export PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="wallet-stats-row">
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap blue"><FaExchangeAlt /></div>
                    <div className="wallet-stat-content">
                        <div className="wallet-stat-value">{stats.total}</div>
                        <div className="wallet-stat-label">Total Transactions</div>
                    </div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap green"><FaArrowDown /></div>
                    <div className="wallet-stat-content">
                        <div className="wallet-stat-value">{formatPrice(stats.totalIn)}</div>
                        <div className="wallet-stat-label">Total Credits</div>
                    </div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap red"><FaArrowUp /></div>
                    <div className="wallet-stat-content">
                        <div className="wallet-stat-value">{formatPrice(stats.totalOut)}</div>
                        <div className="wallet-stat-label">Total Debits</div>
                    </div>
                </div>
                <div className="wallet-stat-card">
                    <div className="wallet-stat-icon-wrap amber"><FaClock /></div>
                    <div className="wallet-stat-content">
                        <div className="wallet-stat-value">{stats.pending}</div>
                        <div className="wallet-stat-label">Pending</div>
                    </div>
                </div>
            </div>

            {/* Main card */}
            <div className="wallet-content-card">
                {/* Controls */}
                <div className="wallet-controls">
                    <div className="wallet-controls-left">
                        <div className="wallet-search-wrap search-box-container">
                            <FaSearch className="search-icon" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none' }} />
                            <input
                                className="wallet-search-input"
                                placeholder="Search user, email, purpose…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="wallet-filter-select"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="credit">Credit</option>
                            <option value="debit">Debit</option>
                        </select>
                        <select
                            className="wallet-filter-select"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div className="wallet-controls-right" style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                        {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Table (desktop) */}
                {loading ? (
                    <div className="wallet-loading">
                        <Spinner animation="border" variant="primary" size="sm" />
                        Loading transactions…
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="wallet-empty">
                        <div className="wallet-empty-icon"><FaWallet /></div>
                        <div className="wallet-empty-title">No transactions found</div>
                        <div className="wallet-empty-sub">Try adjusting your filters or refresh the list</div>
                    </div>
                ) : (
                    <>
                        <div className="wallet-table-wrapper">
                            <Table
                                columns={columns}
                                data={filteredData}
                                pagination={true}
                                emptyMessage="No transactions found"
                            />
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

export default Transactions;
