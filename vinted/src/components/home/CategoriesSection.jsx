import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    FaMobileAlt, FaHome, FaTv, FaTshirt, FaFutbol, FaEllipsisH,
    FaShoppingBag, FaGem, FaChild, FaDice, FaGamepad, FaBox
} from 'react-icons/fa';
import axios from '../../utils/axios';
import { useTranslation } from 'react-i18next';
import { safeString, getImageUrl } from '../../utils/constants';
import LanguageContext from '../../context/LanguageContext';

const CategoriesSection = () => {
    const { currentLanguage } = useContext(LanguageContext);
    const isRTL = currentLanguage?.direction === 'rtl';
    const { t } = useTranslation();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [dragged, setDragged] = useState(false);
    const requestRef = useRef();
    const lastTimeRef = useRef();

    // Fallback static categories
    const staticCategories = [
        { _id: '1', slug: 'women', name: 'Women', icon: '👗' },
        { _id: '2', slug: 'men', name: 'Men', icon: '👕' },
        { _id: '3', slug: 'designer', name: 'Designer', icon: '✨' },
        { _id: '4', slug: 'kids', name: 'Kids', icon: '🧒' },
        { _id: '5', slug: 'home', name: 'Home', icon: '🏠' },
        { _id: '6', slug: 'electronics', name: 'Electronics', icon: '💻' },
        { _id: '7', slug: 'entertainment', name: 'Entertainment', icon: '🎬' },
        { _id: '8', slug: 'accessories', name: 'Accessories', icon: '👜' },
        { _id: '9', slug: 'beauty', name: 'Beauty', icon: '💄' },
        { _id: '10', slug: 'sports', name: 'Sports', icon: '⚽' },
    ];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/categories');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setCategories(res.data.slice(0, 20));
                } else {
                    setCategories(staticCategories);
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                setCategories(staticCategories);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Auto-scroll loop
    const animate = useCallback((time) => {
        if (lastTimeRef.current !== undefined && !isMouseDown && !isHovered) {
            const deltaTime = time - lastTimeRef.current;
            const speed = 0.05; 
            const delta = speed * deltaTime;

            if (scrollRef.current) {
                // For auto-scroll, we just move "forward"
                if (isRTL) {
                    scrollRef.current.scrollLeft -= delta;
                } else {
                    scrollRef.current.scrollLeft += delta;
                }

                // Infinite loop logic: If we reached the middle, snap back
                const halfWidth = scrollRef.current.scrollWidth / 2;
                const currentScroll = Math.abs(scrollRef.current.scrollLeft);
                
                if (currentScroll >= halfWidth) {
                    if (isRTL) {
                        scrollRef.current.scrollLeft += halfWidth;
                    } else {
                        scrollRef.current.scrollLeft -= halfWidth;
                    }
                }
            }
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [isMouseDown, isHovered, isRTL]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const handleMouseDown = (e) => {
        setIsMouseDown(true);
        setDragged(false);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsMouseDown(false);
    };

    const handleMouseUp = () => {
        setIsMouseDown(false);
    };

    const handleMouseMove = (e) => {
        if (!isMouseDown) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; 
        
        if (Math.abs(walk) > 5) setDragged(true);

        if (scrollRef.current) {
            if (isRTL) {
                scrollRef.current.scrollLeft = scrollLeft + walk;
            } else {
                scrollRef.current.scrollLeft = scrollLeft - walk;
            }
        }
    };

    // Create a duplicated list for infinite look
    const marqueeItems = [...categories, ...categories];

    return (
        <section className="categories-section py-4 py-md-5 overflow-hidden">
            {/* Padded Header */}
            <Container fluid className="px-md-5 px-3">
                <div className="d-flex justify-content-between align-items-center mb-4 px-2">
                    <h2 className="section-title mb-0">{t('home.browse_categories', 'Browse Items by Category')}</h2>
                    <Link to="/categories" className="view-all-link">{t('home.view_all', 'View all')}</Link>
                </div>
            </Container>

            {/* Edge-to-Edge Marquee */}
            <div 
                className={`categories-marquee-container ${isMouseDown ? 'dragging' : ''}`}
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setIsMouseDown(false);
                }}
            >
                <div className="categories-marquee-track">
                    {marqueeItems.map((cat, index) => (
                        <Link
                            key={`${cat._id}-${index}`}
                            to={`/categories/${cat.slug}`}
                            className="category-card-marquee"
                            onClick={(e) => {
                                if (dragged) e.preventDefault();
                            }}
                        >
                            <div className="category-card h-100">
                                <div className="category-icon-wrapper">
                                    <div className="category-icon">
                                        {cat.image ? (
                                            <img
                                                src={getImageUrl(cat.image)}
                                                alt={safeString(cat.name)}
                                                className="cat-img"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                                }}
                                            />
                                        ) : null}
                                        <span className="cat-icon-span" style={{ display: cat.image ? 'none' : 'block' }}>
                                            {cat.icon || <FaBox />}
                                        </span>
                                    </div>
                                </div>
                                <span className="category-label">{safeString(cat.name)}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoriesSection;
