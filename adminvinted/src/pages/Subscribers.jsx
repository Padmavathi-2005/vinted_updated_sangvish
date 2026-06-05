import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Badge, Dropdown } from 'react-bootstrap';
import axios from '../utils/axios';
import Table from '../components/Table';
import { FaTrash, FaSearch, FaSync, FaEnvelope, FaDownload, FaFileCsv, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../context/SettingsContext';
import { useLocalization } from '../context/LocalizationContext';
import { formatAdminDate } from '../utils/dateFormatter';

const Subscribers = () => {
    const { t } = useLocalization();
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { globalSettings } = useSettings();

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
                formatAdminDate(sub.created_at, globalSettings)
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
        doc.text(`Generated on: ${formatAdminDate(new Date(), globalSettings, { hour: '2-digit', minute: '2-digit' })}`, 14, 30);

        const tableColumn = ["Email", "Source", "Status", "Subscribed At"];
        const tableRows = [];

        data.forEach(sub => {
            const subscriberData = [
                sub.email,
                sub.source || 'footer',
                sub.status,
                formatAdminDate(sub.created_at, globalSettings)
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
            header: t('subscribers.table.email', 'Email'),
            accessor: 'email',
            cell: (row) => (
                <div className="d-flex align-items-center gap-2">
                    <FaEnvelope style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
                    <span className="fw-bold text-dark">{row.email}</span>
                </div>
            )
        },
        {
            header: t('subscribers.table.source', 'Source'),
            accessor: 'source',
            cell: (row) => (
                <Badge bg="light" text="dark" className="border">
                    {row.source || 'footer'}
                </Badge>
            )
        },
        {
            header: t('subscribers.table.status', 'Status'),
            accessor: 'status',
            cell: (row) => (
                <Badge
                    bg={row.status === 'active' ? 'success' : 'secondary'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStatusToggle(row._id, row.status)}
                >
                    {row.status === 'active' ? t('common.status.active', 'active') : t('common.status.inactive', 'unsubscribed')}
                </Badge>
            )
        },
        {
            header: t('subscribers.table.subscribed_at', 'Subscribed At'),
            accessor: 'created_at',
            cell: (row) => formatAdminDate(row.created_at, globalSettings)
        },
        {
            header: t('subscribers.table.actions', 'Actions'),
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
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                        <div>
                            <h1 className="dashboard-title h3 mb-1 text-primary">{t('subscribers.title', 'Newsletter Subscribers')}</h1>
                            <p className="text-muted small mb-0">{t('subscribers.subtitle', 'Manage your newsletter list and subscribers')}</p>
                        </div>
                        <div className="d-flex gap-2">
                            <Dropdown>
                                <Dropdown.Toggle variant="primary" id="dropdown-export" className="btn-admin-action">
                                    <FaDownload /> {t('subscribers.export', 'Export')}
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

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                        <div className="d-flex gap-3 flex-wrap align-items-center flex-grow-1">
                            <div className="search-box-container" style={{ minWidth: '300px' }}>
                                <InputGroup>
                                    <InputGroup.Text className="bg-white border-end-0">
                                        <FaSearch className="text-muted" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder={t('subscribers.search_placeholder', 'Search by email...')}
                                        className="border-start-0 ps-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </div>
                        </div>

                        <div className="d-flex gap-3 align-items-center">
                            <div style={{ width: '220px' }}>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="admin-filter-select"
                                >
                                    <option value="">{t('subscribers.all_statuses', 'All Statuses')}</option>
                                    <option value="active">{t('common.status.active', 'Active')}</option>
                                    <option value="unsubscribed">{t('common.status.inactive', 'Unsubscribed')}</option>
                                </Form.Select>
                            </div></div>
                    </div>

                    <Table
                        columns={columns}
                        data={subscribers}
                        loading={loading}
                        pagination={true}
                        emptyMessage={t('subscribers.no_data', 'No subscribers found.')}
                    />
                </Card>
            </Container>
        </div>
    );
};

export default Subscribers;
