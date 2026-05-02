import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaSearch, FaPlus, FaTachometerAlt, FaUser, FaRegCommentDots, FaShoppingBag } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import '../styles/MobileNavbar.css';

const MobileNavbar = () => {
    const { user, mode } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Get current tab from URL for active state checking
    const queryParams = new URLSearchParams(location.search);
    const currentTab = queryParams.get('tab');

    const handleSellClick = () => {
        if (!user) {
            navigate('/login');
        } else {
            navigate('/sell');
        }
    };

    return (
        <div className="mobile-navbar">
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                <FaHome className="nav-icon" />
                <span>Home</span>
            </Link>

            <Link to="/profile?tab=messages" className={`nav-item ${location.pathname.startsWith('/profile') && currentTab === 'messages' ? 'active' : ''}`}>
                <FaRegCommentDots className="nav-icon" />
                <span>Chat</span>
            </Link>

            <div className="nav-item sell-item" onClick={handleSellClick}>
                <div className="sell-icon-wrapper">
                    <FaPlus className="nav-icon sell-icon" />
                </div>
            </div>

            <Link to={mode === 'seller' ? '/profile?tab=listings' : '/profile?tab=orders'} className={`nav-item ${location.pathname.startsWith('/profile') && (currentTab === 'listings' || currentTab === 'orders') ? 'active' : ''}`}>
                <FaShoppingBag className="nav-icon" />
                <span>{mode === 'seller' ? 'Manage listings' : 'My orders'}</span>
            </Link>

            <Link to="/profile?tab=profile_settings" className={`nav-item ${location.pathname.startsWith('/profile') && currentTab === 'profile_settings' ? 'active' : ''}`}>
                <FaUser className="nav-icon" />
                <span>Profile</span>
            </Link>
        </div>
    );
};

export default MobileNavbar;
