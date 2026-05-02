import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from '../../utils/axios';
import ItemCard from '../common/ItemCard';
import SkeletonCard from '../common/SkeletonCard';
import { useTranslation } from 'react-i18next';

const ListingsSection = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('popular'); // Default to popular
    const [popularItems, setPopularItems] = useState([]);
    const [newestItems, setNewestItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    // Fetch primary color
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                if (res.data && res.data.primary_color) {
                    setPrimaryColor(res.data.primary_color);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch items
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [popularRes, newestRes] = await Promise.all([
                    axios.get('/api/items?sort=popular&limit=30'),
                    axios.get('/api/items?sort=newest&limit=30')
                ]);
                setPopularItems(popularRes.data.items || []);
                setNewestItems(newestRes.data.items || []);
            } catch (err) {
                console.error("Error fetching items:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Refs for tabs to animate underline
    const tabsRef = useRef(null);
    const [lineStyle, setLineStyle] = useState({});

    useEffect(() => {
        const updateLine = () => {
            if (tabsRef.current) {
                const activeElement = tabsRef.current.querySelector(`.tab-item[data-tab="${activeTab}"]`);
                if (activeElement) {
                    const { offsetLeft, offsetWidth } = activeElement;
                    // Slightly shorter than text (70%) and centered
                    const lineWidth = offsetWidth * 0.7;
                    const lineLeft = offsetLeft + (offsetWidth - lineWidth) / 2;

                    setLineStyle({
                        left: `${lineLeft}px`,
                        width: `${lineWidth}px`,
                        backgroundColor: primaryColor
                    });
                }
            }
        };

        updateLine();
        window.addEventListener('resize', updateLine);
        return () => window.removeEventListener('resize', updateLine);
    }, [activeTab, primaryColor]);

    // Dynamic column calculation for "Exactly 2 rows"
    const [columns, setColumns] = useState(6);
    const gridRef = useRef(null);

    useEffect(() => {
        const updateColumns = () => {
            if (gridRef.current) {
                const containerWidth = gridRef.current.offsetWidth;
                const minColWidth = 200; // Matching index.css minmax(200px, ...)
                const gap = 24; // Matching index.css gap: 24px
                const count = Math.floor((containerWidth + gap) / (minColWidth + gap));
                setColumns(count > 0 ? count : 1);
            }
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        // Small delay to ensure styles are applied
        const timer = setTimeout(updateColumns, 100);
        return () => {
            window.removeEventListener('resize', updateColumns);
            clearTimeout(timer);
        };
    }, [loading]); // Recalculate when loading state changes

    if (!loading && popularItems.length === 0 && newestItems.length === 0) {
        return null; // Hide section if no items
    }

    const rawItems = activeTab === 'popular' ? popularItems : newestItems;
    // Show exactly 2 rows
    const isMobileOrTablet = window.innerWidth <= 991;
    const itemsToShow = isMobileOrTablet ? 10 : (columns * 2);
    const displayItems = rawItems.slice(0, itemsToShow);
    const skeletonCount = itemsToShow;

    return (
        <section className="listings-section py-4 py-md-5" style={{ backgroundColor: '#f8fafc', minHeight: '600px' }}>
            <Container fluid className="px-md-5 px-3">
                {/* Tabs */}
                <div className="section-tabs-container mb-3 mb-md-4 position-relative" style={{ borderBottom: '2px solid #e2e8f0', display: 'inline-block', width: '100%' }}>
                    <div ref={tabsRef} className="d-flex gap-3 gap-md-5" style={{ position: 'relative', paddingBottom: '12px' }}>
                        <span
                            className="tab-item"
                            data-tab="popular"
                            onMouseEnter={() => setActiveTab('popular')}
                            onClick={() => setActiveTab('popular')}
                            style={{
                                fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
                                fontWeight: '700',
                                cursor: 'pointer',
                                color: activeTab === 'popular' ? primaryColor : '#94a3b8',
                                transition: 'color 0.3s ease'
                            }}
                        >
                            {t('home.popular_items', 'Popular Items')}
                        </span>
                        <span
                            className="tab-item"
                            data-tab="newest"
                            onMouseEnter={() => setActiveTab('newest')}
                            onClick={() => setActiveTab('newest')}
                            style={{
                                fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
                                fontWeight: '700',
                                cursor: 'pointer',
                                color: activeTab === 'newest' ? primaryColor : '#94a3b8',
                                transition: 'color 0.3s ease'
                            }}
                        >
                            {t('home.newest_listings', 'Newest Listings')}
                        </span>

                        {/* Animated Line */}
                        <div
                            className="tab-line"
                            style={{
                                position: 'absolute',
                                bottom: '-2px', // Overlap border
                                height: '3px',
                                borderRadius: '3px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                ...lineStyle
                            }}
                        />
                    </div>
                </div>

                <div ref={gridRef} className="vinted-product-grid mb-5">
                    {loading ? (
                        [...Array(skeletonCount || 12)].map((_, i) => (
                            <SkeletonCard key={i} />
                        ))
                    ) : displayItems.length > 0 ? (
                        displayItems.map(item => (
                            <ItemCard key={item._id} item={item} />
                        ))
                    ) : (
                        <div className="w-100 text-center py-5" style={{ gridColumn: '1 / -1' }}>
                            <p className="text-muted">No items found in this category.</p>
                        </div>
                    )}
                </div>

                {/* Load More Button */}
                <div className="text-center">
                    <Link to="/products" className="text-decoration-none">
                        <Button
                            variant="outline-dark"
                            className="btn-load-more"
                            style={{
                                border: `2px solid ${primaryColor}`,
                                color: primaryColor,
                                fontWeight: 'bold',
                                padding: '12px 40px',
                                borderRadius: '8px',
                                transition: 'all 0.3s ease',
                                background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = primaryColor;
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = primaryColor;
                            }}
                        >
                            {t('home.see_more', 'See more')}
                        </Button>
                    </Link>
                </div>
            </Container>
        </section>
    );
};

export default ListingsSection;
