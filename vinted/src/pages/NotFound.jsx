import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import '../styles/NotFound.css';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-wrapper p-0" style={{ backgroundColor: '#f8f9fa' }}>
            <Container fluid className="px-0">
                <Card className="border-0 p-4 text-center align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 120px)', backgroundColor: 'transparent' }}>
                    <Row className="w-100 align-items-center justify-content-center">
                        {/* Left Side Text Content */}
                        <Col lg={5} md={6} className="text-section text-md-start text-center mb-5 mb-md-0 px-md-5">
                            <div className="glitch-wrapper mb-3">
                                <h2 className="glitch" data-text="404 Not Found">404 Not Found</h2>
                            </div>
                            <h4 className="fw-bold text-dark mb-3">You've reached an uncharted sector.</h4>
                            <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                                The coordinates you provided don't exist in our current database.
                                It looks like the link might be broken, or the page has been permanently relocated.
                            </p>

                            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-md-start">
                                <Button
                                    variant="primary"
                                    className="back-home-btn d-flex align-items-center justify-content-center gap-2 px-4 py-2"
                                    style={{ borderRadius: '50px' }}
                                    onClick={() => navigate('/')}
                                >
                                    <FaHome /> Return to Home
                                </Button>
                            </div>
                        </Col>

                        {/* Right Side GIF / Animation */}
                        <Col lg={5} md={6} className="image-section d-flex justify-content-center px-md-5">
                            <div className="robot-wrapper">
                                {/* Using a sleek placeholder robot searching GIF */}
                                <img
                                    src="https://cdn.dribbble.com/users/722246/screenshots/3066818/404-page.gif"
                                    alt="Robot Searching"
                                    className="robot-gif img-fluid floating-animation"
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>
            </Container>
        </div>
    );
};

export default NotFound;
