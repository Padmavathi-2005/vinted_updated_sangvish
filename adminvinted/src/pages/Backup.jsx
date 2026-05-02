import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Table, Spinner, Badge } from 'react-bootstrap';
import { FaDatabase, FaDownload, FaPlus, FaTrashAlt, FaChevronRight } from 'react-icons/fa';
import axios, { imageBaseURL } from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';

const Backup = () => {
    const [loading, setLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setFetching(true);
        try {
            const { data } = await axios.get('/api/system/backups');
            setBackups(data);
        } catch (error) {
            showToast('error', 'Failed to fetch backups');
        } finally {
            setFetching(false);
        }
    };

    const handleCreateBackup = async () => {
        setLoading(true);
        try {
            const { data } = await axios.post('/api/system/backups');
            showToast('success', data.message);
            fetchBackups();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to create backup');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBackup = async (fileName) => {
        const confirm = await showConfirm(
            'Delete Backup?',
            `Are you sure you want to delete "${fileName}"? This cannot be undone.`,
            'Yes, Delete'
        );

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`/api/system/backups/${fileName}`);
                showToast('success', 'Backup deleted');
                fetchBackups();
            } catch (error) {
                showToast('error', 'Failed to delete backup');
            }
        }
    };

    const handleDownload = async (fileName, downloadUrl) => {
        setLoading(true);
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('success', 'Backup download started');
        } catch (error) {
            showToast('error', 'Failed to download backup');
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="backup-container p-4">
            <Container>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1"><FaDatabase className="text-primary me-2" /> Database Backups</h2>
                        <p className="text-muted">Generate and manage system-wide database backups.</p>
                    </div>
                    <Button 
                        variant="primary" 
                        onClick={handleCreateBackup} 
                        disabled={loading}
                        className="d-flex align-items-center shadow-sm px-4"
                    >
                        {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaPlus className="me-2" />}
                        Generate New Backup
                    </Button>
                </div>

                <Card className="border-0 shadow-sm">
                    <Card.Body className="p-0">
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="p-3">File Name</th>
                                    <th className="p-3">Generated At</th>
                                    <th className="p-3">Size</th>
                                    <th className="p-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetching ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5">
                                            <Spinner animation="border" variant="primary" />
                                            <p className="mt-2 text-muted mb-0">Fetching backups...</p>
                                        </td>
                                    </tr>
                                ) : backups.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5">
                                            <div className="text-muted opacity-50 mb-3"><FaDatabase size={48} /></div>
                                            <h6 className="text-muted">No backups found. Click "Generate" to create one.</h6>
                                        </td>
                                    </tr>
                                ) : (
                                    backups.map((backup, idx) => (
                                        <tr key={idx} className="align-middle">
                                            <td className="p-3 fw-bold">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-primary bg-opacity-10 text-primary p-2 rounded me-3"><FaDatabase /></div>
                                                    {backup.name}
                                                </div>
                                            </td>
                                            <td className="p-3 text-muted">
                                                {new Date(backup.createdAt).toLocaleString()}
                                            </td>
                                            <td className="p-3">
                                                <Badge bg="light" text="dark" className="border px-2 py-1">{formatSize(backup.size)}</Badge>
                                            </td>
                                            <td className="p-3 text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button 
                                                        variant="outline-primary" 
                                                        size="sm" 
                                                        className="d-flex align-items-center"
                                                        onClick={() => handleDownload(backup.name, backup.downloadUrl)}
                                                        disabled={loading}
                                                    >
                                                        <FaDownload className="me-2" /> Download
                                                    </Button>
                                                    <Button 
                                                        variant="outline-danger" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteBackup(backup.name)}
                                                        disabled={loading}
                                                    >
                                                        <FaTrashAlt />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                <div className="mt-4 p-3 bg-light rounded border text-muted small">
                    <h6 className="fw-bold text-dark"><FaDatabase size={14} className="me-2" /> Information on Backups:</h6>
                    <p className="mb-1">Backups are stored as JSON files on the server including all major collections (Users, Items, Settings, Categories, etc.).</p>
                    <p className="mb-0"><strong>Note:</strong> Large databases might take a few moments to generate. These files are for manual download and can be used for data restoration purposes later.</p>
                </div>
            </Container>
        </div>
    );
};

export default Backup;
