import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaTools } from 'react-icons/fa';
import axios from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import LanguageContext from '../context/LanguageContext';
import { Player } from '@lottiefiles/react-lottie-player';
import '../styles/Maintenance.css';

const Maintenance = () => {
    const { settings } = useSettings();
    const { td, dynamicContent } = React.useContext(LanguageContext);

    // Default to Lottie JSON animation
    const lottieUrl = `${axios.defaults.baseURL}/images/site/maintenance.json`;

    // Check if a custom image was explicitly uploaded in the admin panel
    const customImageValue = dynamicContent?.maintenance?.image;
    let customImageUrl = null;

    if (customImageValue) {
        customImageUrl = customImageValue.startsWith('http')
            ? customImageValue
            : `${axios.defaults.baseURL}/${customImageValue}`;
    }

    return (
        <div className="maintenance-wrapper p-0" style={{ backgroundColor: '#ffffff' }}>
            <Container fluid className="px-0">
                <Card className="border-0 p-4 text-center align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: 'transparent' }}>
                    <Row className="w-100 align-items-center justify-content-center">
                        {/* Text Content */}
                        <Col lg={5} md={6} className="text-section text-md-start text-center mb-5 mb-md-0 px-md-5">
                            <div className="maintenance-icon-wrapper mb-3">
                                <FaTools size={50} className="maintenance-icon text-primary" />
                            </div>
                            <h2 className="maintenance-title fw-bold">{td('maintenance.title', 'Under Maintenance')}</h2>
                            <h4 className="fw-bold text-dark mb-3">{td('maintenance.heading', "We'll be back shortly!")}</h4>
                            <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                                {td('maintenance.message', "Our marketplace is currently undergoing scheduled maintenance. We're working hard to improve your experience and will be back online very soon. Thank you for your patience!")}
                            </p>
                        </Col>

                        {/* Image Content */}
                        <Col lg={5} md={6} className="image-section d-flex justify-content-center px-md-5">
                            <div className="maintenance-image-wrapper">
                                {customImageUrl ? (
                                    <img
                                        src={customImageUrl}
                                        alt="Maintenance"
                                        className="maintenance-gif img-fluid floating-animation"
                                    />
                                ) : (
                                    <Player
                                        autoplay
                                        loop
                                        src={lottieUrl}
                                        style={{ height: 'auto', width: '100%', maxWidth: '500px' }}
                                        className="floating-animation"
                                    />
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card>
            </Container>
        </div>
    );
};

export default Maintenance;
