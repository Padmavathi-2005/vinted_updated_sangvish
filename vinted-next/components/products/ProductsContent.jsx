'use client';

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Row, Col, Offcanvas, Button, Badge, Alert } from 'react-bootstrap';
import {
    FaSearch, FaAngleLeft, FaAngleRight, FaFilter, FaTimes,
    FaSortAmountDown, FaLayerGroup, FaTags, FaPalette, FaHistory,
    FaCheckCircle, FaRulerCombined, FaChevronDown, FaChevronUp,
    FaSlidersH, FaTimesCircle
} from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import { IoPricetagsOutline } from 'react-icons/io5';
import axios from '@/utils/axios';
import CurrencyContext from '@/context/CurrencyContext';
import ItemCard from '@/components/common/ItemCard';
import SkeletonCard from '@/components/common/SkeletonCard';
import Pagination from '@/components/common/Pagination';
import Meta from '@/components/common/Meta';
import { getImageUrl } from '@/utils/constants';
import '@/app/styles/Products.css';
import Link from 'next/link';

/* ── Collapsible filter group ────────────────────────────── */
const FilterGroup = ({ title, icon, defaultOpen = true, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    const groupRef = useRef(null);

    const toggleOpen = () => {
        setOpen(o => {
            const willOpen = !o;
            if (willOpen) {
                setTimeout(() => {
                    if (groupRef.current) {
                        groupRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 100);
            }
            return willOpen;
        });
    };

    return (
        <div className={`filter-group ${open ? 'is-open' : ''}`} ref={groupRef}>
            <button className="filter-group-header" onClick={toggleOpen}>
                <span className="filter-group-left">
                    <span className="filter-group-icon">{icon}</span>
                    <span className="filter-group-title">{title}</span>
                </span>
                {open ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            </button>
            {open && <div className="filter-group-body slide-down-fade">{children}</div>}
        </div>
    );
};

/* ── Active filter pill ──────────────────────────────────── */
const ActivePill = ({ label, onClear }) => (
    <span className="active-filter-pill" onClick={onClear}>
        {label} <FaTimes size={9} />
    </span>
);

const ProductsContent = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [paginationMode, setPaginationMode] = useState('scroll');

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams();

    const { slug, subSlug } = params;
    const { currentCurrency } = useContext(CurrencyContext);

    const categorySlug = slug || searchParams.get('category');
    const subcategorySlug = subSlug === 'all' ? '' : (subSlug || searchParams.get('subcategory'));
    const itemTypeSlug = searchParams.get('itemType');
    const search = searchParams.get('search');
    const ai_setup = searchParams.get('ai_setup');

    const [size, setSize] = useState(searchParams.get('size') || '');
    const [brand, setBrand] = useState(searchParams.get('brand') || '');
    const [condition, setCondition] = useState(searchParams.get('condition') || '');
    const [color, setColor] = useState(searchParams.get('color') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [material, setMaterial] = useState(searchParams.get('material') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

    const [currentCategory, setCurrentCategory] = useState(null);
    const [currentSubcategory, setCurrentSubcategory] = useState(null);
    const [categories, setCategories] = useState([]);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const observer = useRef();

    const activeFiltersCount = [search, size, brand, condition, color,
        (minPrice || maxPrice) ? 'price' : '',
        (sort && sort !== 'newest') ? sort : ''
    ].filter(Boolean).length;

    /* ── Fetch categories ──────────────────────────────────── */
    useEffect(() => {
        axios.get('/api/categories/full')
            .then(({ data }) => setCategories(data))
            .catch(err => console.error(err));
    }, []);

    /* ── Sync state with URL ───────────────────────────────── */
    useEffect(() => {
        setSize(searchParams.get('size') || '');
        setBrand(searchParams.get('brand') || '');
        setCondition(searchParams.get('condition') || '');
        setColor(searchParams.get('color') || '');
        setMinPrice(searchParams.get('minPrice') || '');
        setMaxPrice(searchParams.get('maxPrice') || '');
        setMaterial(searchParams.get('material') || '');
        setSort(searchParams.get('sort') || 'newest');
    }, [searchParams]);

    /* ── Current category ─────────────────────────────────── */
    useEffect(() => {
        if (!categories.length) return;
        const cat = categories.find(c => c.slug === categorySlug);
        setCurrentCategory(cat || null);
        if (cat && subcategorySlug) {
            const sub = (cat.subcategories || []).find(s => s.slug === subcategorySlug);
            setCurrentSubcategory(sub || null);
        } else {
            setCurrentSubcategory(null);
        }
    }, [categorySlug, subcategorySlug, categories]);

    /* ── Reset on filter change ───────────────────────────── */
    useEffect(() => {
        setItems([]);
        setPage(1);
        setTotalCount(0);
        setPaginationMode('scroll');
    }, [categorySlug, subcategorySlug, itemTypeSlug, search, sort, size, brand, condition, color, minPrice, maxPrice, material, currentCurrency]);

    /* ── Fetch items ──────────────────────────────────────── */
    const fetchItems = useCallback(async (pageNum, isScroll = false) => {
        try {
            setLoading(true);
            const apiParams = {
                page: pageNum, limit: 12,
                category: categorySlug, subcategory: subcategorySlug,
                itemType: itemTypeSlug, search, sort, size, brand,
                condition, color, minPrice, maxPrice, material,
                user_exchange_rate: currentCurrency?.exchange_rate || 1
            };
            const { data } = await axios.get('/api/items', { params: apiParams });
            const { items: newItems, totalCount, totalPages } = data;
            setTotalCount(totalCount);
            setTotalPages(totalPages);
            if (isScroll) {
                setItems(prev => {
                    const ids = new Set(prev.map(i => i._id));
                    return [...prev, ...newItems.filter(i => !ids.has(i._id))];
                });
            } else {
                setItems(newItems);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch items');
        } finally {
            setLoading(false);
        }
    }, [categorySlug, subcategorySlug, itemTypeSlug, search, sort, size, brand, condition, color, minPrice, maxPrice, material, currentCurrency]);

    useEffect(() => {
        if (paginationMode === 'number') fetchItems(page, false);
        else if (page === 1) fetchItems(1, true);
    }, [page, paginationMode, fetchItems]);

    const lastItemRef = useCallback(node => {
        if (loading || paginationMode === 'number') return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages) setPage(p => p + 1);
        });
        if (node) observer.current.observe(node);
    }, [loading, paginationMode, page, totalPages]);

    useEffect(() => {
        if (paginationMode === 'scroll' && page > 1) fetchItems(page, true);
    }, [page, paginationMode, fetchItems]);

    /* ── Filter handler ───────────────────────────────────── */
    const handleFilterChange = (key, val) => {
        const p = new URLSearchParams(searchParams.toString());
        if (typeof val === 'object' && val !== null) {
            const paramKey = { min: 'minPrice', max: 'maxPrice' };
            Object.keys(val).forEach(k => val[k] ? p.set(paramKey[k], val[k]) : p.delete(paramKey[k]));
            setMinPrice(val.min || ''); setMaxPrice(val.max || '');
        } else {
            val ? p.set(key, val) : p.delete(key);
            if (key === 'category') { p.delete('subcategory'); p.delete('itemType'); }
            if (key === 'subcategory') p.delete('itemType');
            if (key === 'size') setSize(val);
            if (key === 'brand') setBrand(val);
            if (key === 'condition') setCondition(val);
            if (key === 'color') setColor(val);
            if (key === 'material') setMaterial(val);
            if (key === 'sort') setSort(val);
        }
        if (slug) {
            const base = subSlug ? `/categories/${slug}/${subSlug}` : `/categories/${slug}`;
            p.delete('category');
            router.push(`${base}?${p.toString()}`);
        } else {
            p.set('page', '1');
            router.push(`/products?${p.toString()}`);
        }
    };

    const clearAllFilters = () => {
        if (slug) router.push(subSlug ? `/categories/${slug}/${subSlug}` : `/categories/${slug}`);
        else router.push('/products');
        setSize(''); setBrand(''); setCondition(''); setColor('');
        setMinPrice(''); setMaxPrice(''); setMaterial(''); setSort('newest');
    };

    const formatSlug = s => s ? s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    const pageTitle = search
        ? `Results for "${search}"`
        : subcategorySlug ? (currentSubcategory?.name || formatSlug(subcategorySlug))
            : categorySlug ? (currentCategory?.name || formatSlug(categorySlug))
                : t('products.shop_collection', 'Shop Collection');

    /* ── Filter Panel (shared desktop + offcanvas) ─────────── */
    const renderFilterPanel = (inOffcanvas = false) => (
        <div className={`filter-panel-inner ${inOffcanvas ? 'in-offcanvas' : ''}`}>

            {/* SORT BY */}
            <FilterGroup title={t('products.sort_by', 'Sort By')} icon={<FaSortAmountDown size={13} />}>
                {[
                    { value: 'popular', label: 'Relevance' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'newest', label: 'Newest First' },
                    { value: 'discounted', label: 'Sale Items' }
                ].map(opt => (
                    <div
                        key={opt.value}
                        className={`filter-option ${sort === opt.value ? 'active' : ''}`}
                        onClick={() => handleFilterChange('sort', opt.value)}
                    >
                        <span>{opt.label}</span>
                        {sort === opt.value && <FaCheckCircle size={11} className="filter-check" />}
                    </div>
                ))}
            </FilterGroup>

            {/* CATEGORY */}
            <FilterGroup title={t('products.category', 'Category')} icon={<BiCategoryAlt size={15} />}>
                {[{ slug: '', name: 'All Categories' }, ...categories].map(c => (
                    <div
                        key={c._id || 'all'}
                        className={`filter-option ${(c.slug === '' ? !categorySlug : categorySlug === c.slug) ? 'active' : ''}`}
                        onClick={() => handleFilterChange('category', c.slug)}
                    >
                        <span>{c.name}</span>
                        {(c.slug === '' ? !categorySlug : categorySlug === c.slug) && <FaCheckCircle size={11} className="filter-check" />}
                    </div>
                ))}
            </FilterGroup>

            {/* SUBCATEGORY */}
            {categorySlug && (currentCategory?.subcategories || []).length > 0 && (
                <FilterGroup title={t('products.style_type', 'Style & Type')} icon={<FaLayerGroup size={13} />}>
                    {[{ slug: '', name: `All ${currentCategory?.name || 'Items'}` }, ...(currentCategory?.subcategories || [])].map(s => (
                        <div
                            key={s._id || 'all'}
                            className={`filter-option ${(s.slug === '' ? !subcategorySlug : subcategorySlug === s.slug) ? 'active' : ''}`}
                            onClick={() => handleFilterChange('subcategory', s.slug)}
                        >
                            <span>{s.name}</span>
                            {(s.slug === '' ? !subcategorySlug : subcategorySlug === s.slug) && <FaCheckCircle size={11} className="filter-check" />}
                        </div>
                    ))}
                </FilterGroup>
            )}

            {/* PRICE */}
            <FilterGroup title={t('products.price_range', 'Price Range')} icon={<IoPricetagsOutline size={15} />}>
                {minPrice && maxPrice && parseFloat(maxPrice) < parseFloat(minPrice) && (
                    <div className="price-error-msg fade-in" style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaTimesCircle size={10} /> {t('products.max_must_be_greater', 'Max must be ≥ Min')}
                    </div>
                )}
                <div className="price-range-inputs">
                    <div className="price-input-wrap">
                        <span className="price-sym">{currentCurrency?.symbol}</span>
                        <input type="number" placeholder="Min" className="price-input" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                    </div>
                    <span className="price-dash">—</span>
                    <div className={`price-input-wrap ${minPrice && maxPrice && parseFloat(maxPrice) < parseFloat(minPrice) ? 'invalid' : ''}`}>
                        <span className="price-sym">{currentCurrency?.symbol}</span>
                        <input type="number" placeholder="Max" className="price-input" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                    </div>
                </div>
                <button 
                    className="apply-price-btn" 
                    disabled={minPrice && maxPrice && parseFloat(maxPrice) < parseFloat(minPrice)}
                    onClick={() => handleFilterChange('price', { min: minPrice, max: maxPrice })}
                >
                    Apply Range
                </button>
            </FilterGroup>

            {/* SIZE */}
            <FilterGroup title={t('products.size', 'Size')} icon={<FaRulerCombined size={13} />} defaultOpen={false}>
                <div className="size-grid">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                        <div
                            key={s}
                            className={`size-chip ${size === s ? 'active' : ''}`}
                            onClick={() => handleFilterChange('size', size === s ? '' : s)}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            </FilterGroup>

            {/* COLOR */}
            <FilterGroup title={t('products.color', 'Color')} icon={<FaPalette size={13} />} defaultOpen={false}>
                <div className="color-grid">
                    {[
                        { name: 'Black', hex: '#1a1a1a' },
                        { name: 'White', hex: '#f5f5f5' },
                        { name: 'Red', hex: '#ef4444' },
                        { name: 'Blue', hex: '#3b82f6' },
                        { name: 'Green', hex: '#22c55e' },
                        { name: 'Yellow', hex: '#eab308' },
                        { name: 'Pink', hex: '#ec4899' },
                        { name: 'Brown', hex: '#92400e' },
                    ].map(c => (
                        <button
                            key={c.name}
                            className={`color-chip ${color === c.name ? 'active' : ''}`}
                            title={c.name}
                            onClick={() => handleFilterChange('color', color === c.name ? '' : c.name)}
                            style={{ '--chip-color': c.hex }}
                        >
                            <span className="color-dot" style={{ background: c.hex }} />
                            {color === c.name && <FaCheckCircle className="color-check" size={8} />}
                        </button>
                    ))}
                </div>
            </FilterGroup>

            {/* BRAND */}
            <FilterGroup title={t('products.brand', 'Brand')} icon={<FaTags size={13} />} defaultOpen={false}>
                {['Nike', 'Adidas', 'Zara', 'H&M', 'Puma', 'Levi\'s'].map(b => (
                    <div
                        key={b}
                        className={`filter-option ${brand === b ? 'active' : ''}`}
                        onClick={() => handleFilterChange('brand', brand === b ? '' : b)}
                    >
                        <span>{b}</span>
                        {brand === b && <FaCheckCircle size={11} className="filter-check" />}
                    </div>
                ))}
            </FilterGroup>

            {/* CONDITION */}
            <FilterGroup title={t('products.condition', 'Condition')} icon={<FaHistory size={13} />} defaultOpen={false}>
                {['New', 'Very Good', 'Good', 'Normal', 'Bad', 'Very Bad'].map(c => (
                    <div
                        key={c}
                        className={`filter-option ${condition === c ? 'active' : ''}`}
                        onClick={() => handleFilterChange('condition', condition === c ? '' : c)}
                    >
                        <span>{c}</span>
                        {condition === c && <FaCheckCircle size={11} className="filter-check" />}
                    </div>
                ))}
            </FilterGroup>
        </div>
    );

    /* ── Render ───────────────────────────────────────────── */
    return (
        <div className="products-page">
            <Meta
                title={search ? `Results for "${search}"` : (categorySlug ? formatSlug(categorySlug) : 'All Products')}
                description={`Explore our collection of ${search ? `"${search}"` : categorySlug ? formatSlug(categorySlug) : 'items'}`}
            />

            <div className="products-layout">
                {/* ── Desktop Sidebar ── */}
                <aside className={`filter-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                    {/* Sidebar header */}
                    <div className="filter-sidebar-header">
                        <div className="filter-sidebar-title">
                            <div className="filter-sidebar-icon-wrap"><FaFilter size={12} className="text-primary" /></div>
                            <span>{t('products.filter', 'Filter')}</span>
                            {activeFiltersCount > 0 && (
                                <span className="filter-active-badge">{activeFiltersCount}</span>
                            )}
                        </div>
                        <button className="sidebar-collapse-btn" onClick={() => setSidebarOpen(false)} title="Close filters">
                            <FaTimes size={13} />
                        </button>
                    </div>

                    {/* Scrollable filter body */}
                    <div className="filter-sidebar-body">
                        {renderFilterPanel()}
                    </div>

                    {/* Reset footer */}
                    <div className="filter-sidebar-footer">
                        <button
                            className="reset-filters-btn"
                            onClick={clearAllFilters}
                            disabled={activeFiltersCount === 0}
                        >
                            <FaTimesCircle size={12} /> {t('products.reset_all', 'Reset All Filters')}
                        </button>
                    </div>
                </aside>

                {/* ── Main content ── */}
                <main className="products-main">
                    {/* ── Top bar ── */}
                    {ai_setup === 'required' && (
                        <div className="mx-3 mt-3">
                            <Alert variant="warning" className="border-0 shadow-sm d-flex align-items-center gap-3" style={{ borderRadius: '12px', backgroundColor: '#fff3cd', color: '#856404' }}>
                                <div style={{ backgroundColor: '#ffc107', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FaSlidersH size={14} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h6 className="mb-0 fw-bold">Visual Search Logic Setup Required</h6>
                                    <p className="mb-0 small opacity-75">Your API keys (Gemini/Hugging Face) are not yet configured. Showing all items instead.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const p = new URLSearchParams(searchParams.toString());
                                        p.delete('ai_setup');
                                        router.push(`/products?${p.toString()}`, { replace: true });
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#856404', opacity: 0.5, cursor: 'pointer' }}
                                >
                                    <FaTimes size={14} />
                                </button>
                            </Alert>
                        </div>
                    )}
                    <div className="products-topbar">
                        {/* Left: open sidebar OR mobile filter btn */}
                        <div className="topbar-left">
                            {!sidebarOpen && (
                                <button className="open-filters-btn d-none d-lg-flex" onClick={() => setSidebarOpen(true)}>
                                    <FaFilter size={12} className="text-primary" /> {t('products.filter', 'Filter')}
                                    {activeFiltersCount > 0 && <span className="filter-active-badge sm">{activeFiltersCount}</span>}
                                </button>
                            )}
                            {/* Mobile filter button */}
                            <button className="open-filters-btn d-flex d-lg-none" onClick={() => setShowMobileFilters(true)}>
                                <FaFilter size={13} /> {t('products.filters', 'Filters')}
                                {activeFiltersCount > 0 && <span className="filter-active-badge sm">{activeFiltersCount}</span>}
                            </button>
                        </div>

                        {/* Middle: breadcrumb & title */}
                        <div className="topbar-center">
                            <div className="products-breadcrumb">
                                <Link href="/" className="bc-link">Home</Link>
                                <span className="bc-sep">/</span>
                                {search ? (
                                    <span className="bc-current">Results for "{search}"</span>
                                ) : categorySlug ? (
                                    <>
                                        <Link href="/products" className="bc-link">All</Link>
                                        <span className="bc-sep">/</span>
                                        <span className="bc-current">{currentCategory?.name || formatSlug(categorySlug)}</span>
                                        {subcategorySlug && (
                                            <>
                                                <span className="bc-sep">/</span>
                                                <span className="bc-current">{currentSubcategory?.name || formatSlug(subcategorySlug)}</span>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <span className="bc-current">All Products</span>
                                )}
                            </div>
                        </div>

                        {/* Right: result count */}
                        <div className="topbar-right">
                            <span className="result-count">{totalCount} items</span>
                        </div>
                    </div>

                    {/* ── Page heading area ── */}
                    <div className="products-heading-area">
                        {/* Category image */}
                        {categorySlug && (currentSubcategory?.image || currentCategory?.image) && (
                            <div className="cat-img-box d-none d-md-flex">
                                <img
                                    src={getImageUrl(currentSubcategory?.image || currentCategory?.image)}
                                    alt={pageTitle}
                                    onError={e => e.target.parentElement.style.display = 'none'}
                                />
                            </div>
                        )}
                        <div>
                            <h1 className="products-page-title">{pageTitle}</h1>
                        </div>
                    </div>

                    {/* ── Active filter pills ── */}
                    {activeFiltersCount > 0 && (
                        <div className="active-filters-bar">
                            <span className="active-filters-label">ACTIVE:</span>
                            <div className="active-pills-list">
                                {search && <ActivePill label={`"${search}"`} onClear={() => handleFilterChange('search', '')} />}
                                {size && <ActivePill label={`Size: ${size}`} onClear={() => handleFilterChange('size', '')} />}
                                {brand && <ActivePill label={`Brand: ${brand}`} onClear={() => handleFilterChange('brand', '')} />}
                                {color && <ActivePill label={`Color: ${color}`} onClear={() => handleFilterChange('color', '')} />}
                                {condition && <ActivePill label={condition} onClear={() => handleFilterChange('condition', '')} />}
                                {(minPrice || maxPrice) && (
                                    <ActivePill
                                        label={
                                            minPrice && maxPrice 
                                                ? `${currentCurrency?.symbol || ''}${minPrice} – ${currentCurrency?.symbol || ''}${maxPrice}`
                                                : minPrice 
                                                    ? `${t('products.from', 'From')} ${currentCurrency?.symbol || ''}${minPrice}`
                                                    : `${t('products.up_to', 'Up to')} ${currentCurrency?.symbol || ''}${maxPrice}`
                                        }
                                        onClear={() => handleFilterChange('price', { min: '', max: '' })}
                                    />
                                )}
                                {sort && sort !== 'newest' && (
                                    <ActivePill label={`Sort: ${sort.replace('_', ' ')}`} onClear={() => handleFilterChange('sort', 'newest')} />
                                )}
                                <button className="clear-all-btn" onClick={clearAllFilters}>Clear All</button>
                            </div>
                        </div>
                    )}

                    {/* ── Grid ── */}
                    <div className="products-grid-area">
                        {loading && items.length === 0 ? (
                            <div className="vinted-product-grid">
                                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : items.length > 0 ? (
                            <>
                                <div className={`vinted-product-grid ${sidebarOpen ? 'sidebar-open' : ''}`}>
                                    {items.map((item, idx) => (
                                        <div
                                            key={item._id}
                                            ref={idx === items.length - 1 && paginationMode === 'scroll' ? lastItemRef : null}
                                            className="product-grid-item fade-in"
                                        >
                                            <ItemCard item={item} />
                                        </div>
                                    ))}
                                </div>

                                {/* Scroll loader */}
                                {loading && paginationMode === 'scroll' && (
                                    <div className="scroll-loader">
                                        <div className="scroll-dot" /><div className="scroll-dot" /><div className="scroll-dot" />
                                    </div>
                                )}

                                {/* Numbered pagination */}
                                {paginationMode === 'number' && totalPages > 1 && (
                                    <Pagination
                                        currentPage={page}
                                        totalPages={totalPages}
                                        onPageChange={setPage}
                                    />
                                )}
                            </>
                        ) : !loading && (
                            <div className="products-empty">
                                <div className="products-empty-icon"><FaSearch size={28} /></div>
                                <h3>No Items Found</h3>
                                <p>Try adjusting your filters or search for something else.</p>
                                <button className="reset-filters-btn-lg" onClick={clearAllFilters}>Reset All Filters</button>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* ══ Mobile Filter Offcanvas ══ */}
            <Offcanvas
                show={showMobileFilters}
                onHide={() => setShowMobileFilters(false)}
                placement="start"
                className="filter-offcanvas"
            >
                {/* Offcanvas header */}
                <div className="filter-offcanvas-header">
                    <div className="filter-offcanvas-title">
                        <div className="filter-sidebar-icon-wrap"><FaSlidersH size={13} /></div>
                        <span>{t('products.filters_and_sort', 'Filters & Sort')}</span>
                        {activeFiltersCount > 0 && (
                            <span className="filter-active-badge">{activeFiltersCount}</span>
                        )}
                    </div>
                    <button className="oc-close-btn" onClick={() => setShowMobileFilters(false)}>
                        <FaTimes size={15} />
                    </button>
                </div>

                {/* Offcanvas scrollable body */}
                <div className="filter-offcanvas-body">
                    {renderFilterPanel(true)}
                </div>

                {/* Footer actions */}
                <div className="filter-offcanvas-footer">
                    <button
                        className="oc-reset-btn"
                        onClick={() => { clearAllFilters(); setShowMobileFilters(false); }}
                        disabled={activeFiltersCount === 0}
                    >
                        {t('products.reset', 'Reset')}
                    </button>
                    <button className="oc-apply-btn" onClick={() => setShowMobileFilters(false)}>
                        Show {totalCount > 0 ? `${totalCount} ` : ''}Results
                    </button>
                </div>
            </Offcanvas>
        </div>
    );
};

export default ProductsContent;
