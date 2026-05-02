import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Modal, Form } from 'react-bootstrap';
import { FaTrash, FaEye, FaReply, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import axios from '../utils/axios';

const ContactInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [replyText, setReplyText] = useState('');

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/contact');
            setInquiries(data);
        } catch (error) {
            console.error('Failed to fetch inquiries:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this inquiry?')) {
            try {
                await axios.delete(`/api/contact/${id}`);
                fetchInquiries();
            } catch (error) {
                console.error('Delete failed:', error);
            }
        }
    };

    const handleView = (inquiry) => {
        setSelectedInquiry(inquiry);
        setReplyText(inquiry.reply_message || '');
        setShowModal(true);
        if (inquiry.status === 'pending') {
            updateStatus(inquiry._id, 'read');
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/contact/${id}`, { status });
            fetchInquiries();
        } catch (error) {
            console.error('Status update failed:', error);
        }
    };

    const handleReply = async () => {
        try {
            await axios.put(`/api/contact/${selectedInquiry._id}`, { 
                status: 'replied',
                reply_message: replyText 
            });
            setShowModal(false);
            fetchInquiries();
        } catch (error) {
            console.error('Reply failed:', error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'replied': return <Badge bg="success">Replied</Badge>;
            case 'read': return <Badge bg="info">Read</Badge>;
            case 'resolved': return <Badge bg="primary">Resolved</Badge>;
            default: return <Badge bg="warning">Pending</Badge>;
        }
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Contact Inquiries</h2>
                <Button variant="outline-primary" onClick={fetchInquiries}>Refresh</Button>
            </div>

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Subject</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-5">Loading inquiries...</td></tr>
                            ) : inquiries.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-5 text-muted">No inquiries found.</td></tr>
                            ) : inquiries.map((item) => (
                                <tr key={item._id}>
                                    <td className="px-4 py-3 small">{new Date(item.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-3 fw-semibold">{item.name}</td>
                                    <td className="px-4 py-3">{item.email}</td>
                                    <td className="px-4 py-3">{item.subject}</td>
                                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                                    <td className="px-4 py-3 text-end">
                                        <div className="d-flex gap-2 justify-content-end">
                                            <Button variant="light" size="sm" onClick={() => handleView(item)}><FaEye /></Button>
                                            <Button variant="light" size="sm" className="text-danger" onClick={() => handleDelete(item._id)}><FaTrash /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* View/Reply Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Inquiry Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4 pb-4">
                    {selectedInquiry && (
                        <>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <label className="text-muted small d-block">From</label>
                                    <strong>{selectedInquiry.name}</strong> ({selectedInquiry.email})
                                </div>
                                <div className="col-md-6 text-md-end">
                                    <label className="text-muted small d-block">Received At</label>
                                    {new Date(selectedInquiry.created_at).toLocaleString()}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="text-muted small d-block">Subject</label>
                                <h5 className="fw-bold">{selectedInquiry.subject}</h5>
                            </div>
                            <div className="mb-4 p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
                                {selectedInquiry.message}
                            </div>

                            <hr />

                            <Form.Group className="mt-4">
                                <Form.Label className="fw-bold">Admin Reply / Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    placeholder="Type your reply or internal notes here..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <div className="mt-3 d-flex gap-2">
                                    <Button variant="primary" onClick={handleReply}>Save & Reply</Button>
                                    <Button variant="outline-success" onClick={() => updateStatus(selectedInquiry._id, 'resolved')}>Mark as Resolved</Button>
                                </div>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ContactInquiries;
