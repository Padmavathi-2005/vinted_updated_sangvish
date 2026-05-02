import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaPaperPlane, FaClock } from 'react-icons/fa';
import axios from '../utils/axios';
import { useTranslation } from 'react-i18next';
import '../styles/Contact.css';

const Contact = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState({
        support_email: '',
        support_phone: '',
        support_address: '',
        site_name: 'Resale'
    });

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get('/api/settings');
                setSettings(prev => ({ ...prev, ...data }));
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const { data } = await axios.post('/api/contact', formData);
            setStatus({ type: 'success', message: data.message });
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong. Please try again later.';
            setStatus({ type: 'danger', message: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contact-page">
            <div className="contact-hero">
                <Container>
                    <div className="text-center">
                        <h1 className="contact-title">{t('contact.title', 'Get in Touch')}</h1>
                        <p className="contact-subtitle">
                            {t('contact.subtitle', 'Have a question or feedback? We\'d love to hear from you. Our team is here to help!')}
                        </p>
                    </div>
                </Container>
            </div>

            <Container className="contact-container">
                <Row className="gx-lg-5">
                    {/* Contact Information */}
                    <Col lg={4} className="mb-5 mb-lg-0">
                        <div className="contact-info-wrapper">
                            <h3 className="section-title mb-4">{t('contact.info_title', 'Contact Information')}</h3>
                            
                            <div className="info-item">
                                <div className="info-icon">
                                    <FaEnvelope />
                                </div>
                                <div className="info-content">
                                    <label>{t('contact.email', 'Email Us')}</label>
                                    <p>{settings.support_email || 'support@resale.com'}</p>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon">
                                    <FaPhoneAlt />
                                </div>
                                <div className="info-content">
                                    <label>{t('contact.phone', 'Call Us')}</label>
                                    <p>{settings.support_phone || '+1 234 567 8900'}</p>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon">
                                    <FaMapMarkerAlt />
                                </div>
                                <div className="info-content">
                                    <label>{t('contact.address', 'Visit Us')}</label>
                                    <p>{settings.support_address || '123 Market St, San Francisco, CA 94103'}</p>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon">
                                    <FaClock />
                                </div>
                                <div className="info-content">
                                    <label>{t('contact.hours', 'Working Hours')}</label>
                                    <p>Mon - Fri: 9:00 AM - 6:00 PM</p>
                                </div>
                            </div>

                            <div className="contact-social-card mt-5">
                                <h5>{t('contact.connect', 'Connect with us')}</h5>
                                <p className="small text-muted mb-0">Follow our social channels for updates and fashion inspiration.</p>
                            </div>
                        </div>
                    </Col>

                    {/* Contact Form */}
                    <Col lg={8}>
                        <Card className="contact-form-card border-0 shadow-sm">
                            <Card.Body className="p-4 p-md-5">
                                <h3 className="section-title mb-4">{t('contact.form_title', 'Send us a Message')}</h3>
                                
                                {status.message && (
                                    <div className={`alert alert-${status.type} border-0 shadow-sm mb-4`}>
                                        {status.message}
                                    </div>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Row>
                                        <Col md={6} className="mb-4">
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">{t('contact.name', 'Your Name')}</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    placeholder={t('contact.name_placeholder', 'Enter your full name')}
                                                    required
                                                    className="custom-input"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-4">
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">{t('contact.email_label', 'Email Address')}</Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="example@mail.com"
                                                    required
                                                    className="custom-input"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold">{t('contact.subject', 'Subject')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder={t('contact.subject_placeholder', 'How can we help?')}
                                            required
                                            className="custom-input"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold">{t('contact.message', 'Message')}</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={5}
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder={t('contact.message_placeholder', 'Write your message here...')}
                                            required
                                            className="custom-input"
                                        />
                                    </Form.Group>

                                    <div className="text-end">
                                        <Button 
                                            type="submit" 
                                            className="contact-btn px-5 py-2 fw-bold"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                            ) : (
                                                <FaPaperPlane className="me-2" />
                                            )}
                                            {t('contact.send', 'Send Message')}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Contact;
