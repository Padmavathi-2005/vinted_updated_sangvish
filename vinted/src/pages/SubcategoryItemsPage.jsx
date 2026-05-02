import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import ItemCard from '../components/common/ItemCard';
import SkeletonCard from '../components/common/SkeletonCard';
import { FaAngleLeft, FaAngleRight, FaRedo, FaSearch, FaSortAmountDown, FaThLarge, FaList } from 'react-icons/fa';
import { getImageUrl, safeString } from '../utils/constants';
import Meta from '../components/common/Meta';


const SubcategoryItemsPage = () => {
    const { slug, subSlug } = useParams();
    const navigate = useNavigate();

    const [category, setCategory] = useState(null);
    const [subcategory, setSubcategory] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [paginationMode, setPaginationMode] = useState('scroll');
    const [sort, setSort] = useState('newest');
    const [settings, setSettings] = useState({ primary_color: '#0ea5e9', pagination_limit: 12 });

    const observer = useRef();
    const pc = settings.primary_color || '#0ea5e9';
    const isAllSub = subSlug === 'all';

    // Fetch category info
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [catRes, settingsRes] = await Promise.all([
                    axios.get('/api/categories/full').catch(() => ({ data: [] })),
                    axios.get('/api/settings').catch(() => ({ data: null }))
                ]);
                if (settingsRes.data) setSettings(prev => ({ ...prev, ...settingsRes.data }));
                const allCats = Array.isArray(catRes.data) ? catRes.data : [];
                const found = allCats.find(c => c.slug === slug);
                if (found) {
                    setCategory(found);
                    if (!isAllSub) {
                        const sub = (found.subcategories || []).find(s => s.slug === subSlug);
                        setSubcategory(sub || null);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch category:', err);
            }
        };
        fetchMeta();
    }, [slug, subSlug, isAllSub]);

    // Reset items on filter change
    useEffect(() => {
        setItems([]);
        setPage(1);
        setPaginationMode('scroll');
    }, [slug, subSlug, sort]);

    const fetchItems = useCallback(async (pageNum, isScroll = false) => {
        try {
            setLoading(true);
            const params = {
                page: pageNum,
                limit: settings.pagination_limit || 12,
                category: slug,
                ...(!isAllSub && { subcategory: subSlug }),
                sort,
            };
            const response = await axios.get('/api/items', { params });
            const { items: newItems, totalCount: tc, totalPages: tp } = response.data;
            setTotalCount(tc);
            setTotalPages(tp);
            if (isScroll) {
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i._id));
                    return [...prev, ...newItems.filter(i => !existingIds.has(i._id))];
                });
            } else {
                setItems(newItems);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [slug, subSlug, isAllSub, sort, settings.pagination_limit]);

    useEffect(() => {
        if (paginationMode === 'number') {
            fetchItems(page, false);
        } else if (page === 1) {
            fetchItems(1, true);
        }
    }, [page, paginationMode, fetchItems]);

    // Infinite scroll
    const lastItemRef = useCallback(node => {
        if (loading || paginationMode === 'number') return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages) {
                setPage(p => p + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, paginationMode, page, totalPages]);

    useEffect(() => {
        if (paginationMode === 'scroll' && page > 1) {
            fetchItems(page, true);
        }
    }, [page, paginationMode, fetchItems]);

    const handleModeSwitch = mode => {
        if (mode === paginationMode) return;
        setItems([]);
        setPage(1);
        setPaginationMode(mode);
    };

    const displayTitle = isAllSub
        ? `All ${safeString(category?.name) || ''} Items`
        : (safeString(subcategory?.name) || subSlug?.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' '));

    return (
        <div style={{ backgroundColor: '#fff', minHeight: '80vh' }}>
            <Meta 
                title={displayTitle} 
                description={`Browse the best pre-loved ${displayTitle} and more fashion items on our community marketplace.`} 
                image={getImageUrl(subcategory?.image || category?.image)}
            />
            {/* Breadcrumb header bar */}
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 0' }}>
                <Container fluid className="px-md-5 px-3">
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <Link to="/categories" style={{ color: '#94a3b8', textDecoration: 'none' }}>Categories</Link>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <Link to={`/categories/${slug}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>
                            {safeString(category?.name) || slug}
                        </Link>
                        {!isAllSub && (
                            <>
                                <span style={{ color: '#94a3b8' }}>/</span>
                                <span style={{ color: '#1e293b', fontWeight: '600' }}>{displayTitle}</span>
                            </>
                        )}
                    </div>
                </Container>
            </div>

            <Container fluid className="px-md-5 px-3 py-3">
                {/* Page title */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
                    {/* Left: Title & Count */}
                    <div className="d-flex align-items-center gap-3">
                        {/* Category/sub icon */}
                        {(subcategory?.image || category?.image) && (
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden',
                                background: `${pc}12`, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <img
                                    src={getImageUrl(subcategory?.image || category?.image)}
                                    alt={displayTitle}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                                    onError={e => e.target.style.display = 'none'}
                                />
                            </div>
                        )}
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                {displayTitle}
                            </h1>
                            <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>
                                {totalCount} items found
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions (Sort, Paginate, Refresh) */}
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {/* Sort */}
                        <div className="d-flex align-items-center gap-2 me-2">
                            <FaSortAmountDown style={{ color: '#94a3b8' }} />
                            <Form.Select
                                size="sm"
                                value={sort}
                                onChange={e => setSort(e.target.value)}
                                style={{
                                    width: 'auto',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    color: '#1e293b',
                                    cursor: 'pointer',
                                    minWidth: '160px'
                                }}
                            >
                                <option value="newest">Newest First</option>
                                <option value="popular">Relevance</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="discounted">Sale Items</option>
                                <option value="oldest">Oldest First</option>
                            </Form.Select>
                        </div>

                        {totalCount > (settings.pagination_limit || 12) && (
                            <div className="btn-group shadow-sm" role="group">
                                <button
                                    type="button" className="btn btn-sm"
                                    onClick={() => handleModeSwitch('scroll')}
                                    style={{
                                        background: paginationMode === 'scroll' ? pc : 'white',
                                        color: paginationMode === 'scroll' ? 'white' : '#64748b',
                                        border: '1px solid #e2e8f0', borderRadius: '8px 0 0 8px', fontWeight: '500'
                                    }}
                                >
                                    <FaList className="me-1" /> Scroll
                                </button>
                                <button
                                    type="button" className="btn btn-sm"
                                    onClick={() => handleModeSwitch('number')}
                                    style={{
                                        background: paginationMode === 'number' ? pc : 'white',
                                        color: paginationMode === 'number' ? 'white' : '#64748b',
                                        border: '1px solid #e2e8f0', borderRadius: '0 8px 8px 0', fontWeight: '500',
                                        borderLeft: 'none'
                                    }}
                                >
                                    <FaThLarge className="me-1" /> Pages
                                </button>
                            </div>
                        )}
                        <button
                            type="button" className="btn btn-sm btn-outline-secondary"
                            style={{ borderRadius: '8px', padding: '6px 12px' }}
                            onClick={() => { setItems([]); setPage(1); fetchItems(1, false); }}
                            title="Refresh"
                        >
                            <FaRedo />
                        </button>
                    </div>
                </div>

                {/* Items Grid */}
                {loading && items.length === 0 ? (
                    <div className="vinted-product-grid">
                        {[...Array(8)].map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="vinted-product-grid">
                        {items.map((item, index) => (
                            <div
                                ref={items.length === index + 1 && paginationMode === 'scroll' ? lastItemRef : null}
                                key={item._id || index}
                                className="fade-in"
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <ItemCard item={item} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && items.length === 0 && (
                    <div className="text-center py-5 text-muted">
                        <FaSearch style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
                        <h4>No items found</h4>
                        <p>Try browsing a different category or check back later.</p>
                        <button
                            onClick={() => navigate(`/categories/${slug}`)}
                            style={{
                                background: pc, color: 'white', border: 'none',
                                borderRadius: '24px', padding: '10px 24px',
                                fontWeight: '700', cursor: 'pointer', marginTop: '8px'
                            }}
                        >
                            Back to {safeString(category?.name) || 'Categories'}
                        </button>
                    </div>
                )}

                {/* Scroll loading dots */}
                {loading && paginationMode === 'scroll' && items.length > 0 && (
                    <div className="text-center py-4">
                        <div className="spinner-grow spinner-grow-sm mx-1" style={{ color: pc }} />
                        <div className="spinner-grow spinner-grow-sm mx-1" style={{ color: pc }} />
                        <div className="spinner-grow spinner-grow-sm mx-1" style={{ color: pc }} />
                    </div>
                )}

                {/* Number Pagination */}
                {paginationMode === 'number' && totalPages > 1 && (
                    <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <FaAngleLeft /> Prev
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next <FaAngleRight />
                        </button>
                    </div>
                )}
            </Container>
        </div>
    );
};

export default SubcategoryItemsPage;
