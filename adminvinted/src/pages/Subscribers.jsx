import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Badge, Dropdown } from 'react-bootstrap';
import axios from '../utils/axios';
import Table from '../components/Table';
import { FaTrash, FaSearch, FaSync, FaEnvelope, FaDownload, FaFileCsv, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Subscribers = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/admin/newsletter', {
                params: {
                    page,
                    search: searchTerm,
                    status: statusFilter
                }
            });
            setSubscribers(data.subscribers);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, [page, statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchSubscribers();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to remove this subscriber?')) {
            try {
                await axios.delete(`/api/admin/newsletter/${id}`);
                fetchSubscribers();
            } catch (error) {
                console.error('Error deleting subscriber:', error);
                alert('Failed to delete subscriber');
            }
        }
    };

    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'unsubscribed' : 'active';
        try {
            await axios.patch(`/api/admin/newsletter/${id}`, { status: newStatus });
            fetchSubscribers();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const fetchAllForExport = async () => {
        try {
            const { data } = await axios.get('/api/admin/newsletter', {
                params: {
                    page: 1,
                    limit: 100000, // Large number to get all
                    search: searchTerm,
                    status: statusFilter
                }
            });
            return data.subscribers || [];
        } catch (error) {
            console.error('Error fetching data for export:', error);
            alert('Failed to fetch data for export.');
            return [];
        }
    };

    const exportToCSV = async () => {
        const data = await fetchAllForExport();
        if (data.length === 0) return alert('No data to export');

        const headers = ['Email', 'Source', 'Status', 'Subscribed At'];
        const csvRows = [
            headers.join(','), // Header row
            ...data.map(sub => [
                sub.email,
                sub.source || 'footer',
                sub.status,
                new Date(sub.created_at).toLocaleDateString()
            ].map(v => `"${v}"`).join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `subscribers_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = async () => {
        const data = await fetchAllForExport();
        if (data.length === 0) return alert('No data to export');

        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Newsletter Subscribers Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["Email", "Source", "Status", "Subscribed At"];
        const tableRows = [];

        data.forEach(sub => {
            const subscriberData = [
                sub.email,
                sub.source || 'footer',
                sub.status,
                new Date(sub.created_at).toLocaleDateString()
            ];
            tableRows.push(subscriberData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [14, 165, 233] },
        });

        doc.save(`subscribers_export_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const columns = [
        {
            header: 'Email',
            accessor: 'email',
            cell: (row) => (
                <div className="d-flex align-items-center gap-2">
                    <FaEnvelope style={{ color: '#0ea5e9', opacity: 0.6 }} />
                    <span className="fw-bold text-dark">{row.email}</span>
                </div>
            )
        },
        {
            header: 'Source',
            accessor: 'source',
            cell: (row) => (
                <Badge bg="light" text="dark" className="border">
                    {row.source || 'footer'}
                </Badge>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (row) => (
                <Badge
                    bg={row.status === 'active' ? 'success' : 'secondary'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStatusToggle(row._id, row.status)}
                >
                    {row.status}
                </Badge>
            )
        },
        {
            header: 'Subscribed At',
            accessor: 'created_at',
            cell: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            header: 'Actions',
            accessor: '_id',
            cell: (row) => (
                <div className="d-flex gap-2">
                    <Button
                        variant="soft-danger"
                        size="sm"
                        onClick={() => handleDelete(row._id)}
                    >
                        <FaTrash />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Newsletter Subscribers</h2>
                    <p className="text-secondary mb-0">Manage your newsletter list and subscribers</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={fetchSubscribers} className="d-flex align-items-center gap-2 bg-white">
                        <FaSync /> Refresh
                    </Button>
                    <Dropdown>
                        <Dropdown.Toggle variant="primary" id="dropdown-export" className="d-flex align-items-center gap-2">
                            <FaDownload /> Export
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow border-0">
                            <Dropdown.Item onClick={exportToCSV} className="d-flex align-items-center gap-2 py-2">
                                <FaFileCsv className="text-success" /> Export to CSV
                            </Dropdown.Item>
                            <Dropdown.Item onClick={exportToPDF} className="d-flex align-items-center gap-2 py-2">
                                <FaFilePdf className="text-danger" /> Export to PDF
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className="g-3">
                            <Col md={6}>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0">
                                        <FaSearch className="text-muted" />
                                    </span>
                                    <Form.Control
                                        placeholder="Search by email..."
                                        className="border-start-0 ps-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </Col>
                            <Col md={4}>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="unsubscribed">Unsubscribed</option>
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Button type="submit" variant="dark" className="w-100">
                                    Filter
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Table
                columns={columns}
                data={subscribers}
                loading={loading}
                pagination={{
                    currentPage: page,
                    totalPages,
                    onPageChange: setPage
                }}
                emptyMessage="No subscribers found"
            />
        </Container>
    );
};

export default Subscribers;
