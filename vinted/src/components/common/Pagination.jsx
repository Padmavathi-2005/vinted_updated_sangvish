import React from 'react';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const visibleRange = 2; // Number of pages on each side of the current page

        // Always show the first page
        pages.push(1);

        if (currentPage > visibleRange + 2) {
            pages.push('...');
        }

        // Calculate start and end of the middle range
        const start = Math.max(2, currentPage - visibleRange);
        const end = Math.min(totalPages - 1, currentPage + visibleRange);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (currentPage < totalPages - (visibleRange + 1)) {
            pages.push('...');
        }

        // Always show the last page
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="vinted-pagination">
            <button 
                className="page-nav-btn first" 
                onClick={() => onPageChange(1)} 
                disabled={currentPage === 1}
                title="First Page"
            >
                <FaAngleDoubleLeft />
            </button>
            <button 
                className="page-nav-btn prev" 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                title="Previous Page"
            >
                <FaAngleLeft />
            </button>

            <div className="page-numbers">
                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={`dots-${index}`} className="page-dots">...</span>
                    ) : (
                        <button
                            key={page}
                            className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    )
                ))}
            </div>

            <button 
                className="page-nav-btn next" 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                title="Next Page"
            >
                <FaAngleRight />
            </button>
            <button 
                className="page-nav-btn last" 
                onClick={() => onPageChange(totalPages)} 
                disabled={currentPage === totalPages}
                title="Last Page"
            >
                <FaAngleDoubleRight />
            </button>
        </div>
    );
};

export default Pagination;
