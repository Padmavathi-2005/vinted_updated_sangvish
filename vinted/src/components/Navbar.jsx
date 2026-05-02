import React from 'react';
import { Link } from 'react-router-dom';
import '../index.css';

const Navbar = () => {
    return (
        <header className="header">
            <div className="container nav">
                <Link to="/" className="logo">
                    Resale
                </Link>
                <ul className="nav-links">
                    <li>
                        <Link to="/" className="nav-link">Home</Link>
                    </li>
                    <li>
                        <Link to="/products" className="nav-link">Products</Link>
                    </li>
                </ul>
                <Link to="/login" className="btn btn-primary">
                    Sign In
                </Link>
            </div>
        </header>
    );
};

export default Navbar;
