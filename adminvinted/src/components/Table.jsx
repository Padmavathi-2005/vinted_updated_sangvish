import React, { useRef, useState, useEffect } from 'react';
import { Button, Table as BTable, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { showToast } from '../utils/swal';
import Toggle from './Toggle';
import axios from '../utils/axios';
import Pagination from './common/Pagination';
import '../styles/Table.css';

const Table = ({
    columns,
    data = [],
    actions,
    onEdit,
    onDelete,
    pagination,
    emptyMessage = "No records found"
}) => {
    const { paginationLimit, emptyTableImage, paginationMode } = useSettings();
    const [currentPage, setCurrentPage] = useState(1);
    const [currentLimit, setCurrentLimit] = useState(paginationLimit || 10);
    const [isScrollMode, setIsScrollMode] = useState(paginationMode === 'scroll');

    useEffect(() => {
        setIsScrollMode(paginationMode === 'scroll');
    }, [paginationMode]);

    useEffect(() => {
        if (!isScrollMode) {
            setCurrentLimit(paginationLimit || 10);
        }
    }, [paginationLimit, isScrollMode]);

    useEffect(() => {
        setCurrentPage(1);
    }, [data.length, paginationLimit, isScrollMode]);

    const totalPages = Math.ceil(data.length / currentLimit) || 1;

    let displayData = data;
    if (pagination) {
        if (isScrollMode) {
            displayData = data.slice(0, currentLimit);
        } else {
            displayData = data.slice((currentPage - 1) * currentLimit, currentPage * currentLimit);
        }
    }

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleLoadMore = () => {
        if (currentLimit < data.length) {
            setCurrentLimit(prev => prev + (paginationLimit || 10));
        }
    };

    const observerTarget = useRef(null);

    useEffect(() => {
        if (!isScrollMode || currentLimit >= data.length) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    handleLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) observer.unobserve(observerTarget.current);
        };
    }, [isScrollMode, currentLimit, data.length, paginationLimit]);

    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const checkScrollable = () => {
        if (scrollRef.current) {
            setIsScrollable(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
        }
    };

    React.useEffect(() => {
        checkScrollable();
        window.addEventListener('resize', checkScrollable);
        return () => window.removeEventListener('resize', checkScrollable);
    }, [data]);

    const onMouseDown = (e) => {
        if (!isScrollable) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll-fast
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="custom-table-container">
            <div
                className={`table-responsive ${isDragging ? 'active-dragging' : ''} ${isScrollable ? 'is-scrollable' : ''}`}
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
            >
                <BTable hover className="custom-table align-middle">
                    <thead>
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} style={{ width: col.width }}>
                                    {col.header}
                                </th>
                            ))}
                            {actions && <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.length > 0 ? (
                            displayData.map((row, rowIndex) => (
                                <tr key={row._id || rowIndex} className="table-row">
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} data-label={col.header}>
                                            <div className="cell-content">
                                                {col.render ? col.render(row) : row[col.accessor]}
                                            </div>
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="text-end action-cell" data-label="Actions">
                                            <div className="action-buttons">
                                                {onEdit && (
                                                    <button
                                                        className="action-btn edit-btn"
                                                        onClick={() => onEdit(row)}
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={14} />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        className="action-btn delete-btn"
                                                        onClick={() => onDelete(row)}
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-5 text-muted">
                                    <div className="d-flex flex-column align-items-center justify-content-center gap-2">
                                        {emptyTableImage ? (
                                            <img
                                                src={`${axios.defaults.baseURL}/${emptyTableImage}`}
                                                alt="Empty"
                                                style={{ maxWidth: '160px', opacity: 0.7, marginBottom: '8px' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '72px', height: '72px', borderRadius: '50%',
                                                background: '#f1f5f9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                marginBottom: '8px'
                                            }}>
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                                                </svg>
                                            </div>
                                        )}
                                        <span className="fw-semibold" style={{ fontSize: '0.95rem', color: '#64748b' }}>{emptyMessage}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No records to display here yet.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </BTable>
            </div>

            {pagination && data.length > (paginationLimit || 10) && (
                <div className="table-footer">
                    <div className="d-flex align-items-center gap-4">
                        {!isScrollMode && (
                            <div className="rows-per-page">
                                Rows per page:
                                <select
                                    className="rows-select"
                                    value={currentLimit}
                                    onChange={(e) => { setCurrentLimit(parseInt(e.target.value)); setCurrentPage(1); }}
                                >
                                    {[1, 2, 3].map(multiplier => {
                                        const val = (paginationLimit || 10) * multiplier;
                                        return <option key={val} value={val}>{val}</option>;
                                    })}
                                </select>
                            </div>
                        )}
                        {/* Mode switcher removed as per request to use default pagination mode from settings */}
                        {!isScrollMode && totalPages > 1 && (
                            <div className="page-range d-none d-sm-block">
                                {(currentPage - 1) * currentLimit + 1}-{Math.min(currentPage * currentLimit, data.length)} of {data.length}
                            </div>
                        )}
                    </div>

                    {!isScrollMode && totalPages > 1 && (
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                    {isScrollMode && currentLimit < data.length && (
                        <div ref={observerTarget} className="d-flex justify-content-center py-2 ms-auto" style={{ width: '100px' }}>
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Table;
