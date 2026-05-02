import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Spinner, InputGroup, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { FaPlus, FaSearch } from 'react-icons/fa';
import Table from '../components/Table';
import { showConfirm, showToast } from '../utils/swal';

const Pages = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/pages');
            setPages(data);
        } catch (error) {
            console.error('Failed to fetch pages', error);
            showToast('error', 'Failed to fetch pages');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (page) => {
        showConfirm(
            'Delete Page?',
            `Are you sure you want to delete "${page.title}"?`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/pages/${page._id}`);
                    setPages(pages.filter(p => p._id !== page._id));
                    showToast('success', 'Page deleted successfully');
                } catch (error) {
                    showToast('error', 'Failed to delete page');
                }
            }
        });
    };

    const handleEditClick = (page) => {
        navigate(`/pages/edit/${page._id}`);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredPages = pages.filter(page =>
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: 'Title',
            accessor: 'title',
            render: (row) => <div className="fw-bold">{row.title}</div>
        },
        {
            header: 'Slug (URL)',
            accessor: 'slug',
            render: (row) => <div className="text-muted">/pages/{row.slug}</div>
        },
        {
            header: 'Status',
            accessor: 'isActive',
            render: (row) => (
                row.isActive ?
                    <Badge bg="success" className="px-2 py-1 rounded-pill">Active</Badge> :
                    <Badge bg="secondary" className="px-2 py-1 rounded-pill">Draft</Badge>
            )
        }
    ];

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                        <div>
                            <h1 className="dashboard-title h3 mb-1 text-users">Static Pages</h1>
                            <p className="text-muted small mb-0">Manage your website's static informational pages</p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/pages/new')}
                            className="btn-admin-action"
                        >
                            <FaPlus /> Create Page
                        </Button>
                    </div>

                    <div className="d-flex gap-3 flex-wrap mb-4">
                        <div className="flex-grow-1" style={{ maxWidth: '350px' }}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search by title or slug..."
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </InputGroup>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Fetching pages...</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredPages}
                            actions={true}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                            pagination={true}
                            emptyMessage="No pages found. Create one to get started!"
                        />
                    )}
                </Card>
            </Container>
        </div>
    );
};

export default Pages;
