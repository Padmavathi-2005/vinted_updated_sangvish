import React, { useContext } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaStar, FaUsers } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { safeString, getImageUrl } from '../../utils/constants';
import LanguageContext from '../../context/LanguageContext';

const HeroSection = () => {
    const { t } = useTranslation();
    const { td, ti, currentLanguage } = useContext(LanguageContext);

    const heroTitle = td('home.hero_title', 'Buy & sell everything from cars to couches.');
    const heroImage = ti('home.hero_image', '/images/site/image-1773913000000-141245287.jpg');
    const titleParts = heroTitle.includes('from') ? heroTitle.split('from') : [heroTitle, ''];

    const isRTL = currentLanguage?.direction === 'rtl';
    const processedImage = getImageUrl(heroImage);

    const heroStyle = {
        backgroundImage: `linear-gradient(to ${isRTL ? 'left' : 'right'}, rgba(0, 0, 0, 0.90) 0%, rgba(0, 0, 0, 0.7) 30%, rgba(0, 0, 0, 0.0) 100%), url('${processedImage}')`
    };

    return (
        <section className="hero-section" style={heroStyle}>
            <Container fluid className="px-md-5 px-3">
                <Row className="align-items-center min-vh-75">
                    <Col lg={9} md={10} className="hero-content">
                        <div className="hero-badge animate-fade-in">
                            {td('home.hero_badge', 'LOCAL CLASSIFIEDS MARKETPLACE')}
                        </div>
                        <h1 className="hero-title animate-slide-up">
                            {titleParts[0]} {titleParts[1] && <span className="text-primary">from {titleParts[1]}</span>}
                        </h1>
                        <p className="hero-subtitle animate-slide-up delay-1">
                            {td('home.hero_subtitle', 'Join millions of neighbors finding great deals on pre-owned items.')}
                        </p>
                        <div className="hero-buttons animate-slide-up delay-2">
                            <Link to="/sell">
                                <Button className="btn-hero-primary">
                                    {td('home.start_selling', 'Start Selling')} <FaArrowRight className="ms-2" />
                                </Button>
                            </Link>
                            <Link to="/products">
                                <Button variant="outline-light" className="btn-hero-secondary">
                                    {td('home.explore_items', 'Explore Items')}
                                </Button>
                            </Link>
                        </div>
                        <div className="hero-stats animate-fade-in delay-3">
                            <div className="stat-item">
                                <FaStar className="stat-icon" />
                                <div>
                                    <div className="stat-number">{td('home.stat_rating_value', '4.8/5')}</div>
                                    <div className="stat-label">{td('home.stat_rating_label', 'User Trust Rating')}</div>
                                </div>
                            </div>
                            <div className="stat-item">
                                <FaUsers className="stat-icon" />
                                <div>
                                    <div className="stat-number">{td('home.stat_sellers_value', '5M+')}</div>
                                    <div className="stat-label">{td('home.stat_sellers_label', 'Happy Sellers')}</div>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
};

export default HeroSection;
