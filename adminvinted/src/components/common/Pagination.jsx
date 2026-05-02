import React from 'react';
import { FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const visibleRange = 1; // Exactly 3 pages in the central group (before/current/after)

        // First page
        pages.push(1);

        if (currentPage > visibleRange + 2) {
            pages.push('...');
        }

        const start = Math.max(2, currentPage - visibleRange);
        const end = Math.min(totalPages - 1, currentPage + visibleRange);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (currentPage < totalPages - (visibleRange + 1)) {
            pages.push('...');
        }

        // Last page
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="admin-pagination-unified-box">
            <button 
                className="admin-nav-item first" 
                onClick={() => onPageChange(1)} 
                disabled={currentPage === 1}
                title="First Page"
            >
                <FaAngleDoubleLeft size={10} />
            </button>
            <button 
                className="admin-nav-item prev" 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                title="Previous Page"
            >
                <FaChevronLeft size={10} />
            </button>

            <div className="admin-page-list">
                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={`dots-${index}`} className="admin-page-dots">...</span>
                    ) : (
                        <button
                            key={page}
                            className={`admin-page-item ${currentPage === page ? 'active' : ''}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    )
                ))}
            </div>

            <button 
                className="admin-nav-item next" 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                title="Next Page"
            >
                <FaChevronRight size={10} />
            </button>
            <button 
                className="admin-nav-item last" 
                onClick={() => onPageChange(totalPages)} 
                disabled={currentPage === totalPages}
                title="Last Page"
            >
                < FaAngleDoubleRight size={10} />
            </button>
        </div>
    );
};

export default Pagination;
