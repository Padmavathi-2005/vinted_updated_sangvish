import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaShoppingCart, FaBars, FaTimes, FaChevronRight, FaChevronLeft, FaPlus, FaHeart, FaCoins, FaCheck, FaGlobe, FaUser, FaExchangeAlt, FaSignOutAlt, FaThLarge, FaCamera, FaRegHeart, FaRegBell, FaListAlt } from 'react-icons/fa';
import { FiShoppingCart, FiGlobe, FiChevronDown } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import '../styles/Header.css';
import '../styles/MegaMenu.css'; // New styles
import AuthContext from '../context/AuthContext';
import WishlistContext from '../context/WishlistContext';
import CurrencyContext from '../context/CurrencyContext';
import LanguageContext from '../context/LanguageContext';
import CartContext from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { getImageUrl, safeString } from '../utils/constants';
import NotificationContext from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import Popup, { usePopup } from './common/Popup';

const Header = () => {
    const { user, logout, mode, toggleMode } = useContext(AuthContext);
    const { wishlist } = useContext(WishlistContext);
    const { currencies, currentCurrency, setCurrency } = useContext(CurrencyContext);
    const { languages, currentLanguage, setLanguage } = useContext(LanguageContext);
    const { unreadCount, notifications: notifState, markAsRead } = useContext(NotificationContext);
    const { cartCount } = useContext(CartContext);
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { popup, showPopup, closePopup } = usePopup();
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const searchRef = useRef(null);
    const fileInputRef = useRef(null);


    // User Dropdown State
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('language'); // 'language' or 'currency'
    const [languageSearchTerm, setLanguageSearchTerm] = useState('');
    const [currencySearchTerm, setCurrencySearchTerm] = useState('');
    const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
    const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
    const [aiMessages, setAiMessages] = useState([]);

    // Initialize AI message with dynamic name once settings are loaded
    useEffect(() => {
        const name = safeString(settings.site_name, 'Resale');
        setAiMessages([
            { id: 1, text: `Hello! I'm your ${name} AI. How can I help you find the perfect item today?`, isAi: true }
        ]);
    }, [settings.site_name]);

    const [aiInput, setAiInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [isAiHovered, setIsAiHovered] = useState(false);
    const [hasSentFirstMsg, setHasSentFirstMsg] = useState(false);
    const [isAiBtnVisible, setIsAiBtnVisible] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [hoveredIcon, setHoveredIcon] = useState(null); // 'heart', 'bell', 'cart'
    const aiBoxRef = useRef(null);
    const chatMessagesEndRef = useRef(null);

    const scrollToBottom = () => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isAIDrawerOpen) {
            scrollToBottom();
        }
    }, [aiMessages, isAIDrawerOpen]);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    // Data State
    const [categories, setCategories] = useState([
        { _id: '1', slug: 'women', name: 'Women', icon: '👗', subcategories: [] },
        { _id: '2', slug: 'men', name: 'Men', icon: '👔', subcategories: [] },
        { _id: '3', slug: 'kids', name: 'Kids', icon: '👶', subcategories: [] }
    ]);
    const [loading, setLoading] = useState(true);

    // Desktop Menu State
    const [showCategoryBar, setShowCategoryBar] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [activeSubcategory, setActiveSubcategory] = useState(null);

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mobileLevel, setMobileLevel] = useState(0); // 0: Main, 1: Sub, 2: Items
    const [mobileSelectedCategory, setMobileSelectedCategory] = useState(null);
    const [mobileSelectedSubcategory, setMobileSelectedSubcategory] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);
    const [showSearchHistory, setShowSearchHistory] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Fetch Categories
    useEffect(() => {
        const fetchData = async () => {
            try {
                const categoriesRes = await axios.get('/api/categories/full').catch(() => ({ data: [] }));

                if (Array.isArray(categoriesRes.data) && categoriesRes.data.length > 0) {
                    setCategories(categoriesRes.data);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const [recommendedSuggestions, setRecommendedSuggestions] = useState([]);

    // Logic for Random Recommended Searches
    useEffect(() => {
        if (!loading && categories && categories.length > 0) {
            // Flatten all subcategories with their parent category slugs
            const allSubObjects = categories.reduce((acc, cat) => {
                const subs = cat.subcategories?.map(sub => ({
                    name: sub.name,
                    catSlug: cat.slug,
                    subSlug: sub.slug
                })) || [];
                return [...acc, ...subs];
            }, []);

            // Pick 5 unique random ones
            if (allSubObjects.length > 0) {
                const shuffled = allSubObjects.sort(() => 0.5 - Math.random());
                setRecommendedSuggestions(shuffled.slice(0, 5));
            }
        }
    }, [loading, categories]);

    const handleCategoryEnter = (category) => {
        if (!category) return;
        setActiveCategory(category);
        // Default to first subcategory if available
        if (category.subcategories && category.subcategories.length > 0) {
            setActiveSubcategory(category.subcategories[0]);
        } else {
            setActiveSubcategory(null);
        }
    };

    const handleCategoryBarLeave = () => {
        setShowCategoryBar(false);
        setActiveCategory(null);
        setActiveSubcategory(null);
    };

    // Mobile: Navigation Handlers
    const openMobileMenu = () => setIsMobileMenuOpen(true);
    const handleImageError = (e) => {
        e.target.style.display = 'none';
        // Removed fallback to not_found.png to show the background initial instead
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
        setMobileLevel(0);
        setMobileSelectedCategory(null);
    };

    const handleMobileCategoryClick = (category) => {
        setMobileSelectedCategory(category);
        setMobileLevel(1);
    };

    const handleMobileSubcategoryClick = (subcategory) => {
        setMobileSelectedSubcategory(subcategory);
        setMobileLevel(2);
    };

    const handleMobileBack = () => {
        if (mobileLevel === 2) {
            setMobileLevel(1);
            setMobileSelectedSubcategory(null);
        } else if (mobileLevel === 1) {
            setMobileLevel(0);
            setMobileSelectedCategory(null);
        }
    };

    // Fetch Search History when logged in
    useEffect(() => {
        if (user) {
            const fetchHistory = async () => {
                try {
                    const res = await axios.get('/api/search/history');
                    setSearchHistory(res.data);
                } catch (error) {
                    console.error('Failed to fetch search history:', error);
                }
            };
            fetchHistory();
        }
    }, [user]);

    // Close search history when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchHistory(false);
            }
            // AI Box persistent closure logic
            if (isAIDrawerOpen && aiBoxRef.current && !aiBoxRef.current.contains(event.target)) {
                setIsAIDrawerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isAIDrawerOpen]);

    // AI Scroll Visibility logic removed as per user request to always show

    const closeAllDropdowns = () => {
        setIsUserDropdownOpen(false);
        setIsSettingsDropdownOpen(false);
        setLanguageSearchTerm('');
        setCurrencySearchTerm('');
        setIsNotifDropdownOpen(false);
        setIsAIDrawerOpen(false);
        setShowSearchHistory(false);
        setShowCategoryBar(false);
        setActiveCategory(null);
        setActiveSubcategory(null);
    };

    const saveSearch = async (query) => {
        if (!user || !query.trim()) return;
        try {
            await axios.post('/api/search/history', { query: query.trim() });
            const res = await axios.get('/api/search/history');
            setSearchHistory(res.data);
        } catch (error) {
            console.error('Failed to save search:', error);
        }
    };

    const handleSearchSubmit = (query) => {
        const term = query.trim();
        if (term) {
            saveSearch(term);
            navigate(`/products?search=${encodeURIComponent(term)}`);
            closeAllDropdowns();
            setSearchTerm(term);
            setIsMobileSearchOpen(false); // Close mobile search overlay on submit
        }
    };

    const [isImageSearching, setIsImageSearching] = useState(false);
    const [searchingImage, setSearchingImage] = useState(null);
    const [imageSearchMessage, setImageSearchMessage] = useState(null);

    const handleImageSearchClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImageChange = async (e) => {
        if (isImageSearching) return;
        const file = e.target.files[0];
        if (!file) return;

        // Clean up previous search URL
        if (searchingImage) URL.revokeObjectURL(searchingImage);

        const previewUrl = URL.createObjectURL(file);
        setSearchingImage(previewUrl);

        try {
            setIsImageSearching(true);
            const formData = new FormData();
            formData.append('image', file);

            const res = await axios.post('/api/search/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.query) {
                // Navigate to products page with the AI generated query
                navigate(`/products?search=${encodeURIComponent(res.data.query)}`);
                setSearchTerm(res.data.query);
            }
        } catch (error) {
            console.error("Image search failed:", error);
            let errMsg = error.response?.data?.message || "Visual search failed. Please try again with a clearer image.";

            // Specific UI logic for common service errors
            if (error.response?.status === 503) {
                // If AI is not configured, redirect to all products with a special notice
                navigate('/products?ai_setup=required');
                setIsImageSearching(false);
                setSearchingImage(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            } else if (error.response?.status === 429) {
                showPopup({ type: 'warning', title: '⚡ AI Busy', message: 'Our AI service is at maximum capacity right now. Please wait a minute and try again!', autoClose: true, autoCloseDuration: 2500 });
            } else if (!error.response) {
                showPopup({ type: 'error', title: '🌐 Connection Error', message: 'Could not reach the server. Please check your internet connection or backend status.', autoClose: true, autoCloseDuration: 2500 });
            } else {
                showPopup({ type: 'error', title: '🔍 Search Failed', message: errMsg, autoClose: true, autoCloseDuration: 3000 });
            }
        } finally {
            setIsImageSearching(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            // Delay clear to allow user to see it briefly
            setTimeout(() => setSearchingImage(null), 3000);
        }
    };

    const handleAiSendMessage = async () => {
        if (!aiInput.trim()) return;

        const currentInput = aiInput.trim();
        const userMsg = { id: Date.now(), text: currentInput, isAi: false };
        setAiMessages(prev => [...prev, userMsg]);
        setAiInput('');
        setIsAiTyping(true);
        setHasSentFirstMsg(true);

        try {
            // Keep only meaningful history (text and isAi)
            const chatHistory = aiMessages.map(m => ({ text: m.text, isAi: m.isAi }));

            const res = await axios.post('/api/ai/chat', {
                message: currentInput,
                history: chatHistory
            });

            const aiResponse = {
                id: Date.now() + 1,
                text: res.data.text || "I'm sorry, I couldn't generate a response. Please try again.",
                isAi: true
            };
            setAiMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error("AI Error:", error);

            let errorMessage = error.response?.data?.message || "I'm having a little trouble connecting to the server. Please check if the backend is running.";

            // Handle Quota Exceeded (429) specifically
            if (error.response?.status === 429 || errorMessage.toLowerCase().includes('quota exceeded') || errorMessage.toLowerCase().includes('429')) {
                errorMessage = "Our AI system (Gemini & Hugging Face) is experiencing a high volume right now. I'll be back in just a minute! Please try your message again soon.";
            }

            const errorMsg = {
                id: Date.now() + 1,
                text: errorMessage,
                isAi: true,
                isError: true
            };
            setAiMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleLogout = () => {
        logout();
        closeMobileMenu();
        navigate('/');
    };

    return (
        <header className="header-container" onMouseLeave={handleCategoryBarLeave}>
            <div className="header-content container-fluid">
                <div className="logo-section">
                    <Link to="/" className="site-logo" style={{ color: settings.primary_color, cursor: 'pointer', userSelect: 'none' }} onClick={handleCategoryBarLeave}>
                        {settings.site_logo ? (
                            <img
                                src={getImageUrl(settings.site_logo)}
                                alt={safeString(settings.site_name, 'Resale')}
                                style={{ height: '40px', objectFit: 'contain', cursor: 'pointer', userSelect: 'none' }}
                                onError={handleImageError}
                            />
                        ) : (
                            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', margin: 0, cursor: 'pointer', userSelect: 'none' }}>{safeString(settings.site_name, 'Resale')}</h1>
                        )}
                    </Link>
                </div>

                {/* Mobile Icons (Visible on mobile & tablet < 1200px) */}
                <div className="mobile-actions d-xl-none d-flex align-items-center gap-3 ms-auto">
                    <button
                        className="mobile-search-toggle"
                        onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        style={{ background: 'none', border: 'none', color: '#495057', padding: '8px' }}
                    >
                        {isMobileSearchOpen ? <FaTimes size={22} /> : <FaSearch size={22} />}
                    </button>
                    <button onClick={openMobileMenu} className="hamburger-btn" style={{ background: 'none', border: 'none', color: '#495057', padding: '8px' }}>
                        <FaBars size={24} />
                    </button>
                </div>

                {/* Middle: Desktop Navigation (Primary) - Hidden on < 1200px */}
                <div className="middle-section d-none d-xl-flex">
                    <nav className="desktop-nav">
                        <div
                            className="nav-item categories-toggle"
                            onMouseEnter={() => {
                                closeAllDropdowns();
                                setShowCategoryBar(true);
                                // Default to first category (Women) when opened
                                if (categories && categories.length > 0) {
                                    handleCategoryEnter(categories[0]);
                                }
                            }}
                            style={{
                                cursor: 'pointer',
                                fontWeight: '600',
                                padding: '10px 15px',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'color 0.25s ease' // Added transition for smooth hover color change
                            }}
                        >
                            <FaThLarge style={{ fontSize: '1.2rem', opacity: 0.8 }} />
                            <span style={{ fontSize: '1.05rem' }}>{t('header.categories')}</span>
                        </div>
                    </nav>
                </div>

                {/* Search Bar - Expanded (Desktop) - Hidden on < 1200px */}
                <div className="search-bar-container d-none d-xl-flex" style={{ flex: 1, margin: '0 30px', maxWidth: '800px' }} ref={searchRef}>
                    <div
                        className="search-bar"
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '700px',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        <div
                            className="search-input-wrapper"
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                background: '#ffffff',
                                borderRadius: (showSearchHistory && (searchHistory.length > 0 || categories.length > 0)) ? '24px 24px 0 0' : '24px',
                                border: `2px solid ${settings.primary_color}`,
                                boxShadow: `0 4px 12px ${settings.primary_color}20`,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: 101,
                                height: '46px',
                                width: '100%',
                                overflow: 'visible'
                            }}
                        >
                            <div style={{ paddingLeft: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaSearch className="search-icon-svg" style={{ color: settings.primary_color, fontSize: '0.95rem', opacity: 1, transition: 'color 0.3s' }} />
                            </div>
                            <input
                                type="text"
                                placeholder={t('header.search_placeholder')}
                                style={{
                                    flex: 1,
                                    padding: '0 16px',
                                    paddingRight: searchTerm.trim() ? '140px' : '50px', // Wider padding when search button is visible
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    width: '100%',
                                    color: '#495057',
                                    height: '100%',
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => {
                                    closeAllDropdowns();
                                    setShowSearchHistory(true);
                                    setIsSearchFocused(true);
                                }}
                                onBlur={() => setIsSearchFocused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearchSubmit(searchTerm);
                                    }
                                }}
                            />

                            {/* Image Search Input (Hidden) */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleImageChange}
                            />

                            <div style={{
                                position: 'absolute',
                                right: searchTerm.trim() ? '105px' : '15px', // Shift left when search button appears
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.3s ease'
                            }}>
                                <button
                                    onClick={handleImageSearchClick}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: isImageSearching ? settings.primary_color : '#adb5bd',
                                        fontSize: '1.1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '5px'
                                    }}
                                    disabled={isImageSearching}
                                    title="Search by image"
                                >
                                    {isImageSearching ? (
                                        <div className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem' }} />
                                    ) : (
                                        <FaCamera />
                                    )}
                                </button>
                            </div>

                            {searchingImage && (
                                <div style={{
                                    position: 'absolute',
                                    right: searchTerm.trim() ? '145px' : '55px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: `2px solid ${settings.primary_color}`,
                                    zIndex: 102,
                                    animation: 'fadeIn 0.3s ease'
                                }}>
                                    <img src={searchingImage} alt="Search" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {isImageSearching && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div className="spinner-border spinner-border-sm" style={{ width: '0.8rem', height: '0.8rem', color: settings.primary_color }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {searchTerm.trim() && (
                                <button
                                    onClick={() => handleSearchSubmit(searchTerm)}
                                    style={{
                                        position: 'absolute',
                                        right: '6px',
                                        backgroundColor: settings.primary_color,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '20px',
                                        padding: '0 24px',
                                        height: '34px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        animation: 'fadeIn 0.2s',
                                    }}
                                >
                                    {t('header.search_button')}
                                </button>
                            )}
                        </div>

                        {/* Search History / Suggestions Dropdown */}
                        {showSearchHistory && (
                            <div style={{
                                position: 'absolute',
                                top: '45px',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #e9ecef',
                                borderTop: 'none',
                                borderRadius: '0 0 24px 24px',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                                zIndex: 100,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    padding: '16px 16px 8px 16px',
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    color: '#adb5bd',
                                    letterSpacing: '0.05em',
                                }}>
                                    {searchHistory.length > 0 ? 'RECENT SEARCHES' : 'TRENDING CATEGORIES'}
                                </div>
                                <div style={{
                                    padding: '0 16px 16px 16px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    {(searchHistory.length > 0
                                        ? searchHistory.slice(0, 10) // Show up to 10 recent searches
                                        : categories.reduce((acc, c) => acc.concat(c.subcategories || []), []).slice(0, 8)
                                    ).map((item, idx) => {
                                        const query = (typeof item === 'string') ? item : (item.name || item.query);
                                        const id = item._id || `cat-${idx}`;
                                        return (
                                            <div
                                                key={id}
                                                onClick={() => handleSearchSubmit(query)}
                                                className="search-trending-tag"
                                            >
                                                {query}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Recommended Searches Section */}
                                <div style={{
                                    padding: '8px 16px 8px 16px',
                                    borderTop: '1px solid #f1f3f5',
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    color: '#adb5bd',
                                    letterSpacing: '0.05em',
                                }}>
                                    RECOMMENDED FOR YOU
                                </div>
                                <div style={{
                                    padding: '0 16px 16px 16px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    {recommendedSuggestions.length > 0 ? (
                                        recommendedSuggestions.map((item, idx) => (
                                            <div
                                                key={`rec-${idx}`}
                                                onClick={() => {
                                                    navigate(`/products?category=${item.catSlug}&subcategory=${item.subSlug}`);
                                                    closeAllDropdowns();
                                                    setSearchTerm(item.name);
                                                }}
                                                className="search-trending-tag"
                                                style={{
                                                    borderColor: `${settings.primary_color}40`,
                                                    color: settings.primary_color
                                                }}
                                            >
                                                <HiSparkles style={{ fontSize: '0.75rem', marginRight: '4px', opacity: 0.8 }} />
                                                {item.name}
                                            </div>
                                        ))
                                    ) : (
                                        // Fallback if no categories yet
                                        ['Vintage Jeans', 'Leather Jackets', 'White Sneakers', 'Summer Hats', 'Designer Bags'].map((name, idx) => (
                                            <div
                                                key={`fback-${idx}`}
                                                onClick={() => handleSearchSubmit(name)}
                                                className="search-trending-tag"
                                                style={{ borderColor: `${settings.primary_color}30`, color: '#64748b' }}
                                            >
                                                {name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Right Section: Actions - Hidden on < 1200px */}
                <div className="right-section d-none d-xl-flex">
                    <Link to="/sell" className="sell-btn" style={{ backgroundColor: settings.primary_color }}>
                        <FaPlus /> {t('header.sell_button')}
                    </Link>
                    <div className="icon-group">
                        {/* Combined Language & Currency Selector (Visible to everyone) */}
                        <div
                            className="icon-wrapper settings-wrapper"
                            onMouseEnter={() => {
                                closeAllDropdowns();
                                setIsSettingsDropdownOpen(true);
                            }}
                            onMouseLeave={() => { setIsSettingsDropdownOpen(false); setLanguageSearchTerm(''); setCurrencySearchTerm(''); }}
                            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#f8f9fa', border: '1px solid #e9ecef', transition: 'all 0.3s ease' }}
                            title={t('header.settings')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '700', color: '#495057' }}>
                                <FiGlobe style={{ color: settings.primary_color }} />
                                <span>{currentLanguage?.code?.toUpperCase() || 'EN'}</span>
                                <span style={{ color: '#cbd5e1', fontWeight: 'normal' }}>/</span>
                                <span>{currentCurrency?.symbol || '$'}</span>
                                <FiChevronDown style={{ fontSize: '0.9rem', opacity: 0.6, marginLeft: '2px' }} />
                            </div>

                            {isSettingsDropdownOpen && (
                                <div className="user-dropdown-wrapper" style={{
                                    position: 'absolute', top: '100%', right: '0',
                                    paddingTop: '15px', zIndex: 1100, width: '280px',
                                    animation: 'fadeIn 0.2s ease',
                                }}>
                                    <div className="user-dropdown-box" style={{
                                        background: 'white', border: '1px solid #e9ecef',
                                        borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                        padding: '0', textAlign: 'left', position: 'relative',
                                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                                    }}>
                                        <div style={{ position: "absolute", top: "-6px", right: "20px", width: "12px", height: "12px", background: 'white', transform: "rotate(45deg)", borderLeft: "1px solid #e9ecef", borderTop: "1px solid #e9ecef" }} />

                                        {/* Tab Headers */}
                                        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', padding: '4px' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSettingsTab('language'); }}
                                                style={{
                                                    flex: 1, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700',
                                                    background: settingsTab === 'language' ? 'white' : 'transparent',
                                                    color: settingsTab === 'language' ? settings.primary_color : '#64748b',
                                                    boxShadow: settingsTab === 'language' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.02em'
                                                }}
                                            >
                                                {t('header.language')}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSettingsTab('currency'); }}
                                                style={{
                                                    flex: 1, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700',
                                                    background: settingsTab === 'currency' ? 'white' : 'transparent',
                                                    color: settingsTab === 'currency' ? settings.primary_color : '#64748b',
                                                    boxShadow: settingsTab === 'currency' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.02em'
                                                }}
                                            >
                                                {t('header.currency')}
                                            </button>
                                        </div>

                                        <div style={{ padding: '16px' }}>
                                            {settingsTab === 'language' ? (
                                                /* Language Section */
                                                <div>
                                                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                                                        <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: settings.primary_color, fontSize: '0.75rem' }} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('header.search_languages')}
                                                            value={languageSearchTerm}
                                                            onChange={(e) => setLanguageSearchTerm(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                width: '100%', padding: '7px 10px 7px 30px', border: `1px solid ${settings.primary_color}`, borderRadius: '8px', fontSize: '0.8rem', outline: 'none', background: '#ffffff', boxShadow: `0 2px 8px ${settings.primary_color}15`
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }} className="custom-scrollbar">
                                                        {languages && languages.filter(l => l.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) || l.native_name.toLowerCase().includes(languageSearchTerm.toLowerCase())).map(language => (
                                                            <button
                                                                key={language._id}
                                                                onClick={() => { setLanguage(language); setLanguageSearchTerm(''); }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', background: currentLanguage?._id === language._id ? `${settings.primary_color}10` : 'transparent', cursor: 'pointer', transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '0.8rem', color: currentLanguage?._id === language._id ? settings.primary_color : '#475569', fontWeight: currentLanguage?._id === language._id ? '700' : '500' }}>{language.native_name}</span>
                                                                {currentLanguage?._id === language._id && <FaCheck style={{ color: settings.primary_color, fontSize: '0.7rem' }} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Currency Section */
                                                <div>
                                                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                                                        <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: settings.primary_color, fontSize: '0.75rem' }} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('header.search_currencies')}
                                                            value={currencySearchTerm}
                                                            onChange={(e) => setCurrencySearchTerm(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                width: '100%', padding: '7px 10px 7px 30px', border: `1px solid ${settings.primary_color}`, borderRadius: '8px', fontSize: '0.8rem', outline: 'none', background: '#ffffff', boxShadow: `0 2px 8px ${settings.primary_color}15`
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }} className="custom-scrollbar">
                                                        {currencies && currencies.filter(c => c.name.toLowerCase().includes(currencySearchTerm.toLowerCase()) || c.code.toLowerCase().includes(currencySearchTerm.toLowerCase())).map(currency => (
                                                            <button
                                                                key={currency._id}
                                                                onClick={() => { setCurrency(currency); setCurrencySearchTerm(''); }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', background: currentCurrency?._id === currency._id ? `${settings.primary_color}10` : 'transparent', cursor: 'pointer', transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '0.8rem', color: currentCurrency?._id === currency._id ? settings.primary_color : '#475569', fontWeight: currentCurrency?._id === currency._id ? '700' : '500' }}>{currency.code} - {currency.name}</span>
                                                                {currentCurrency?._id === currency._id && <FaCheck style={{ color: settings.primary_color, fontSize: '0.7rem' }} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {user ? (
                            <>
                                {/* Logged-in icons: Favorites, Notifications, Cart */}
                                <Link
                                    to="/profile?tab=favorites"
                                    className="icon-wrapper heart-link"
                                    title={t('header.my_favorites')}
                                    onMouseEnter={() => setHoveredIcon('heart')}
                                    onMouseLeave={() => setHoveredIcon(null)}
                                    style={{ color: hoveredIcon === 'heart' ? '#ef4444' : '#495057' }}
                                >
                                    {hoveredIcon === 'heart' ? <FaHeart /> : <FaRegHeart />}
                                </Link>

                                {/* Notification Bell (logged-in only) */}
                                <div
                                    style={{ position: 'relative' }}
                                    onMouseEnter={() => {
                                        closeAllDropdowns();
                                        setIsNotifDropdownOpen(true);
                                        setHoveredIcon('bell');
                                    }}
                                    onMouseLeave={() => {
                                        setIsNotifDropdownOpen(false);
                                        setHoveredIcon(null);
                                    }}
                                >
                                    <div
                                        className="icon-wrapper"
                                        title={t('header.notifications')}
                                        style={{ position: 'relative', cursor: 'pointer', color: hoveredIcon === 'bell' || isNotifDropdownOpen ? settings.primary_color : '#495057' }}
                                        onClick={() => navigate('/profile?tab=notifications')}
                                    >
                                        {hoveredIcon === 'bell' || isNotifDropdownOpen ? <FaBell /> : <FaRegBell />}
                                        {unreadCount > 0 && (
                                            <span style={{
                                                position: 'absolute', top: '-4px', right: '-4px',
                                                background: '#ef4444', color: 'white', fontSize: '0.65rem',
                                                fontWeight: 'bold', width: '18px', height: '18px',
                                                borderRadius: '50%', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', border: '2px solid white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {isNotifDropdownOpen && (
                                        <div style={{
                                            position: 'absolute', top: '100%', right: '-60px',
                                            paddingTop: '16px', zIndex: 1100, width: '340px',
                                            animation: 'fadeIn 0.2s ease',
                                        }}>
                                            <div style={{
                                                background: 'white', borderRadius: '14px',
                                                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                                border: '1px solid #e9ecef', overflow: 'hidden',
                                                position: 'relative'
                                            }}>
                                                {/* Caret */}
                                                <div style={{ position: "absolute", top: "-6px", right: "72px", width: "12px", height: "12px", background: "white", transform: "rotate(45deg)", borderLeft: "1px solid #e9ecef", borderTop: "1px solid #e9ecef" }} />
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', padding: '14px 16px 10px',
                                                    borderBottom: '1px solid #f1f5f9'
                                                }}>
                                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                                                        Notifications
                                                    </span>
                                                    {unreadCount > 0 && (
                                                        <span style={{
                                                            background: '#eff6ff', color: '#3b82f6',
                                                            fontSize: '0.72rem', fontWeight: '700',
                                                            padding: '2px 8px', borderRadius: '20px'
                                                        }}>{unreadCount} new</span>
                                                    )}
                                                </div>

                                                {/* Last 5 notifications */}
                                                {notifState.length === 0 ? (
                                                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        No notifications yet
                                                    </div>
                                                ) : (
                                                    notifState.slice(0, 5).map(n => {
                                                        const iconColors = {
                                                            success: '#22c55e', error: '#ef4444',
                                                            request: '#3b82f6', message: '#8b5cf6',
                                                            order: '#f97316', info: '#64748b'
                                                        };
                                                        const color = iconColors[n.type] || '#64748b';
                                                        const relTime = (() => {
                                                            const diff = Math.floor((Date.now() - new Date(n.created_at)) / 60000);
                                                            if (diff < 1) return 'Just now';
                                                            if (diff < 60) return `${diff}m ago`;
                                                            const h = Math.floor(diff / 60);
                                                            if (h < 24) return `${h}h ago`;
                                                            return `${Math.floor(h / 24)}d ago`;
                                                        })();
                                                        return (
                                                            <div
                                                                key={n._id}
                                                                onClick={() => {
                                                                    if (!n.is_read) markAsRead(n._id);
                                                                    if (n.link) navigate(n.link);
                                                                    else navigate('/profile?tab=notifications');
                                                                    setIsNotifDropdownOpen(false);
                                                                }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                                    padding: '12px 16px',
                                                                    borderBottom: '1px solid #f8fafc',
                                                                    cursor: 'pointer',
                                                                    background: !n.is_read ? '#fafeff' : 'white',
                                                                    transition: 'background 0.15s'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                                onMouseLeave={e => e.currentTarget.style.background = !n.is_read ? '#fafeff' : 'white'}
                                                            >
                                                                <div style={{
                                                                    width: '34px', height: '34px', borderRadius: '50%',
                                                                    background: `${color}18`, color,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '0.85rem', flexShrink: 0
                                                                }}>
                                                                    <FaBell />
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{
                                                                        fontSize: '0.82rem', fontWeight: !n.is_read ? '700' : '500',
                                                                        color: '#1e293b', marginBottom: '2px',
                                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                                    }}>{n.title}</div>
                                                                    <div style={{
                                                                        fontSize: '0.76rem', color: '#64748b',
                                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                        marginBottom: '2px'
                                                                    }}>{safeString(n.message)}</div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{relTime}</div>
                                                                </div>
                                                                {!n.is_read && (
                                                                    <div style={{
                                                                        width: '8px', height: '8px', background: '#3b82f6',
                                                                        borderRadius: '50%', flexShrink: 0, marginTop: '4px'
                                                                    }} />
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}

                                                <div
                                                    onClick={() => { navigate('/profile?tab=notifications'); setIsNotifDropdownOpen(false); }}
                                                    style={{
                                                        textAlign: 'center', padding: '12px',
                                                        fontSize: '0.82rem', fontWeight: '600',
                                                        color: settings.primary_color, cursor: 'pointer',
                                                        borderTop: '1px solid #f1f5f9'
                                                    }}
                                                >
                                                    View all notifications →
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Cart (logged-in only) */}
                                <Link
                                    to="/cart"
                                    className="icon-wrapper"
                                    title="Cart"
                                    style={{ position: 'relative', color: hoveredIcon === 'cart' ? settings.primary_color : '#495057' }}
                                    onMouseEnter={() => setHoveredIcon('cart')}
                                    onMouseLeave={() => setHoveredIcon(null)}
                                >
                                    {hoveredIcon === 'cart' ? <FaShoppingCart /> : <FiShoppingCart />}
                                    {cartCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-7px',
                                            right: '-7px',
                                            background: settings.primary_color,
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: '17px',
                                            height: '17px',
                                            fontSize: '0.62rem',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 1,
                                            border: '1.5px solid white'
                                        }}>{cartCount > 9 ? '9+' : cartCount}</span>
                                    )}
                                </Link>

                                {/* User Profile Dropdown */}
                                <div
                                    className="icon-wrapper user-wrapper"
                                    onMouseEnter={() => {
                                        closeAllDropdowns();
                                        setIsUserDropdownOpen(true);
                                    }}
                                    onMouseLeave={() => setIsUserDropdownOpen(false)}
                                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                >
                                    <div className="user-avatar" style={{
                                        background: `${settings.primary_color}15`,
                                        color: settings.primary_color,
                                        border: `2px solid ${settings.primary_color}30`,
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                    }}>
                                        <span style={{ fontSize: '1rem', fontWeight: '800' }}>
                                            {(user.username || user.name || user.email || 'U').charAt(0).toUpperCase()}
                                        </span>
                                        {user.profile_image && (
                                            <img
                                                src={getImageUrl(user.profile_image)}
                                                alt="Profile"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                onError={handleImageError}
                                            />
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#495057' }}>{safeString(user.username || user.name) || user.email?.split('@')[0]}</span>

                                    {isUserDropdownOpen && (
                                        <div className="user-dropdown-wrapper" style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            paddingTop: '20px', // Bridge the gap between avatar and dropdown
                                            zIndex: 1100,
                                            width: '240px',
                                            animation: 'fadeIn 0.2s ease',
                                        }}>
                                            <div className="user-dropdown-box" style={{
                                                background: 'white',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                padding: '8px 0',
                                                textAlign: 'left',
                                                position: 'relative' // Ensure z-index works if needed
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    right: '16px',
                                                    width: '12px',
                                                    height: '12px',
                                                    background: 'white',
                                                    transform: 'rotate(45deg)',
                                                    borderLeft: '1px solid #e9ecef',
                                                    borderTop: '1px solid #e9ecef'
                                                }}></div>

                                                <div style={{ padding: '8px 16px', fontWeight: 'bold', borderBottom: '1px solid #f1f3f5', color: '#868e96', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                                    {mode === 'buyer' ? t('user_menu.buyer_mode', 'Buyer Mode') : t('user_menu.seller_mode', 'Seller Mode')}
                                                </div>

                                                <Link to={`/profile?tab=dashboard&mode=${mode}`} className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                    <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaUser style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                    {t('profile.dashboard', 'Dashboard')}
                                                </Link>
                                                <Link to={`/profile?tab=profile_settings&mode=${mode}`} className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                    <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaUser style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                    {t('user_menu.my_profile', 'My Profile')}
                                                </Link>

                                                {mode === 'buyer' ? (
                                                    <>
                                                        <Link to="/profile?tab=orders&mode=buyer" className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaShoppingCart style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                            {t('user_menu.my_orders', 'My Orders')}
                                                        </Link>
                                                        <Link to="/profile?tab=favorites&mode=buyer" className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaHeart style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                            {t('profile.favorites', 'Favorites')}
                                                        </Link>
                                                        <Link to="/profile?tab=messages&mode=buyer" className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaBell style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                            {t('user_menu.messages', 'Messages')}
                                                        </Link>
                                                        <div style={{ borderTop: '1px solid #f1f3f5', margin: '4px 0' }}></div>
                                                        <button
                                                            onClick={() => { toggleMode(); setIsUserDropdownOpen(false); }}
                                                            className="dropdown-item-custom"
                                                            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: settings.primary_color, display: 'flex', alignItems: 'center', gap: '12px' }}
                                                        >
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaExchangeAlt style={{ fontSize: '1rem' }} /></div>
                                                            <span style={{ fontWeight: '600' }}>{t('user_menu.switch_to_selling', 'Switch to Selling')}</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link to="/profile?tab=listings&mode=seller" className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaCheck style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                            {t('user_menu.manage_listings', 'Manage Listings')}
                                                        </Link>
                                                        <Link to="/profile?tab=payments&mode=seller" className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaCoins style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                            {t('user_menu.payments', 'Payments')}
                                                        </Link>
                                                        <Link to="/profile?tab=messages&mode=seller" className="dropdown-item-custom" style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setIsUserDropdownOpen(false)}>
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaBell style={{ color: '#adb5bd', fontSize: '1rem' }} /></div>
                                                            {t('user_menu.messages', 'Messages')}
                                                        </Link>
                                                        <div style={{ borderTop: '1px solid #f1f3f5', margin: '4px 0' }}></div>
                                                        <button
                                                            onClick={() => { toggleMode(); setIsUserDropdownOpen(false); }}
                                                            className="dropdown-item-custom"
                                                            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: settings.primary_color, display: 'flex', alignItems: 'center', gap: '12px' }}
                                                        >
                                                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaExchangeAlt style={{ fontSize: '1rem' }} /></div>
                                                            <span style={{ fontWeight: '600' }}>{t('user_menu.switch_to_buying', 'Switch to Buying')}</span>
                                                        </button>
                                                    </>
                                                )}

                                                <div style={{ borderTop: '1px solid #f1f3f5', margin: '4px 0' }}></div>
                                                <button onClick={handleLogout} className="dropdown-item-custom" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}><FaSignOutAlt style={{ color: '#ef4444', fontSize: '1rem' }} /></div>
                                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{t('user_menu.logout', 'Logout')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Logged-out links */
                            <div className="auth-split-button" style={{ border: 'none' }}>
                                <Link to="/login" className="auth-split-link">{t('header.login', 'Login')}</Link>
                                <span className="auth-split-divider">|</span>
                                <Link to="/register" className="auth-split-link">{t('header.signup', 'Sign Up')}</Link>
                            </div>
                        )}

                        {/* Mobile Toggle removed from here, moved to mobile-actions */}
                    </div>
                </div>
            </div>

            {/* Mobile Search Bar (Expanded below header) */}
            {isMobileSearchOpen && (
                <div className="mobile-search-expanded d-xl-none px-3 py-2 bg-white border-bottom shadow-sm text-center">
                    <div className="search-bar" style={{ position: 'relative', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                        <div className="search-input-wrapper" style={{
                            background: '#ffffff',
                            borderRadius: '25px',
                            border: `2px solid ${settings.primary_color}`,
                            boxShadow: `0 4px 12px ${settings.primary_color}20`,
                            height: '46px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            width: '100%'
                        }}>
                            <div style={{ paddingLeft: '18px' }}>
                                <FaSearch style={{ color: settings.primary_color, fontSize: '0.9rem' }} />
                            </div>
                            <input
                                type="text"
                                autoFocus
                                placeholder={t('header.search_placeholder')}
                                style={{ flex: 1, padding: '0 100px 0 16px', border: 'none', background: 'transparent', fontSize: '0.95rem', outline: 'none' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchTerm)}
                            />

                            {/* Visual Search in Mobile Bar */}
                            <div style={{ position: 'absolute', right: searchTerm.trim() ? '105px' : '15px', display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={handleImageSearchClick}
                                    style={{ background: 'transparent', border: 'none', color: isImageSearching ? settings.primary_color : '#adb5bd', fontSize: '1.1rem', cursor: 'pointer' }}
                                    disabled={isImageSearching}
                                >
                                    {isImageSearching ? <div className="spinner-border spinner-border-sm" /> : <FaCamera />}
                                </button>
                                {imageSearchMessage && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-45px',
                                        right: '0',
                                        backgroundColor: '#334155',
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 1000,
                                        animation: 'slideUp 0.3s ease'
                                    }}>
                                        <div style={{ position: 'absolute', top: '-6px', right: '12px', width: '12px', height: '12px', backgroundColor: '#334155', transform: 'rotate(45deg)' }} />
                                        {imageSearchMessage}
                                    </div>
                                )}
                            </div>

                            {searchingImage && (
                                <div style={{ position: 'absolute', right: searchTerm.trim() ? '145px' : '55px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${settings.primary_color}` }}>
                                    <img src={searchingImage} alt="Search" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}

                            {searchTerm.trim() && (
                                <button
                                    onClick={() => handleSearchSubmit(searchTerm)}
                                    style={{
                                        position: 'absolute', right: '6px', border: 'none', background: settings.primary_color, color: 'white', borderRadius: '20px', padding: '0 15px', height: '34px', fontWeight: '600'
                                    }}
                                >
                                    {t('header.search_button')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Horizontal Category Bar */}
            {
                showCategoryBar && (
                    <div className="horizontal-bar-wrapper" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        paddingTop: '8px', // Gap 1: 8px
                        zIndex: 1050,
                        animation: 'slideDown 0.3s ease'
                    }}
                        onMouseEnter={() => setShowCategoryBar(true)}
                    >
                        <div className="horizontal-category-bar" style={{
                            background: 'white',
                            border: '1px solid #e9ecef',
                            borderRadius: '12px',
                            margin: '0 20px',
                            padding: '10px 0',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '40px'
                        }}>
                            {Array.isArray(categories) && categories.map(cat => (
                                <div
                                    key={cat._id}
                                    className={`h-cat-item ${activeCategory && activeCategory._id === cat._id ? 'active' : ''}`}
                                    onMouseEnter={() => handleCategoryEnter(cat)}
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: activeCategory?._id === cat._id ? 'bold' : '500',
                                        color: activeCategory?._id === cat._id ? settings.primary_color : '#495057',
                                        position: 'relative',
                                        padding: '5px 0'
                                    }}
                                >
                                    {t(`categories.${safeString(cat.name)}`, { defaultValue: safeString(cat.name) })}
                                    {activeCategory?._id === cat._id && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '0',
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            backgroundColor: settings.primary_color,
                                            borderRadius: '2px'
                                        }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Desktop Mega Menu Dropdown (Active Category Only) */}
            {
                activeCategory && showCategoryBar && (
                    <div className="mega-menu-container"
                        style={{
                            top: 'calc(100% + 51px)', // Gap 1 (8px) + Bar Height (~46px) = 54px
                            paddingTop: '20px', // Increased Gap 2 for visual space
                            animation: 'slideDown 0.3s ease'
                        }}
                        onMouseEnter={() => setShowCategoryBar(true)}
                    >
                        <div className="mega-menu-content">
                            {/* Panel 1: Subcategories (Left) */}
                            <div className="mega-menu-panel" style={{ width: '280px', borderRight: '1px solid #e9ecef', padding: '20px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                                <div className="mega-menu-title">
                                    {t(`categories.${safeString(activeCategory.name)}`, { defaultValue: safeString(activeCategory.name) })} Subcategories
                                </div>

                                <Link
                                    to={`/products?category=${activeCategory.slug}`}
                                    className={`subcat-item ${!activeSubcategory ? 'active' : ''}`}
                                    onMouseEnter={() => setActiveSubcategory(null)}
                                    onClick={() => setShowCategoryBar(false)}
                                >
                                    <span>All {t(`categories.${safeString(activeCategory.name)}`, { defaultValue: safeString(activeCategory.name) })}</span>
                                </Link>

                                {activeCategory.subcategories && activeCategory.subcategories.map(sub => (
                                    <div
                                        key={sub._id}
                                        className={`subcat-item ${activeSubcategory && activeSubcategory._id === sub._id ? 'active' : ''}`}
                                        onMouseEnter={() => setActiveSubcategory(sub)}
                                    >
                                        <span>{t(`categories.${safeString(sub.name)}`, { defaultValue: safeString(sub.name) })}</span>
                                        <FaChevronRight className="subcat-arrow" />
                                    </div>
                                ))}
                            </div>

                            {/* Panel 2: Item Types (Right) */}
                            <div className="mega-menu-right">
                                <div className="mm-right-header">
                                    <h3 className="mm-active-title">
                                        {activeSubcategory ? t(`categories.${safeString(activeSubcategory.name)}`, { defaultValue: safeString(activeSubcategory.name) }) : t(`categories.${safeString(activeCategory.name)}`, { defaultValue: safeString(activeCategory.name) })}
                                    </h3>
                                </div>

                                {activeSubcategory ? (
                                    <div className="mm-item-grid">
                                        {/* All Subcategory Link */}
                                        <Link
                                            to={`/products?category=${activeCategory.slug}&subcategory=${activeSubcategory.slug}`}
                                            className="mm-item-link"
                                            style={{ fontWeight: '600' }}
                                            onClick={() => setShowCategoryBar(false)}
                                        >
                                            All {t(`categories.${safeString(activeSubcategory.name)}`, { defaultValue: safeString(activeSubcategory.name) })}
                                        </Link>

                                        {activeSubcategory.items && activeSubcategory.items.length > 0 && activeSubcategory.items.map(item => (
                                            <Link
                                                key={item._id}
                                                to={`/products?category=${activeCategory.slug}&subcategory=${activeSubcategory.slug}&itemType=${item.slug}`}
                                                className="mm-item-link"
                                                onClick={() => setShowCategoryBar(false)}
                                            >
                                                {t(`categories.${safeString(item.name)}`, { defaultValue: safeString(item.name) })}
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mm-item-grid">
                                        <Link
                                            to={`/products?category=${activeCategory.slug}`}
                                            className="mm-item-link"
                                            style={{ fontWeight: '600', fontSize: '1.1rem' }}
                                            onClick={() => setShowCategoryBar(false)}
                                        >
                                            View all {t(`categories.${safeString(activeCategory.name)}`, { defaultValue: safeString(activeCategory.name) })} products
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Mobile Offcanvas Menu */}
            <div className={`mobile-offcanvas ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="mo-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {mobileLevel > 0 && (
                            <button onClick={handleMobileBack} className="mo-back-btn">
                                <FaChevronLeft /> Back
                            </button>
                        )}
                        <span className="mo-title">
                            {mobileLevel === 0 && 'Menu'}
                            {mobileLevel === 1 && t(`categories.${safeString(mobileSelectedCategory?.name)}`, { defaultValue: safeString(mobileSelectedCategory?.name) })}
                            {mobileLevel === 2 && t(`categories.${safeString(mobileSelectedSubcategory?.name)}`, { defaultValue: safeString(mobileSelectedSubcategory?.name) })}
                        </span>
                    </div>
                    <button onClick={closeMobileMenu} className="mo-close-btn"><FaTimes /></button>
                </div>

                <div className="mo-content">
                    {/* Level 0: Categories */}
                    {mobileLevel === 0 && (
                        <>
                            {!loading && categories.map(cat => (
                                <div key={cat._id} className="mo-item" onClick={() => handleMobileCategoryClick(cat)}>
                                    <span>{t(`categories.${safeString(cat.name)}`, { defaultValue: safeString(cat.name) })}</span>
                                    {cat.subcategories?.length > 0 && <FaChevronRight className="mo-arrow" />}
                                </div>
                            ))}
                            <div style={{ padding: '20px', borderTop: '1px solid #f1f3f5', marginTop: 'auto' }}>
                                {user ? (
                                    <>
                                        <div style={{ padding: '0 0 10px 0', fontSize: '0.8rem', fontWeight: '700', color: '#868e96', textTransform: 'uppercase' }}>Account</div>
                                        <Link to="/profile" className="mobile-link" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <FaUser size={16} /> My Profile
                                        </Link>
                                        <Link to={mode === 'seller' ? "/profile?tab=listings" : "/profile?tab=orders"} className="mobile-link" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {mode === 'seller' ? <FaListAlt size={16} /> : <FaShoppingCart size={16} />}
                                            {mode === 'seller' ? (mode === 'seller' ? 'Manage listings' : 'My orders') : 'My orders'}
                                        </Link>
                                        <Link to="/profile?tab=favorites" className="mobile-link" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <FaRegHeart size={16} /> Favorites
                                        </Link>
                                        <Link to="/profile?tab=messages" className="mobile-link" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <FaRegBell size={16} /> Messages
                                        </Link>
                                        <Link to="/cart" className="mobile-link" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <FiShoppingCart size={16} /> Cart
                                        </Link>
                                        <button onClick={handleLogout} className="mobile-link" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <FaSignOutAlt size={16} /> Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="mobile-link" onClick={closeMobileMenu}>Login</Link>
                                        <Link to="/register" className="mobile-link" onClick={closeMobileMenu}>Sign Up</Link>
                                    </>
                                )}
                                <Link to="/sell" className="mobile-btn" style={{ backgroundColor: settings.primary_color, marginTop: '20px' }} onClick={closeMobileMenu}>
                                    <FaPlus /> Sell Now
                                </Link>
                            </div>
                        </>
                    )}

                    {/* Level 1: Subcategories */}
                    {mobileLevel === 1 && mobileSelectedCategory && (
                        <div>
                            {/* All Category Link Mobile */}
                            <div className="mo-item" onClick={() => { closeMobileMenu(); navigate(`/products?category=${mobileSelectedCategory.slug}`); }}>
                                <span>All {t(`categories.${safeString(mobileSelectedCategory.name)}`, { defaultValue: safeString(mobileSelectedCategory.name) })}</span>
                            </div>
                            {mobileSelectedCategory.subcategories?.map(sub => (
                                <div key={sub._id} className="mo-item" onClick={() => handleMobileSubcategoryClick(sub)}>
                                    <span>{t(`categories.${safeString(sub.name)}`, { defaultValue: safeString(sub.name) })}</span>
                                    {sub.items?.length > 0 && <FaChevronRight className="mo-arrow" />}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Level 2: Item Types */}
                    {mobileLevel === 2 && mobileSelectedSubcategory && (
                        <div className="item-list-container">
                            {/* All Subcategory Link Mobile */}
                            <div className="mo-item" onClick={() => { closeMobileMenu(); navigate(`/products?category=${mobileSelectedCategory.slug}&subcategory=${mobileSelectedSubcategory.slug}`); }}>
                                <span>All {t(`categories.${safeString(mobileSelectedSubcategory.name)}`, { defaultValue: safeString(mobileSelectedSubcategory.name) })}</span>
                            </div>
                            {mobileSelectedSubcategory.items?.map(item => (
                                <div key={item._id} className="mo-item" onClick={() => { closeMobileMenu(); navigate(`/products?category=${mobileSelectedCategory.slug}&subcategory=${mobileSelectedSubcategory.slug}&itemType=${item.slug}`); }}>
                                    <span>{t(`categories.${safeString(item.name)}`, { defaultValue: safeString(item.name) })}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay for mobile menu */}
            {
                isMobileMenuOpen && <div className="mobile-overlay" onClick={closeMobileMenu} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999
                }}></div>
            }

            {/* Floating AI Assistant */}
            {
                isAiBtnVisible && (
                    <div
                        ref={aiBoxRef}
                        style={{
                            position: 'fixed',
                            bottom: windowWidth < 768 ? '90px' : (windowWidth < 480 ? '20px' : '30px'),
                            right: windowWidth < 480 ? '15px' : '30px',
                            zIndex: 2505,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            fontFamily: "var(--font-family)"
                        }}
                    >
                        {/* Chat Box - Shown when Open */}
                        {isAIDrawerOpen && (
                            <div style={{
                                position: 'fixed',
                                bottom: windowWidth < 768 ? '160px' : (windowWidth < 480 ? '100px' : '110px'),
                                top: windowWidth < 768 ? '75px' : '85px',
                                right: windowWidth < 480 ? '15px' : '30px',
                                width: windowWidth < 480 ? 'calc(100vw - 30px)' : '380px',
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid #f1f3f5',
                                zIndex: 2500
                            }}>
                                {/* AI Header */}
                                <div style={{
                                    padding: '18px 24px',
                                    background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.primary_color}dd)`,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <HiSparkles size={20} />
                                        <span style={{ fontWeight: '800', fontSize: '1rem' }}>{safeString(settings.site_name, 'Resale')} AI</span>
                                    </div>
                                    <FaTimes
                                        onClick={() => setIsAIDrawerOpen(false)}
                                        style={{ cursor: 'pointer', opacity: 0.8 }}
                                    />
                                </div>

                                {/* Messages Area */}
                                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {aiMessages.map((msg) => (
                                        <div key={msg.id} style={{ alignSelf: msg.isAi ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: msg.isAi ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                                                background: msg.isError ? '#fff5f5' : (msg.isAi ? 'white' : settings.primary_color),
                                                color: msg.isError ? '#e03131' : (msg.isAi ? '#333' : 'white'),
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                                fontSize: '0.88rem',
                                                lineHeight: '1.4',
                                                wordBreak: 'break-word',
                                                border: msg.isError ? `1px solid #ffa8a8` : 'none'
                                            }}>
                                                {msg.isAi ? (
                                                    <div className="ai-markdown-content">
                                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    msg.text
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isAiTyping && (
                                        <div style={{ display: 'flex', gap: '4px', padding: '5px' }}>
                                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: settings.primary_color, opacity: 0.4 }}></div>
                                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: settings.primary_color, opacity: 0.6 }}></div>
                                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: settings.primary_color, opacity: 0.4 }}></div>
                                        </div>
                                    )}
                                    <div ref={chatMessagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div style={{ padding: '15px', background: 'white', borderTop: '1px solid #f1f3f5' }}>
                                    <div style={{ display: 'flex', background: '#ffffff', borderRadius: '20px', padding: '4px 4px 4px 15px', alignItems: 'center', border: `1.5px solid ${settings.primary_color}`, boxShadow: `0 2px 8px ${settings.primary_color}15` }}>
                                        <input
                                            type="text"
                                            placeholder="Type a message..."
                                            value={aiInput}
                                            onChange={(e) => setAiInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAiSendMessage()}
                                            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', fontSize: '0.85rem' }}
                                        />
                                        <button
                                            onClick={handleAiSendMessage}
                                            style={{
                                                background: settings.primary_color,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                            }}
                                        >
                                            <FaChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Floating Trigger Button */}
                        <div
                            onMouseEnter={() => setIsAiHovered(true)}
                            onMouseLeave={() => setIsAiHovered(false)}
                            onClick={() => setIsAIDrawerOpen(!isAIDrawerOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                        >
                            {/* Hover Text Labels */}
                            <div style={{
                                background: 'white',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: settings.primary_color,
                                opacity: isAiHovered ? 1 : 0,
                                transform: isAiHovered ? 'translateX(0)' : 'translateX(20px)',
                                transition: 'all 0.3s ease',
                                pointerEvents: 'none',
                                border: `1px solid ${settings.primary_color}20`,
                                whiteSpace: 'nowrap'
                            }}>
                                Ask any question?
                            </div>

                            {/* AI Icon Button */}
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                backgroundColor: settings.primary_color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                                transition: 'transform 0.3s ease',
                                transform: (isAiHovered || isAIDrawerOpen) ? 'scale(1.1)' : 'scale(1)'
                            }}>
                                <HiSparkles size={28} />
                                {/* Question Mark Badge */}
                                {!isAIDrawerOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: 'white',
                                        color: settings.primary_color,
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: '900',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                    }}>
                                        ?
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            <Popup 
                popup={popup} 
                onClose={closePopup} 
                onConfirm={popup?.onConfirm} 
            />
        </header>
    );
};

export default Header;
