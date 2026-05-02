import React, { useContext } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LanguageContext from '../../context/LanguageContext';
import { getImageUrl } from '../../utils/constants';

const SustainabilitySection = () => {
    const { td, ti } = useContext(LanguageContext);
    return (
        <section className="sustainability-section">
            <Container fluid className="px-md-5 px-3">
                <div className="sustainability-banner">
                    <Row className="align-items-center">
                        <Col lg={6}>
                            <h2 className="banner-title mb-4">{td('sustainability.give_second_life', 'Give your items a second life.')}</h2>
                            <p className="banner-text mb-5">
                                {td('sustainability.clutter_treasure', 'Someone\'s clutter is another person\'s treasure. Selling your unused items extends their lifecycle and keeps them out of landfills. Join the circular economy today.')}
                            </p>
                            <Link to="/sell" className="text-decoration-none">
                                <Button className="btn-black">{td('sustainability.start_selling', 'Start Selling Now')}</Button>
                            </Link>
                        </Col>
                        <Col lg={6} className="d-none d-lg-block">
                            <div className="banner-images">
                                <div className="banner-img-v1" style={{ backgroundImage: `url("${getImageUrl(ti('sustainability.sustainability_image_1', 'https://images.unsplash.com/photo-1556012018-50c5c0da73bf?w=600&q=80'))}")` }}></div>
                                <div className="banner-img-v2" style={{ backgroundImage: `url("${getImageUrl(ti('sustainability.sustainability_image_2', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&q=80'))}")` }}></div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </Container>
        </section>
    );
};

export default SustainabilitySection;
