import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Spinner, Form, InputGroup } from 'react-bootstrap';
import { FaSearch, FaTrash, FaEye, FaCheck, FaTimes, FaBan, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { showToast, showConfirm } from '../utils/swal';
import { safeString, getImageUrl } from '../utils/constants';

const ProductReports = () => {
    const { formatPrice, t } = useLocalization();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/moderation-reports');
            setReports(data);
        } catch (error) {
            console.error("Error fetching reports", error);
            showToast('error', 'Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (reportId, action) => {
        const confirmMsg = action === 'delete' 
            ? 'Are you sure you want to delete this product? This action cannot be undone.' 
            : `Are you sure you want to ${action === 'deactivate' ? 'toggle the status of' : 'perform this action on'} this product?`;
        
        const result = await showConfirm(
            'Confirm Action',
            confirmMsg,
            action === 'delete' ? 'Delete Item' : 'Proceed'
        );

        if (result.isConfirmed) {
            setActionLoading(true);
            try {
                await axios.post(`/api/moderation-reports/${reportId}/action`, { action });
                showToast('success', `Action ${action} completed successfully`);
                fetchReports();
                setShowDetailModal(false);
            } catch (error) {
                console.error("Action error", error);
                showToast('error', 'Action failed');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const updateStatus = async (reportId, status) => {
        try {
            await axios.put(`/api/moderation-reports/${reportId}/status`, { status });
            showToast('success', `Report status updated to ${status}`);
            fetchReports();
        } catch (error) {
            showToast('error', 'Failed to update status');
        }
    };

    const columns = [
        {
            header: 'Item',
            accessor: 'item_id',
            render: (row) => (
                <div className="d-flex align-items-center gap-2">
                    <img 
                        src={getImageUrl(row.item_id?.images?.[0] || 'images/site/not_found.png')} 
                        alt="" 
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        className="rounded border"
                    />
                    <div>
                        <div className="fw-bold">{safeString(row.item_id?.title)}</div>
                        <div className="text-muted small">Seller: {row.item_id?.seller_id?.username}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Reporter',
            accessor: 'reporter_id',
            render: (row) => (
                <div>
                    <div>{row.reporter_id?.username}</div>
                    <div className="small text-muted">{row.reporter_id?.email}</div>
                </div>
            )
        },
        {
            header: 'Reason',
            accessor: 'reason',
            render: (row) => <Badge bg="danger" className="text-capitalize">{row.reason}</Badge>
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const colors = {
                    pending: 'warning',
                    reviewed: 'info',
                    resolved: 'success',
                    dismissed: 'secondary'
                };
                return <Badge bg={colors[row.status] || 'primary'} className="text-capitalize">{row.status}</Badge>
            }
        },
        {
            header: 'Date',
            accessor: 'created_at',
            render: (row) => <span className="small">{new Date(row.created_at).toLocaleDateString()}</span>
        }
    ];

    const filteredReports = reports.filter(r => 
        r.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.item_id?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reporter_id?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-dashboard p-4">
            <Container fluid>
                <Card className="border-0 shadow-sm p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="h3 mb-1">Product Reports</h1>
                            <p className="text-muted small mb-0">Manage and review complaints about listings.</p>
                        </div>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '400px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white"><FaSearch className="text-muted" /></InputGroup.Text>
                            <Form.Control 
                                placeholder="Search reports..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </div>

                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table 
                            columns={columns}
                            data={filteredReports}
                            actions={true}
                            onView={(row) => { setSelectedReport(row); setShowDetailModal(true); }}
                            emptyMessage="No reports found"
                        />
                    )}
                </Card>
            </Container>

            {/* Report Detail Modal */}
            <Modal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                title="Report Details"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
                        <Button 
                            variant="outline-info" 
                            onClick={() => updateStatus(selectedReport._id, 'reviewed')}
                            disabled={selectedReport?.status === 'reviewed'}
                        >
                            Mark as Reviewed
                        </Button>
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => updateStatus(selectedReport._id, 'dismissed')}
                            disabled={selectedReport?.status === 'dismissed'}
                        >
                            Dismiss
                        </Button>
                    </>
                }
            >
                {selectedReport && (
                    <div>
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <h6 className="text-muted text-uppercase small fw-bold">Item Details</h6>
                                <div className="d-flex gap-3">
                                    <img 
                                        src={getImageUrl(selectedReport.item_id?.images?.[0])} 
                                        alt="" 
                                        style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                        className="rounded border"
                                    />
                                    <div>
                                        <h5 className="mb-1">{selectedReport.item_id?.title}</h5>
                                        <p className="mb-1 text-primary fw-bold">{formatPrice(selectedReport.item_id?.price)}</p>
                                        <Badge bg={selectedReport.item_id?.status === 'active' ? 'success' : 'danger'}>
                                            Status: {selectedReport.item_id?.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6 text-md-end">
                                <h6 className="text-muted text-uppercase small fw-bold">Actions</h6>
                                <div className="d-flex flex-column gap-2 align-items-md-end">
                                    <Button 
                                        variant={selectedReport.item_id?.status === 'active' ? "warning" : "success"}
                                        size="sm"
                                        style={{ width: '200px' }}
                                        onClick={() => handleAction(selectedReport._id, 'deactivate')}
                                        disabled={actionLoading}
                                    >
                                        {selectedReport.item_id?.status === 'active' ? <FaBan className="me-2" /> : <FaCheck className="me-2" />}
                                        {selectedReport.item_id?.status === 'active' ? "Deactivate Product" : "Activate Product"}
                                    </Button>
                                    <Button 
                                        variant="danger" 
                                        size="sm"
                                        style={{ width: '200px' }}
                                        onClick={() => handleAction(selectedReport._id, 'delete')}
                                        disabled={actionLoading || selectedReport.item_id?.status === 'deleted'}
                                    >
                                        <FaTrash className="me-2" /> Delete Product
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <hr />

                        <div className="mb-4">
                            <h6 className="text-muted text-uppercase small fw-bold">Reporting Information</h6>
                            <div className="bg-light p-3 rounded border">
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="small text-muted text-uppercase fw-bold">Reason</div>
                                        <div className="text-danger fw-bold">{selectedReport.reason}</div>
                                    </div>
                                    <div className="col-md-8">
                                        <div className="small text-muted text-uppercase fw-bold">Message from User</div>
                                        <div className="mt-1">{selectedReport.message}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h6 className="text-muted text-uppercase small fw-bold">Reporter Info</h6>
                            <p className="mb-0"><strong>Username:</strong> {selectedReport.reporter_id?.username}</p>
                            <p className="mb-0"><strong>Email:</strong> {selectedReport.reporter_id?.email}</p>
                            <p className="mb-0"><strong>Member Since:</strong> {new Date(selectedReport.reporter_id?.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProductReports;
