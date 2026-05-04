import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Spinner, Table as BootstrapTable, Alert, Form, Button, Container } from 'react-bootstrap';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { safeString, getImageUrl } from '../utils/constants';
import L from 'leaflet';

// Mock specific coordinates for major cities since exact lat/lon isn't explicitly saved per order.
// In a real production mapping app, you would pass these via active geocoding api on the backend.
const mockCityCoords = {
    'London': [51.5074, -0.1278],
    'New York': [40.7128, -74.0060],
    'Paris': [48.8566, 2.3522],
    'Tokyo': [35.6762, 139.6503],
    'Sydney': [-33.8688, 151.2093],
    'Berlin': [52.5200, 13.4050],
    'Toronto': [43.6510, -79.3470],
    'Mumbai': [19.0760, 72.8777],
    'Dubai': [25.2048, 55.2708]
};

const Reports = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({ chartData: [], topSellers: [], bookingLocations: [], recentOrders: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { formatPrice } = useLocalization();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [geoCache, setGeoCache] = useState({});

    // Dynamic map centering 
    const [mapCenter, setMapCenter] = useState([30, 10]);
    const [mapZoom, setMapZoom] = useState(2);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await axios.get('/api/admin/reports', { params });
            setData({
                chartData: res.data.chartData || [],
                topSellers: res.data.topSellers || [],
                bookingLocations: res.data.bookingLocations || [],
                recentOrders: res.data.recentOrders || []
            });
            setError('');
        } catch (err) {
            console.error("Error fetching reports", err);
            setError('Failed to load reports data.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchReports();

        // Fix Leaflet icons issue common in React 
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        });
    }, []);

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchReports();
    };

    const getCoordinates = (city, index) => {
        if (city && mockCityCoords[city]) return mockCityCoords[city];
        // Generate random but deterministic location relative to India (~20N, 78E) if not geocoded yet.
        const lat = 15 + ((index * 7) % 15);
        const lon = 75 + ((index * 13) % 15);
        return [lat, lon];
    };

    // Geocode string into Lat/Lon using native fetch to avoid CORS/Interceptor issues
    const geocodeAddress = async (addressStr) => {
        if (!addressStr || addressStr === "Unknown Address" || addressStr === "Unknown Location") return null;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
        } catch (e) {
            console.warn("Geocoding failed for:", addressStr);
        }
        return null;
    };

    const isGeocoding = useRef(false);

    // Auto Geocode Map Locations incrementally
    useEffect(() => {
        let isMounted = true;
        const geocodeLocations = async () => {
            if (!data.bookingLocations || data.bookingLocations.length === 0 || isGeocoding.current) return;
            
            const missingLocs = data.bookingLocations.filter(loc =>
                loc.locationString && 
                loc.locationString !== "Unknown Address" && 
                loc.locationString !== "Unknown Location" &&
                !geoCache[loc.locationString]
            );

            if (missingLocs.length === 0) return;
            
            isGeocoding.current = true;

            for (let i = 0; i < missingLocs.length; i++) {
                if (!isMounted) break;
                const locStr = missingLocs[i].locationString;
                
                // Skip obviously fake or numeric-only addresses to save rate-limit
                if (/^[0-9, ]+$/.test(locStr) || locStr.length < 3) continue;

                const coords = await geocodeAddress(locStr);
                
                if (coords) {
                    setGeoCache(prev => ({ ...prev, [locStr]: coords }));
                } else {
                    // Fallback to broader search
                    const parts = locStr.split(',');
                    if (parts.length > 1) {
                        const broader = parts.slice(1).join(',').trim();
                        const coordsB = await geocodeAddress(broader);
                        if (coordsB) setGeoCache(prev => ({ ...prev, [locStr]: coordsB }));
                    }
                }
                // Strictly respect Nominatim 1req/sec (using 2s for safety)
                await new Promise(r => setTimeout(r, 2000));
            }
            isGeocoding.current = false;
        };
        geocodeLocations();
        return () => { isMounted = false; isGeocoding.current = false; };
    }, [data.bookingLocations]);

    const handleOrderHover = async (addressStr) => {
        if (!addressStr || addressStr === "Unknown Location") return;
        if (geoCache[addressStr]) {
            setMapCenter(geoCache[addressStr]);
            setMapZoom(6);
            return;
        }

        const coords = await geocodeAddress(addressStr);
        if (coords) {
            setGeoCache(prev => ({ ...prev, [addressStr]: coords }));
            setMapCenter(coords);
            setMapZoom(6);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger" className="m-4">{error}</Alert>;
    }

    return (
        <>
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <div>
                    <h1 className="dashboard-title h3 mb-1 text-primary">Business Reports</h1>
                    <p className="text-muted small mb-0">Comprehensive platform performance insights</p>
                </div>
                <Form onSubmit={handleFilterSubmit} className="d-flex flex-wrap align-items-end gap-2 bg-white p-3 rounded-4 shadow-sm border border-light w-100 w-sm-auto">
                    <div className="flex-grow-1 flex-sm-grow-0">
                        <Form.Label className="small text-muted mb-1 px-1">From</Form.Label>
                        <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} size="sm" className="rounded-3" />
                    </div>
                    <div className="flex-grow-1 flex-sm-grow-0">
                        <Form.Label className="small text-muted mb-1 px-1">To</Form.Label>
                        <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} size="sm" className="rounded-3" />
                    </div>
                    <Button type="submit" variant="primary" size="sm" className="btn-admin-action px-3 py-2" style={{ height: 'fit-content' }}>
                        Filter
                    </Button>
                </Form>
            </div>

            <Row className="mb-4 g-4">
                {/* Revenue Overview */}
                <Col lg={12}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 p-3 p-md-4 bg-white overflow-hidden">
                        <h5 className="fw-bold mb-4">Revenue & Commission Trends</h5>
                        <div style={{ width: '100%', height: 350, marginLeft: -10, position: 'relative', minWidth: '1px' }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <YAxis width={65} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => formatPrice(value)} />
                                    <RechartsTooltip formatter={(value) => `${formatPrice(value)}`} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="sales" name="Total Sales" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSales)" />
                                    <Area type="monotone" dataKey="commission" name="Admin Commission" stroke="#22c55e" fillOpacity={1} fill="url(#colorCommission)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-4 g-4" style={{ minHeight: '400px' }}>
                {/* Geographic Map Tracker */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 bg-white mb-4 overflow-hidden" style={{ minHeight: '480px' }}>
                        <h5 className="fw-bold mb-4">Delivery Map Tracking</h5>
                        <p className="text-muted small">Heatmap of booking addresses globally</p>
                        <div style={{ height: '380px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 1 }}>
                            {/* Force re-render of map on coordinates change with a react key trick */}
                            <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                                />
                                {/* Specific hovered point */}
                                <CircleMarker center={mapCenter} pathOptions={{ fillColor: '#0ea5e9', color: '#0ea5e9', fillOpacity: 0.8 }} radius={6} />

                                {/* Broad location grouping */}
                                {data.bookingLocations.map((loc, idx) => {
                                    const coords = geoCache[loc.locationString] || getCoordinates(loc.locationString.split(',')[0], idx);
                                    return (
                                        <CircleMarker
                                            key={idx}
                                            center={coords}
                                            pathOptions={{ fillColor: '#ef4444', color: '#ef4444', weight: 1, fillOpacity: 0.4 }}
                                            radius={Math.max(6, Math.min(20, loc.bookings * 2))}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <strong>{safeString(loc.locationString)}</strong><br />
                                                    <span className="text-primary fw-bold">{loc.bookings} Bookings</span><br />
                                                    Total Value: {formatPrice(loc.revenue)}
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    )
                                })}
                            </MapContainer>
                        </div>
                    </Card>
                </Col>

                {/* Latest Orders Tracker List */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                        <h5 className="fw-bold mb-4">Tracked Orders Stream</h5>
                        <p className="text-muted small">Hover an order to locate its address on the map, click to view.</p>
                        <div className="table-responsive rounded border" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            <BootstrapTable hover variant="white" className="mb-0">
                                <thead className="table-light flex-sticky top-0 sticky-top">
                                    <tr>
                                        <th className="py-3 px-3">Order ID</th>
                                        <th className="py-3 px-3">Location Hint</th>
                                        <th className="py-3 px-3 text-end">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentOrders.length === 0 && (
                                        <tr><td colSpan="3" className="text-center text-muted py-4">No recent orders found.</td></tr>
                                    )}
                                    {data.recentOrders.map(order => (
                                        <tr
                                            key={order._id}
                                            style={{ cursor: 'pointer' }}
                                            className="border-bottom tracking-row"
                                            onClick={() => navigate(`/orders?search=${order.order_number}`)}
                                            onMouseEnter={() => handleOrderHover(order.addressFull)}
                                        >
                                            <td className="py-3 px-3 fw-bold text-primary">{order.order_number}</td>
                                            <td className="py-3 px-3 small text-truncate" style={{ maxWidth: '180px' }}>{safeString(order.addressFull)}</td>
                                            <td className="py-3 px-3 fw-bold text-success text-end">{formatPrice(order.total_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </BootstrapTable>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-4 g-4">
                {/* Fully Analyzed Top Sellers List */}
                <Col lg={12}>
                    <Card className="border-0 shadow-sm rounded-4 p-4 bg-white">
                        <h5 className="fw-bold mb-4">Top Sellers (Full Analyzed View)</h5>
                        <div className="table-responsive">
                            <BootstrapTable hover className="align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-3 px-3">Seller Profile</th>
                                        <th className="py-3 px-3">Email Address</th>
                                        <th className="py-3 px-3 text-end">Total Completed Orders</th>
                                        <th className="py-3 px-3 text-end">Total Gross Sales</th>
                                        <th className="py-3 px-3 text-end">Net Platform Commission</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topSellers.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center text-muted py-4">No seller data available</td></tr>
                                    ) : data.topSellers.map((seller, idx) => (
                                        <tr key={idx} className="border-bottom">
                                            <td className="py-3 px-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="rounded-circle shadow-sm" style={{ width: 40, height: 40, position: 'relative', overflow: 'hidden', minWidth: '40px' }}>
                                                        <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white w-100 h-100" style={{ fontSize: '14px', background: 'linear-gradient(135deg, #0d6efd, #0dcaf0)' }}>
                                                            {safeString(seller.username)?.charAt(0).toUpperCase() || 'S'}
                                                        </div>
                                                        {seller.profile_image && (
                                                            <img 
                                                                src={getImageUrl(seller.profile_image)} 
                                                                alt={safeString(seller.username)} 
                                                                className="rounded-circle w-100 h-100" 
                                                                style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                                onError={(e) => { 
                                                                    e.target.onerror = null; 
                                                                    e.target.src = getImageUrl('images/site/not_found.png');
                                                                }} 
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="fw-bold text-dark">{safeString(seller.username) || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="text-muted px-3">{seller.email}</td>
                                            <td className="text-end fw-bold px-3">{seller.ordersCount}</td>
                                            <td className="text-end text-success fw-bold px-3">{formatPrice(seller.totalSales)}</td>
                                            <td className="text-end text-primary fw-bold px-3">{formatPrice(seller.platformFee)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </BootstrapTable>
                        </div>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default Reports;
