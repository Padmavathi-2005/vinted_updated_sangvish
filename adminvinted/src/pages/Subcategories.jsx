import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import Table from '../components/Table';
import axios from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import { showToast } from '../utils/swal';

const Subcategories = () => {
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const { paginationLimit } = useSettings();


    useEffect(() => {
        fetchSubcategories();
    }, []);

    const fetchSubcategories = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/subcategories');
            setSubcategories(data);
        } catch (error) {
            console.error("Error fetching subcategories", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Subcategory Name',
            accessor: 'name',
            render: (row) => <span className="fw-bold">{row.name}</span>
        },
        {
            header: 'Parent Category',
            accessor: 'category_id',
            render: (row) => <span className="badge bg-light text-dark border">{row.category_id?.name || 'N/A'}</span>
        },
        {
            header: 'Slug',
            accessor: 'slug',
            render: (row) => <code className="small text-muted">{row.slug}</code>
        }
    ];

    const filteredData = subcategories.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category_id?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );




    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Subcategories</h2>
                            <p className="text-muted small mb-0">Manage marketplace subcategories</p>
                        </div>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '300px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search subcategories..."
                                className="border-start-0 ps-0"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); }}
                            />
                        </InputGroup>
                    </div>

                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredData}
                            actions={true}
                            onEdit={() => showToast('info', "Feature coming soon")}
                            onDelete={() => showToast('info', "Delete functionality coming soon")}
                            pagination={true}
                        />
                    )}
                </Card>
            </Container>
        </div>
    );
};

export default Subcategories;
