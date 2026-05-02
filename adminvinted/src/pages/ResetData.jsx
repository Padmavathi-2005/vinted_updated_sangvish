import React, { useState } from 'react';
import { Container, Card, Button, InputGroup, Form, Spinner, Alert } from 'react-bootstrap';
import { FaTrashAlt, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import axios from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';

const ResetData = () => {
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleReset = async () => {
        if (confirmText !== 'DELETE ALL DATA') {
            showToast('error', 'Please type the confirmation text correctly');
            return;
        }

        const confirm = await showConfirm(
            'Are you absolutely sure?',
            'This will permanently delete all users, items, and orders. Settings and categories will remain. THIS ACTION CANNOT BE UNDONE!',
            'Yes, Delete Everything'
        );

        if (confirm.isConfirmed) {
            setLoading(true);
            try {
                const { data } = await axios.post('/api/system/reset-data');
                showToast('success', data.message);
                setConfirmText('');
            } catch (error) {
                showToast('error', error.response?.data?.message || 'Failed to reset data');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="reset-data-container p-4">
            <Container>
                <div className="mb-4">
                    <h2 className="mb-1"><FaTrashAlt className="text-danger me-2" /> Delete Content</h2>
                    <p className="text-muted">Perform a deep clean of your marketplace data.</p>
                </div>

                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="p-1 bg-danger"></div>
                    <Card.Body className="p-4">
                        <Alert variant="danger" className="d-flex align-items-center">
                            <FaExclamationTriangle size={24} className="me-3" />
                            <div>
                                <h5 className="mb-1 fw-bold">Danger Zone!</h5>
                                <p className="mb-0">This action will permanently delete all Users, Items, Orders, Messages, and Notifications from the database. <strong>Categories, Settings, and Admin accounts will NOT be deleted.</strong></p>
                            </div>
                        </Alert>

                        <div className="my-4">
                            <h6>To continue, please type <code className="bg-light p-1 rounded text-danger fw-bold">DELETE ALL DATA</code> in the box below:</h6>
                            <Form.Control 
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type the confirmation text..."
                                className="mt-3"
                                autoComplete="off"
                            />
                        </div>

                        <div className="d-flex justify-content-end">
                            <Button 
                                variant="danger" 
                                className="d-flex align-items-center px-4"
                                onClick={handleReset}
                                disabled={loading || !confirmText}
                            >
                                {loading ? (
                                    <Spinner animation="border" size="sm" className="me-2" />
                                ) : (
                                    <FaShieldAlt className="me-2" />
                                )}
                                Delete All User Content
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                <div className="mt-4 p-3 bg-light rounded border text-muted small">
                    <h6 className="fw-bold text-dark"><FaShieldAlt size={14} className="me-2" /> What will NOT be deleted:</h6>
                    <ul className="mb-0">
                        <li>Admin accounts and login information</li>
                        <li>All Site Settings and configurations</li>
                        <li>Categories, Subcategories, and Item Types</li>
                        <li>Static Pages and Frontend Content</li>
                        <li>Languages and Currencies</li>
                        <li>Shipping Companies</li>
                    </ul>
                </div>
            </Container>
        </div>
    );
};

export default ResetData;
