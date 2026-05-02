import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../utils/axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // ES6
import { FaArrowLeft, FaSave, FaCode } from 'react-icons/fa';
import Swal from 'sweetalert2';

const PageEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        isActive: true
    });

    useEffect(() => {
        if (isEditing) {
            fetchPage();
        }
    }, [id]);

    const fetchPage = async () => {
        try {
            const { data } = await axios.get(`/api/pages/id/${id}`);
            setFormData({
                title: data.title,
                slug: data.slug,
                content: data.content,
                isActive: data.isActive
            });
        } catch (error) {
            Swal.fire('Error', 'Failed to fetch page data', 'error');
            navigate('/pages');
        } finally {
            setLoading(false);
        }
    };

    const handleTitleChange = (e) => {
        const title = e.target.value;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        setFormData(prev => ({ ...prev, title, slug: isEditing ? prev.slug : slug }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEditing) {
                await axios.put(`/api/pages/${id}`, formData);
                Swal.fire('Saved!', 'Page updated successfully', 'success');
            } else {
                await axios.post('/api/pages', formData);
                Swal.fire('Created!', 'Page created successfully', 'success');
            }
            navigate('/pages');
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to save page';
            Swal.fire('Error', msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <Button variant="light" className="mb-4 d-flex align-items-center gap-2" onClick={() => navigate('/pages')}>
                <FaArrowLeft /> Back to Pages
            </Button>

            <Card className="border-0 shadow-sm border-radius-lg">
                <Card.Header className="bg-white border-bottom p-4">
                    <h4 className="mb-0 fw-bold">{isEditing ? 'Edit Page' : 'Create New Page'}</h4>
                </Card.Header>
                <Card.Body className="p-4">
                    <Form onSubmit={handleSubmit}>
                        <Row className="mb-4">
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Page Title</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. Privacy Policy"
                                        value={formData.title}
                                        onChange={handleTitleChange}
                                        required
                                        className="py-2"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">URL Slug</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. privacy-policy"
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '') })}
                                        required
                                        className="py-2"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <Form.Label className="fw-bold mb-0">Page Content</Form.Label>
                                <Button
                                    variant={isHtmlMode ? "primary" : "outline-secondary"}
                                    size="sm"
                                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                                    title="Toggle Source Code Mode: Lets you directly paste or edit HTML tags like <div>, <style>, etc."
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FaCode /> {isHtmlMode ? 'Return to Visual Editor' : 'Edit as HTML'}
                                </Button>
                            </div>

                            <div style={{ height: '400px', marginBottom: isHtmlMode ? '0px' : '50px' }}>
                                {isHtmlMode ? (
                                    <Form.Control
                                        as="textarea"
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        style={{
                                            height: '100%',
                                            fontFamily: 'monospace',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            padding: '15px'
                                        }}
                                        placeholder="Paste your HTML code here (e.g., <div>Hello World</div>)"
                                    />
                                ) : (
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.content}
                                        onChange={content => setFormData({ ...formData, content })}
                                        style={{ height: '100%' }}
                                        modules={modules}
                                    />
                                )}
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-4 mt-5">
                            <Form.Check
                                type="switch"
                                id="is-active-switch"
                                label={<span className="fw-bold">Publish Page (Active)</span>}
                                checked={formData.isActive}
                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                            <Form.Text className="text-muted">
                                If inactive, the page will be saved as a draft and won't be visible to users.
                            </Form.Text>
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-3 mt-4 pt-4 border-top">
                            <Button variant="light" onClick={() => navigate('/pages')}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={saving} className="d-flex align-items-center gap-2 px-4">
                                {saving ? <Spinner size="sm" animation="border" /> : <FaSave />}
                                {isEditing ? 'Save Changes' : 'Create Page'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PageEditor;
