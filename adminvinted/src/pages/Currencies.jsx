import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit, FaMoneyBillWave } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import axios from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';

const Currencies = () => {
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        symbol: '$',
        exchange_rate: 1,
        symbol_position: 'before',
        decimal_places: 2,
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    // Pagination
    const { paginationLimit } = useSettings();


    useEffect(() => {
        fetchCurrencies();
    }, []);

    const fetchCurrencies = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/currencies');
            setCurrencies(data);
        } catch (error) {
            console.error("Error fetching currencies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (curr) => {
        setSelectedCurrency(curr);
        setFormData({
            name: curr.name || '',
            code: curr.code || '',
            symbol: curr.symbol || '$',
            exchange_rate: curr.exchange_rate || 1,
            symbol_position: curr.symbol_position || 'before',
            decimal_places: curr.decimal_places || 2,
            is_active: curr.is_active ?? true
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (selectedCurrency) {
                await axios.put(`/api/admin/currencies/${selectedCurrency._id}`, formData);
            } else {
                await axios.post('/api/admin/currencies', formData);
            }
            showToast('success', `Currency ${selectedCurrency ? 'updated' : 'created'} successfully`);
            setShowModal(false);
            fetchCurrencies();
        } catch (error) {
            console.error("Error saving currency", error);
            showToast('error', "Failed to save currency");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (curr, isActive) => {
        try {
            await axios.put(`/api/admin/currencies/${curr._id}`, { is_active: isActive });
            showToast('success', `Currency ${isActive ? 'activated' : 'deactivated'}`);
            setCurrencies(currencies.map(c =>
                c._id === curr._id ? { ...c, is_active: isActive } : c
            ));
        } catch (error) {
            console.error("Error toggling status", error);
            showToast('error', "Failed to update status");
        }
    };

    const handleDelete = (curr) => {
        showConfirm(
            'Delete Currency?',
            `Are you sure you want to delete "${curr.name}"?`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/currencies/${curr._id}`);
                    showToast('success', 'Currency deleted successfully');
                    fetchCurrencies();
                } catch (error) {
                    console.error("Error deleting currency", error);
                    showToast('error', "Failed to delete currency");
                }
            }
        });
    };

    const columns = [
        {
            header: 'Currency',
            accessor: 'name',
            render: (row) => (
                <div className="d-flex align-items-center gap-2">
                    <FaMoneyBillWave className="text-success opacity-50" />
                    <div>
                        <div className="fw-bold">{row.name}</div>
                        <div className="small text-muted">{row.code.toUpperCase()}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Format',
            accessor: 'symbol',
            render: (row) => (
                <div className="small">
                    <div>Symbol: <span className="fw-bold">{row.symbol}</span></div>
                    <div className="text-muted">Pos: {row.symbol_position}</div>
                </div>
            )
        },
        {
            header: 'Exchange Rate',
            accessor: 'exchange_rate',
            render: (row) => <span className="fw-bold text-primary">{row.exchange_rate}</span>
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

    const filteredData = Array.isArray(currencies) ? currencies.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];




    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Currencies</h2>
                            <p className="text-muted small mb-0">Manage portal currency and rates</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => {
                            setSelectedCurrency(null);
                            setFormData({ name: '', code: '', symbol: '$', exchange_rate: 1, symbol_position: 'before', decimal_places: 2, is_active: true });
                            setShowModal(true);
                        }}>
                            <FaPlus className="me-2" /> Add Currency
                        </Button>
                    </div>

                    <div className="mb-4" style={{ maxWidth: '300px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search currencies..."
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
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            pagination={true}
                        />
                    )}
                </Card>

                <Modal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    title={selectedCurrency ? "Edit Currency" : "Add Currency"}
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : "Save Currency"}
                            </Button>
                        </>
                    }
                >
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Currency Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. US Dollar"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>ISO Code</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="e.g. USD"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Symbol</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.symbol}
                                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Exchange Rate (1 Base = ?)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.0001"
                                        value={formData.exchange_rate}
                                        onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Symbol Position</Form.Label>
                            <Form.Select
                                value={formData.symbol_position}
                                onChange={(e) => setFormData({ ...formData, symbol_position: e.target.value })}
                            >
                                <option value="before">Before Price ($100)</option>
                                <option value="after">After Price (100$)</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default Currencies;
