import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaUserPlus, FaShoppingBag, FaMoneyBillAlt, FaTshirt, FaTags, FaTruck, FaArrowRight, FaUsers, FaShoppingCart, FaStore, FaChartLine, FaWallet, FaCheckCircle, FaThLarge } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { safeString, getImageUrl } from '../utils/constants';
import '../styles/Admin.css';
import '../styles/RentalDashboard.css';

const AdminDashboard = () => {
    const { formatPrice, t } = useLocalization();
    const [stats, setStats] = useState({
        users: { total: 0, today: 0, buyers: 0, sellers: 0 },
        revenue: { total: 0, count: 0 },
        property: { total: 0, today: 0 },
        experience: { total: 0, today: 0 },
        reservation: { total: 0, today: 0 },
        commission: { total: 0 },
        latestBookings: [],
        latestProperties: [],
        topSellers: [],
        monthlySales: Array.from({ length: 12 }, () => ({ sales: 0, month: '', count: 0 }))
    });
    const [loading, setLoading] = useState(true);
    const [hoveredPoint, setHoveredPoint] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get('/api/admin/dashboard');
                setStats(data);
            } catch (error) {
                console.error('Dashboard Stats Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatTotal = (num) => num?.toLocaleString() || '0';

    // Calculate dynamic graph points
    const maxSales = Math.max(...(stats.monthlySales?.map(m => m.sales) || [100]), 100);
    const generatePath = () => {
        if (!stats.monthlySales || stats.monthlySales.length === 0) return "";
        const points = stats.monthlySales.map((m, i) => {
            const x = (i / 11) * 900 + 50;
            const y = 300 - ((m.sales / maxSales) * 250 + 25);
            return { x, y };
        });

        let path = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const cp1x = current.x + (next.x - current.x) / 2;
            const cp1y = current.y;
            const cp2x = current.x + (next.x - current.x) / 2;
            const cp2y = next.y;
            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
        }
        return path;
    };

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">{t('dashboard.overview')}</h2>
                            <p className="text-muted small mb-0">{t('dashboard.metrics')}</p>
                        </div>
                    </div>

                    <Row className="g-4 mb-4">
                        <Col lg={6}>
                            <h5 className="fw-bold mb-3">{t('dashboard.users.title')}</h5>
                            <Row className="g-3 mb-4">
                                <Col sm={6}>
                                    <Link to="/users" className="stat-card-link">
                                        <div className="stat-card bg-r-blue">
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.users?.total)}</div>
                                                <div className="stat-label">{t('dashboard.users.total')}</div>
                                            </div>
                                            <div className="stat-icon"><FaUsers /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/users?filter=today" className="stat-card-link">
                                        <div className="stat-card bg-r-teal" style={{ background: 'linear-gradient(135deg, #20c997, #198754)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.users?.today)}</div>
                                                <div className="stat-label">{t('dashboard.users.today')}</div>
                                            </div>
                                            <div className="stat-icon"><FaUserPlus /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/users?filter=buyer" className="stat-card-link">
                                        <div className="stat-card bg-r-orange">
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.users?.buyers)}</div>
                                                <div className="stat-label">{t('dashboard.users.buyers')}</div>
                                            </div>
                                            <div className="stat-icon"><FaShoppingCart /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/users?filter=seller" className="stat-card-link">
                                        <div className="stat-card bg-r-purple">
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.users?.sellers)}</div>
                                                <div className="stat-label">{t('dashboard.users.sellers')}</div>
                                            </div>
                                            <div className="stat-icon"><FaStore /></div>
                                        </div>
                                    </Link>
                                </Col>
                            </Row>

                            <h5 className="fw-bold mb-3 mt-2">{t('dashboard.listings.title')}</h5>
                            <Row className="g-3 mb-4">
                                <Col sm={6}>
                                    <Link to="/listings" className="stat-card-link">
                                        <div className="stat-card bg-r-green">
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.property?.total)}</div>
                                                <div className="stat-label">{t('dashboard.listings.total')}</div>
                                            </div>
                                            <div className="stat-icon"><FaTshirt /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/listings?filter=today" className="stat-card-link">
                                        <div className="stat-card bg-r-indigo">
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.property?.today)}</div>
                                                <div className="stat-label">{t('dashboard.listings.today')}</div>
                                            </div>
                                            <div className="stat-icon"><FaTshirt /></div>
                                        </div>
                                    </Link>
                                </Col>
                            </Row>

                            <div className="d-flex justify-content-between align-items-center mb-3 mt-2">
                                <h5 className="fw-bold mb-0">{t('dashboard.content.pending_withdrawals')}</h5>
                                <Link to="/wallet/withdrawal-requests?filter=pending" className="more-info text-decoration-none d-flex align-items-center gap-1">{t('dashboard.commission.wallet')} <FaArrowRight size={12} /></Link>
                            </div>
                            <Row className="g-3">
                                <Col sm={12}>
                                    <Link to="/wallet/withdrawal-requests?filter=pending" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats.content?.pendingWithdrawals)}</div>
                                                <div className="stat-label">{t('dashboard.content.pending_withdrawals')}</div>
                                            </div>
                                            <div className="stat-icon"><FaMoneyBillAlt /></div>
                                        </div>
                                    </Link>
                                </Col>

                            </Row>
                        </Col>

                        <Col lg={6}>
                            <h5 className="fw-bold mb-3">{t('dashboard.revenue.title')}</h5>
                            <Row className="g-3 mb-4">
                                <Col sm={6}>
                                    <Link to="/reports" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #5b21b6)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatPrice(stats?.revenue?.total)}</div>
                                                <div className="stat-label">{t('dashboard.revenue.total_income')}</div>
                                            </div>
                                            <div className="stat-icon"><FaMoneyBillAlt /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/reports?filter=today" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #d946ef, #a21caf)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatPrice(stats?.revenue?.today)}</div>
                                                <div className="stat-label">{t('dashboard.revenue.today_income')}</div>
                                            </div>
                                            <div className="stat-icon"><FaMoneyBillAlt /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/reports" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.revenue?.count)}</div>
                                                <div className="stat-label">{t('dashboard.revenue.total_sales')}</div>
                                            </div>
                                            <div className="stat-icon"><FaShoppingBag /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/reports?filter=today" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.revenue?.todayCount)}</div>
                                                <div className="stat-label">{t('dashboard.revenue.today_sales')}</div>
                                            </div>
                                            <div className="stat-icon"><FaShoppingBag /></div>
                                        </div>
                                    </Link>
                                </Col>
                            </Row>

                            <h5 className="fw-bold mb-3 mt-2">{t('dashboard.orders.title')}</h5>
                            <Row className="g-3 mb-4">
                                <Col sm={6}>
                                    <Link to="/orders" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.reservation?.total)}</div>
                                                <div className="stat-label">{t('dashboard.orders.total')}</div>
                                            </div>
                                            <div className="stat-icon"><FaTruck /></div>
                                        </div>
                                    </Link>
                                </Col>
                                <Col sm={6}>
                                    <Link to="/orders?filter=today" className="stat-card-link">
                                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #eab308, #a16207)' }}>
                                            <div className="stat-content">
                                                <div className="stat-number">{loading ? '...' : formatTotal(stats?.reservation?.today)}</div>
                                                <div className="stat-label">{t('dashboard.orders.today')}</div>
                                            </div>
                                            <div className="stat-icon"><FaTruck /></div>
                                        </div>
                                    </Link>
                                </Col>
                            </Row>

                            <div className="d-flex justify-content-between align-items-center mb-3 mt-2">
                                <h5 className="fw-bold mb-0">{t('dashboard.commission.title')}</h5>
                                <Link to="/wallet/transactions" className="more-info text-decoration-none d-flex align-items-center gap-1">{t('dashboard.commission.wallet')} <FaArrowRight size={12} /></Link>
                            </div>
                            <Row className="g-3">
                                <Col sm={12}>
                                    <div className="stat-card bg-r-commission">
                                        <div className="stat-content">
                                            <div className="stat-number">{loading ? '...' : formatPrice(stats?.commission?.total)}</div>
                                            <div className="stat-label">{t('dashboard.commission.total_income')}</div>
                                        </div>
                                        <div className="stat-icon"><FaChartLine /></div>
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    <hr className="mt-4 mb-2 opacity-50" />

                    <Row className="g-4 mb-4">
                        <Col lg={12}>
                            <div className="rental-light-panel">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <h5 className="fw-bold mb-0">{t('dashboard.revenue_chart')}</h5>
                                    <Link to="/reports" className="more-info text-decoration-none d-flex align-items-center gap-1">{t('dashboard.full_analysis')} <FaArrowRight size={12} /></Link>
                                </div>
                                <div className="text-muted small">{t('dashboard.revenue_summary', { amount: formatPrice(stats?.revenue?.total), count: stats?.revenue?.count })}</div>

                                <div className="rental-static-chart light-mode">
                                    <div className="chart-grid-text" style={{ bottom: '0%' }}>0</div>
                                    <div className="chart-grid-text" style={{ bottom: '25%' }}>{formatPrice(maxSales * 0.25)}</div>
                                    <div className="chart-grid-text" style={{ bottom: '50%' }}>{formatPrice(maxSales * 0.50)}</div>
                                    <div className="chart-grid-text" style={{ bottom: '75%' }}>{formatPrice(maxSales * 0.75)}</div>
                                    <div className="chart-grid-text" style={{ bottom: '100%' }}>{formatPrice(maxSales)}</div>

                                    <div className="rental-chart-line" style={{ bottom: '0%' }}></div>
                                    <div className="rental-chart-line" style={{ bottom: '25%' }}></div>
                                    <div className="rental-chart-line" style={{ bottom: '50%' }}></div>
                                    <div className="rental-chart-line" style={{ bottom: '75%' }}></div>
                                    <div className="rental-chart-line" style={{ bottom: '100%' }}></div>

                                    <svg className="mock-svg-line" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                        <path d={generatePath()} fill="none" stroke="#0d6efd" strokeWidth="3" />
                                        {stats.monthlySales?.map((m, i) => {
                                            const x = (i / 11) * 900 + 50;
                                            const y = 300 - ((m.sales / maxSales) * 250 + 25);
                                            return (
                                                <g key={i}>
                                                    <circle
                                                        cx={x}
                                                        cy={y}
                                                        r={hoveredPoint?.index === i ? "7" : "5"}
                                                        fill={hoveredPoint?.index === i ? "#0056b3" : "#0d6efd"}
                                                        onMouseEnter={() => setHoveredPoint({ index: i, x, y, ...m })}
                                                        onMouseLeave={() => setHoveredPoint(null)}
                                                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                                    />
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {hoveredPoint && (
                                        <div
                                            className="chart-tooltip"
                                            style={{
                                                position: 'absolute',
                                                left: `${(hoveredPoint.x / 1000) * 100}%`,
                                                top: `${(hoveredPoint.y / 300) * 100}%`,
                                                transform: 'translate(-50%, -120%)',
                                                backgroundColor: '#1a2332',
                                                color: 'white',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                pointerEvents: 'none',
                                                zIndex: 100,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <div style={{ opacity: 0.8, fontSize: '10px', marginBottom: '2px' }}>{hoveredPoint.month}</div>
                                            <div>{formatPrice(hoveredPoint.sales)}</div>
                                            <div style={{ fontSize: '10px', color: '#60a5fa', marginTop: '2px' }}>{hoveredPoint.count} Orders</div>
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '-4px',
                                                left: '50%',
                                                transform: 'translateX(-50%) rotate(45deg)',
                                                width: '8px',
                                                height: '8px',
                                                backgroundColor: '#1a2332'
                                            }}></div>
                                        </div>
                                    )}
                                </div>
                                <div className="chart-months light-mode">
                                    {stats.monthlySales?.map((m, i) => <span key={i}>{m.month}</span>)}
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-4">
                        <Col>
                            <div className="rental-light-panel">
                                <h5 className="fw-bold mb-3 pb-2 border-bottom text-dark">{t('dashboard.latest_bookings')}</h5>
                                <div className="table-responsive rounded shadow-sm border">
                                    <table className="table table-hover table-borderless align-middle mb-0">
                                        <thead className="table-light border-bottom text-secondary">
                                            <tr>
                                                <th className="py-3 px-4">{t('dashboard.table.user')}</th>
                                                <th className="py-3 px-4">{t('dashboard.table.amount')}</th>
                                                <th className="py-3 px-4">{t('dashboard.table.date')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!stats?.latestBookings || stats.latestBookings.length === 0 ? (
                                                <tr><td colSpan="3" className="text-center text-muted py-4">{t('dashboard.no_recent_bookings')}</td></tr>
                                            ) : stats.latestBookings.map((order, idx) => (
                                                <tr key={idx} className="border-bottom">
                                                    <td className="fw-semibold text-primary px-4 py-3"><Link to="/users" className="text-decoration-none">{safeString(order.buyer_id?.username) || 'Guest'}</Link></td>
                                                    <td className="fw-bold px-4 py-3 text-success">{formatPrice(order.total_amount)}</td>
                                                    <td className="text-muted small px-4 py-3">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-4">
                        <Col>
                            <div className="rental-light-panel">
                                <h5 className="fw-bold mb-3 pb-2 border-bottom text-dark">{t('dashboard.latest_listings')}</h5>
                                <div className="table-responsive rounded shadow-sm border">
                                    <table className="table table-borderless table-hover align-middle mb-0">
                                        <thead className="table-light border-bottom text-secondary">
                                            <tr>
                                                <th className="py-3 px-4">{t('dashboard.table.name')}</th>
                                                <th className="py-3 px-4">{t('dashboard.table.seller')}</th>
                                                <th className="py-3 px-4">{t('dashboard.table.date')}</th>
                                                <th className="py-3 px-4">{t('dashboard.table.status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!stats?.latestProperties || stats.latestProperties.length === 0 ? (
                                                <tr><td colSpan="4" className="text-center text-muted py-4">{t('dashboard.no_recent_listings')}</td></tr>
                                            ) : stats.latestProperties.map((item, idx) => (
                                                <tr key={idx} className="border-bottom">
                                                    <td className="fw-semibold text-primary px-4 py-3"><Link to="/listings" className="text-decoration-none">{safeString(item.title)}</Link></td>
                                                    <td className="px-4 py-3"><Link to="/users" className="text-dark text-decoration-none">{safeString(item.seller_id?.username) || 'Seller'}</Link></td>
                                                    <td className="text-muted small px-4 py-3">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3"><span className={`badge bg-${item.status === 'active' ? 'success' : item.status === 'inactive' ? 'secondary' : 'warning'} text-capitalize`}>{t(`common.status.${item.status}`)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-4 g-4">
                        <Col lg={6}>
                            <div className="rental-light-panel h-100">
                                <h5 className="fw-bold mb-3 pb-2 border-bottom text-dark">{t('dashboard.tables.top_sellers')}</h5>
                                <div className="table-responsive rounded shadow-sm border">
                                    <table className="table table-borderless table-hover align-middle mb-0">
                                        <thead className="table-light border-bottom text-secondary">
                                            <tr>
                                                <th className="py-3 px-4" style={{ width: '45%' }}>{t('dashboard.tables.seller')}</th>
                                                <th className="py-3 px-4 text-end">{t('dashboard.tables.total_sales')}</th>
                                                <th className="py-3 px-4 text-end">{t('dashboard.tables.orders_count')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!stats.topSellers || stats.topSellers.length === 0 ? (
                                                <tr><td colSpan="3" className="text-center text-muted py-4">{t('dashboard.tables.no_data')}</td></tr>
                                            ) : stats.topSellers.map((seller, idx) => (
                                                <tr key={idx} className="border-bottom">
                                                    <td className="px-4 py-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="rounded-circle shadow-sm" style={{ width: 36, height: 36, position: 'relative', overflow: 'hidden', minWidth: '36px' }}>
                                                                <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white w-100 h-100" style={{ fontSize: '14px', background: 'linear-gradient(135deg, #0d6efd, #0dcaf0)' }}>
                                                                    {seller.username?.charAt(0).toUpperCase() || 'S'}
                                                                </div>
                                                                {seller.profile_image && (
                                                                    <img 
                                                                        src={getImageUrl(seller.profile_image)} 
                                                                        alt={seller.username} 
                                                                        className="rounded-circle w-100 h-100" 
                                                                        style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                                        onError={(e) => { e.target.style.display = 'none'; }} 
                                                                    />
                                                                )}
                                                            </div>
                                                            <Link to="/users?filter=seller" className="text-decoration-none">
                                                                <span className="fw-bold text-dark">{safeString(seller.username) || 'Unknown'}</span>
                                                            </Link>
                                                        </div>
                                                    </td>
                                                    <td className="fw-bold text-success text-end px-4 py-3">{formatPrice(seller.totalSales)}</td>
                                                    <td className="text-end px-4 py-3"><span className="badge bg-light text-dark border px-3 py-2 rounded-pill shadow-sm">{seller.ordersCount}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Col>

                        <Col lg={6}>
                            <div className="rental-light-panel h-100">
                                <h5 className="fw-bold mb-3 pb-2 border-bottom text-dark">{t('dashboard.tables.top_buyers')}</h5>
                                <div className="table-responsive rounded shadow-sm border">
                                    <table className="table table-borderless table-hover align-middle mb-0">
                                        <thead className="table-light border-bottom text-secondary">
                                            <tr>
                                                <th className="py-3 px-4" style={{ width: '45%' }}>{t('dashboard.tables.buyer')}</th>
                                                <th className="py-3 px-4 text-end">{t('dashboard.tables.total_spent')}</th>
                                                <th className="py-3 px-4 text-end">{t('dashboard.tables.orders_count')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!stats.topBuyers || stats.topBuyers.length === 0 ? (
                                                <tr><td colSpan="3" className="text-center text-muted py-4">{t('dashboard.tables.no_data')}</td></tr>
                                            ) : stats.topBuyers.map((buyer, idx) => (
                                                <tr key={idx} className="border-bottom">
                                                    <td className="px-4 py-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="rounded-circle shadow-sm" style={{ width: 36, height: 36, position: 'relative', overflow: 'hidden', minWidth: '36px' }}>
                                                                <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center text-white w-100 h-100" style={{ fontSize: '14px', background: 'linear-gradient(135deg, #fd7e14, #ffc107)' }}>
                                                                    {buyer.username?.charAt(0).toUpperCase() || 'B'}
                                                                </div>
                                                                {buyer.profile_image && (
                                                                    <img 
                                                                        src={getImageUrl(buyer.profile_image)} 
                                                                        alt={buyer.username} 
                                                                        className="rounded-circle w-100 h-100" 
                                                                        style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                                        onError={(e) => { e.target.style.display = 'none'; }} 
                                                                    />
                                                                )}
                                                            </div>
                                                            <Link to="/users?filter=buyer" className="text-decoration-none">
                                                                <span className="fw-bold text-dark">{safeString(buyer.username) || 'Unknown'}</span>
                                                            </Link>
                                                        </div>
                                                    </td>
                                                    <td className="fw-bold text-primary text-end px-4 py-3">{formatPrice(buyer.totalSpent)}</td>
                                                    <td className="text-end px-4 py-3"><span className="badge bg-light text-dark border px-3 py-2 rounded-pill shadow-sm">{buyer.ordersCount}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card>
            </Container>
        </div>
    );
};

export default AdminDashboard;
