import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import axios from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    // Pagination
    const { paginationLimit } = useSettings();


    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/categories');
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name || '',
            slug: category.slug || '',
            description: category.description || '',
            is_active: category.is_active ?? true
        });
        setShowEditModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/admin/categories/${selectedCategory._id}`, formData);
            showToast('success', 'Category updated successfully');
            setShowEditModal(false);
            fetchCategories();
        } catch (error) {
            console.error("Error saving category", error);
            showToast('error', "Failed to save category");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (category, isActive) => {
        try {
            await axios.put(`/api/admin/categories/${category._id}`, { is_active: isActive });
            showToast('success', `Category ${isActive ? 'activated' : 'deactivated'}`);
            setCategories(categories.map(c =>
                c._id === category._id ? { ...c, is_active: isActive } : c
            ));
        } catch (error) {
            console.error("Error toggling category status", error);
            showToast('error', "Failed to update status");
        }
    };

    const handleDelete = (category) => {
        showConfirm(
            'Delete Category?',
            `Are you sure you want to delete "${category.name}"? This might affect subcategories and listings.`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/categories/${category._id}`);
                    showToast('success', 'Category deleted successfully');
                    fetchCategories();
                } catch (error) {
                    console.error("Error deleting category", error);
                    showToast('error', "Failed to delete category");
                }
            }
        });
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            render: (row) => <span className="fw-bold">{row.name}</span>
        },
        {
            header: 'Slug',
            accessor: 'slug',
            render: (row) => <code className="small text-muted">{row.slug}</code>
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (row) => (
                <Toggle
                    checked={row.is_active}
                    onChange={(checked) => handleStatusToggle(row, checked)}
                    label={row.is_active ? "Active" : "Inactive"}
                />
            )
        }
    ];

    const filteredCategories = Array.isArray(categories) ? categories.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];




    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Categories</h2>
                            <p className="text-muted small mb-0">Manage main marketplace categories</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => {
                            setSelectedCategory(null);
                            setFormData({ name: '', slug: '', description: '', is_active: true });
                            setShowEditModal(true);
                        }}>
                            <FaPlus /> Add Category
                        </Button>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '300px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search categories..."
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
                            data={filteredCategories}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            pagination={true}
                        />
                    )}
                </Card>

                <Modal
                    show={showEditModal}
                    onHide={() => setShowEditModal(false)}
                    title="Edit Category"
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : "Save Changes"}
                            </Button>
                        </>
                    }
                >
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Category Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Slug</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default Categories;
