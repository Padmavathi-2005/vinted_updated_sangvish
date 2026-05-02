import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Form, InputGroup, Spinner, Badge, Button, Row, Col, Container, ButtonGroup, Dropdown } from 'react-bootstrap';
import { FaSearch, FaBoxOpen, FaDownload, FaFileCsv, FaFilePdf, FaSync } from 'react-icons/fa';
import Table from '../components/Table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Modal from '../components/Modal';
import axios, { imageBaseURL } from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';
import { safeString } from '../utils/constants';

const Orders = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialFilter = queryParams.get('filter') || 'all';
    const initialSearch = queryParams.get('search') || '';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [orderTypeFilter, setOrderTypeFilter] = useState(initialFilter);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [formData, setFormData] = useState({
        order_status: '',
        payment_status: '',
        tracking_id: '',
        shipping_company_id: ''
    });
    const [shippingCompanies, setShippingCompanies] = useState([]);
    const [saving, setSaving] = useState(false);

    const { formatPrice, t } = useLocalization();

    useEffect(() => {
        fetchOrders();
        fetchShippingCompanies();
    }, [orderTypeFilter]);

    const fetchShippingCompanies = async () => {
        try {
            const { data } = await axios.get('/api/shipping-companies');
            setShippingCompanies(data.filter(c => c.status === 'active'));
        } catch (error) {
            console.error("Error fetching shipping companies", error);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/orders', {
                params: { type: orderTypeFilter === 'all' ? undefined : orderTypeFilter }
            });
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders", error);
            showToast('error', 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    // Filter with search
    const filteredOrders = orders.filter(order =>
        (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.buyer_id?.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.seller_id?.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const exportToCSV = () => {
        if (filteredOrders.length === 0) return showToast('info', 'No data to export');

        const headers = ['Order No', 'Item Title', 'Buyer', 'Seller', 'Amount', 'Payment Status', 'Order Status', 'Date'];
        const csvRows = [
            headers.join(','),
            ...filteredOrders.map(t => [
                t.order_number || '',
                safeString(t.item_id?.title) || 'Unknown Item',
                safeString(t.buyer_id?.username) || 'Unknown',
                safeString(t.seller_id?.username) || 'Unknown',
                t.total_amount || 0,
                t.payment_status?.toUpperCase() || '',
                t.order_status?.toUpperCase() || '',
                new Date(t.created_at).toLocaleDateString()
            ].map(v => `"${v}"`).join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (filteredOrders.length === 0) return showToast('info', 'No data to export');

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Orders Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ['Order No', 'Item Title', 'Buyer', 'Seller', 'Amount', 'Payment Status', 'Order Status', 'Date'];
        const tableRows = filteredOrders.map(t => [
            t.order_number || '',
            safeString(t.item_id?.title) || 'Unknown Item',
            safeString(t.buyer_id?.username) || 'Unknown',
            safeString(t.seller_id?.username) || 'Unknown',
            formatPrice(t.total_amount || 0),
            t.payment_status?.toUpperCase() || '',
            t.order_status?.toUpperCase() || '',
            new Date(t.created_at).toLocaleDateString()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [14, 165, 233] },
        });

        doc.save(`orders_export_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handleEditOrder = (order) => {
        setSelectedOrder(order);
        setFormData({
            order_status: order.order_status || 'pending',
            payment_status: order.payment_status || 'pending',
            tracking_id: order.tracking_id || '',
            shipping_company_id: order.shipping_company_id?._id || order.shipping_company_id || ''
        });
        setShowEditModal(true);
    };

    const onEditSuccess = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/admin/orders/${selectedOrder._id}`, formData);
            showToast('success', t('orders.toast.update_success') || 'Order updated successfully');
            setShowEditModal(false);
            fetchOrders();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOrder = (order) => {
        showConfirm(
            'Delete Order?',
            `Are you sure you want to delete order #${order.order_number}? This cannot be undone.`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/orders/${order._id}`);
                    showToast('success', t('orders.toast.delete_success') || 'Order deleted');
                    fetchOrders();
                } catch (error) {
                    console.error("Error deleting order", error);
                    showToast('error', 'Failed to delete order');
                }
            }
        });
    };

    const columns = [
        {
            header: t('orders.table.order_no'),
            accessor: 'order_number',
            width: '120px',
            render: (order) => <span className="fw-bold">{order.order_number}</span>
        },
        {
            header: t('orders.table.item'),
            accessor: 'item',
            render: (order) => (
                <div className="d-flex align-items-center gap-3">
                    <div className="item-img-placeholder bg-light rounded" style={{ width: '45px', height: '45px', overflow: 'hidden' }}>
                        {order.item_id?.images?.[0] ? (
                            <img
                                src={order.item_id.images[0].startsWith('http') ? order.item_id.images[0] : `${imageBaseURL.endsWith('/') ? imageBaseURL.slice(0, -1) : imageBaseURL}/${order.item_id.images[0].startsWith('/') ? order.item_id.images[0].substring(1) : order.item_id.images[0]}`}
                                alt={order.item_id.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.onerror = null; e.target.src = `${imageBaseURL}/images/site/not_found.png`; }}
                            />
                        ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                                {t('common.no_img') || 'No Img'}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{safeString(order.item_id?.title) || 'Unknown Item'}</div>
                        <div className="text-muted small">{t('orders.table.order_no')}: {order.order_number}</div>
                    </div>
                </div>
            )
        },
        {
            header: t('orders.table.buyer'),
            accessor: 'buyer',
            render: (order) => safeString(order.buyer_id?.username) || 'Unknown'
        },
        {
            header: t('orders.table.seller'),
            accessor: 'seller',
            render: (order) => safeString(order.seller_id?.username) || 'Unknown'
        },
        {
            header: t('orders.table.amount'),
            accessor: 'total_amount',
            render: (order) => formatPrice(order.total_amount)
        },
        {
            header: t('orders.table.payment_status'),
            accessor: 'payment_status',
            render: (order) => {
                const config = {
                    'paid': 'success',
                    'pending': 'warning',
                    'failed': 'danger',
                    'refunded': 'secondary'
                };
                return <Badge bg={config[order.payment_status] || 'secondary'} className="text-capitalize">{t(`orders.status.${order.payment_status?.toLowerCase()}`)}</Badge>;
            }
        },
        {
            header: t('orders.table.order_status'),
            accessor: 'order_status',
            render: (order) => {
                const config = {
                    'pending': 'warning',
                    'confirmed': 'info',
                    'packed': 'info',
                    'shipped': 'primary',
                    'out_for_delivery': 'warning',
                    'delivered': 'success',
                    'cancelled': 'danger',
                    'return_requested': 'warning',
                    'returned': 'secondary',
                    // Legacy
                    'placed': 'warning',
                    'dispatched': 'primary',
                    'on_the_way': 'warning'
                };
                return (
                    <div className="d-flex flex-column gap-1">
                        <Badge bg={config[order.order_status] || 'secondary'} className="text-capitalize">{order.order_status?.replace(/_/g, ' ')}</Badge>
                        {order.tracking_id && <Badge bg="light" text="dark" className="border extra-small fw-normal">Trk: {order.tracking_id}</Badge>}
                    </div>
                );
            }
        },
        {
            header: t('orders.table.date'),
            accessor: 'created_at',
            render: (order) => new Date(order.created_at).toLocaleDateString()
        }
    ];

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                        <div>
                            <h1 className="h3 mb-1">{t('orders.title')}</h1>
                            <p className="text-muted small mb-0">{t('orders.subtitle')}</p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-primary" onClick={fetchOrders} className="d-flex align-items-center gap-2 bg-white">
                                <FaSync /> {t('common.refresh')}
                            </Button>
                            <Dropdown>
                                <Dropdown.Toggle variant="primary" id="dropdown-export" className="d-flex align-items-center gap-2">
                                    <FaDownload /> {t('common.export')}
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="shadow border-0">
                                    <Dropdown.Item onClick={exportToCSV} className="d-flex align-items-center gap-2 py-2">
                                        <FaFileCsv className="text-success" /> {t('common.export_csv')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={exportToPDF} className="d-flex align-items-center gap-2 py-2">
                                        <FaFilePdf className="text-danger" /> {t('common.export_pdf')}
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>

                    <div className="d-flex gap-3 flex-wrap mb-4">
                        <div className="flex-grow-1" style={{ maxWidth: '300px' }}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={t('orders.search_placeholder')}
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    className="border-start-0 ps-0 search-input"
                                />
                            </InputGroup>
                        </div>
                        <div style={{ width: '200px' }}>
                            <Form.Select
                                value={orderTypeFilter}
                                onChange={(e) => setOrderTypeFilter(e.target.value)}
                                className="admin-filter-select"
                            >
                                <option value="all">{t('orders.filter_all')}</option>
                                <option value="today">{t('orders.filter_today')}</option>
                            </Form.Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">{t('orders.loading')}</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredOrders}
                            actions={true}
                            onEdit={handleEditOrder}
                            onDelete={handleDeleteOrder}
                            pagination={true}
                            emptyMessage={t('orders.no_orders') || 'No orders found.'}
                        />
                    )}
                </Card>

                {/* Edit Order Modal */}
                <Modal
                    show={showEditModal}
                    onHide={() => setShowEditModal(false)}
                    title={`${t('orders.modal.edit_title')} ${selectedOrder?.order_number}`}
                    onSubmit={onEditSuccess}
                    submitText={saving ? t('orders.modal.saving') : t('orders.modal.save')}
                    disabled={saving}
                >
                    {selectedOrder && (
                        <Form>
                            {/* Order Summary */}
                            <div className="mb-4 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div className="fw-bold mb-1">{safeString(selectedOrder.item_id?.title) || 'Unknown Item'}</div>
                                <div className="text-muted small">
                                    {t('orders.modal.order_summary')} #{selectedOrder.order_number} · {t('orders.table.buyer')}: <strong>{safeString(selectedOrder.buyer_id?.username) || '—'}</strong>
                                </div>
                            </div>

                            <Row>
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>{t('orders.modal.order_status')}</Form.Label>
                                        <Form.Select
                                            value={formData.order_status}
                                            onChange={(e) => setFormData({ ...formData, order_status: e.target.value })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="packed">Packed</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="out_for_delivery">Out for Delivery</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                            <option value="return_requested">Return Requested</option>
                                            <option value="returned">Returned</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>{t('orders.modal.payment_status')}</Form.Label>
                                        <Form.Select
                                            value={formData.payment_status}
                                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                                        >
                                            <option value="pending">{t('orders.status.pending')}</option>
                                            <option value="paid">{t('orders.status.paid')}</option>
                                            <option value="failed">{t('orders.status.failed')}</option>
                                            <option value="refunded">{t('orders.status.refunded')}</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>Courier Company</Form.Label>
                                        <Form.Select
                                            value={formData.shipping_company_id}
                                            onChange={(e) => setFormData({ ...formData, shipping_company_id: e.target.value })}
                                        >
                                            <option value="">-- No Courier --</option>
                                            {shippingCompanies.map(c => (
                                                <option key={c._id} value={c._id}>{c.company_name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>Tracking ID</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Enter Tracking ID"
                                            value={formData.tracking_id}
                                            onChange={(e) => setFormData({ ...formData, tracking_id: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    )}
                </Modal>
            </Container>
        </div>
    );
};

export default Orders;
