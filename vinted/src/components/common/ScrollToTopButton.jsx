import React, { useState, useEffect } from 'react';
import { FaChevronUp } from 'react-icons/fa';

const ScrollToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    const toggleVisibility = () => {
        if (window.pageYOffset > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Scroll to top smoothly
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <div
            className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
            onClick={scrollToTop}
            style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                zIndex: 1000,
                cursor: 'pointer',
                opacity: isVisible ? '1' : '0',
                visibility: isVisible ? 'visible' : 'hidden',
                transition: 'all 0.3s ease',
                backgroundColor: 'var(--primary-variation-color, #f0f9ff)',
                color: 'white',
                width: '45px',
                height: '45px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2.5px solid var(--primary-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
            }}
        >
            <FaChevronUp style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }} />
        </div>
    );
};

export default ScrollToTopButton;
