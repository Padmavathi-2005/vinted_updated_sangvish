import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Form, InputGroup, Spinner, ButtonGroup } from 'react-bootstrap';
import { FaPlus, FaSearch, FaUserAlt, FaTrash, FaEdit } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import AdminSearchSelect from '../components/AdminSearchSelect';
import axios, { imageBaseURL } from '../utils/axios';
import { useSettings } from '../context/SettingsContext';
import { useLocalization } from '../context/LocalizationContext';
import { showToast, showConfirm } from '../utils/swal';
import { safeString, getImageUrl } from '../utils/constants';

const Users = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialFilter = queryParams.get('filter') || 'all';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState(initialFilter);

    const { paginationLimit } = useSettings();
    const { t, formatPrice } = useLocalization();


    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        status: 'Active',
        is_verified: false,
        balance: 0,
        bio: '',
        rating_avg: 0,
        rating_count: 0,
        followers_count: 0,
        following_count: 0,
        profile_image: null
    });

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = getImageUrl('images/site/not_found.png');
    };

    const [saving, setSaving] = useState(false);
    const [togglingUserId, setTogglingUserId] = useState(null);
    const [togglingDeleteId, setTogglingDeleteId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [searchTerm, userTypeFilter, paginationLimit]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/users', {
                params: { type: userTypeFilter === 'all' ? undefined : userTypeFilter }
            });
            let data = res.data;

            if (searchTerm && Array.isArray(data)) {
                const term = searchTerm.toLowerCase();
                data = data.filter(u =>
                    safeString(u.username).toLowerCase().includes(term) ||
                    (u.email || '').toLowerCase().includes(term)
                );
            }

            setUsers(data);

            setLoading(false);
        } catch (error) {
            console.error("Error fetching users", error);
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username || '',
            email: user.email || '',
            status: user.is_blocked ? 'Inactive' : 'Active',
            is_verified: user.is_verified ?? false,
            balance: user.balance ?? 0,
            bio: user.bio || '',
            rating_avg: user.rating_avg ?? 0,
            rating_count: user.rating_count ?? 0,
            followers_count: user.followers_count ?? 0,
            following_count: user.following_count ?? 0,
            password: '',
            profile_image: null
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = (user) => {
        showConfirm(
            'Delete User?',
            `Are you sure you want to delete ${safeString(user.username)}?`,
            'Yes, Delete'
        ).then((result) => {
            if (result.isConfirmed) {
                handleDeleteUser(user._id);
            }
        });
    };

    const handleDeleteUser = async (id) => {
        try {
            await axios.delete(`/api/admin/users/${id}`);
            showToast('success', 'User deleted successfully');
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user", error);
            showToast('error', 'Failed to delete user');
        }
    };

    const handleStatusToggle = async (user, isChecked) => {
        setTogglingUserId(user._id);
        try {
            const newStatus = isChecked ? 'Active' : 'Inactive';
            await axios.put(`/api/admin/users/${user._id}`, { status: newStatus });

            // Optimistic update
            setUsers(users.map(u =>
                u._id === user._id ? { ...u, is_blocked: !isChecked } : u
            ));
        } catch (error) {
            console.error("Error toggling status", error);
            showToast('error', "Failed to update status");
        } finally {
            setTogglingUserId(null);
        }
    };

    const handleVerifiedToggle = async (user, isVerified) => {
        setTogglingDeleteId(user._id);
        try {
            await axios.put(`/api/admin/users/${user._id}`, { is_verified: isVerified });

            setUsers(users.map(u =>
                u._id === user._id ? { ...u, is_verified: isVerified } : u
            ));
        } catch (error) {
            console.error("Error toggling verification status", error);
            showToast('error', "Failed to update verification status");
        } finally {
            setTogglingDeleteId(null);
        }
    };

    const handleSaveUser = async () => {
        if (!formData.username || !formData.email || (showAddModal && !formData.password)) {
            showToast('warning', "Please fill in all required fields");
            return;
        }

        setSaving(true);
        try {
            const submitData = new FormData();
            submitData.append('username', formData.username);
            submitData.append('email', formData.email);
            submitData.append('status', formData.status);
            submitData.append('is_verified', formData.is_verified);
            submitData.append('balance', formData.balance);
            submitData.append('bio', formData.bio);
            submitData.append('rating_avg', formData.rating_avg);
            submitData.append('rating_count', formData.rating_count);
            submitData.append('followers_count', formData.followers_count);
            submitData.append('following_count', formData.following_count);

            if (formData.password) submitData.append('password', formData.password);
            if (formData.profile_image) submitData.append('profile_image', formData.profile_image);

            if (showEditModal) {
                await axios.put(`/api/admin/users/${selectedUser._id}`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/admin/users', submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            showToast('success', `User ${selectedUser ? 'updated' : 'created'} successfully`);
            setShowAddModal(false);
            setShowEditModal(false);
            fetchUsers();
        } catch (error) {
            console.error("Error saving user", error);
            showToast('error', error.response?.data?.message || "Error saving user");
        } finally {
            setSaving(false);
        }
    };



    const columns = [
        {
            header: t('users.table.user'),
            accessor: 'username',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    <div className="avatar-small d-flex align-items-center justify-content-center bg-light rounded-circle overflow-hidden border shadow-sm" style={{ width: '40px', height: '40px', position: 'relative' }}>
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary text-white" style={{ background: 'linear-gradient(135deg, #0d6efd, #0dcaf0)', fontSize: '14px' }}>
                            {safeString(row.username)?.charAt(0).toUpperCase() || <FaUserAlt size={16} />}
                        </div>
                        {row.profile_image && (
                            <img 
                                src={getImageUrl(row.profile_image)} 
                                alt={safeString(row.username)} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                        )}
                    </div>
                    <div>
                        <div className="fw-bold">{safeString(row.username)}</div>
                        <div className="text-muted small">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: t('users.table.status'),
            accessor: 'is_blocked',
            render: (row) => (
                <div className="d-flex flex-column align-items-start gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <Toggle
                            checked={!row.is_blocked}
                            onChange={(checked) => handleStatusToggle(row, checked)}
                            label={!row.is_blocked ? t('common.status.active') : t('common.status.blocked')}
                        />
                        {togglingUserId === row._id && <Spinner animation="border" size="sm" variant="primary" />}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <Toggle
                            checked={row.is_verified}
                            onChange={(checked) => handleVerifiedToggle(row, checked)}
                            label={row.is_verified ? t('users.modal.is_verified') : t('users.modal.not_verified')}
                        />
                        {togglingDeleteId === row._id && <Spinner animation="border" size="sm" variant="success" />}
                        {row.is_verified && <span className="badge bg-success ms-1">✓</span>}
                    </div>
                </div>
            )
        },
        {
            header: t('sidebar.wallet.title'),
            accessor: 'balance',
            render: (row) => (
                <div className="fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                    {formatPrice(row.balance)}
                </div>
            )
        },
        {
            header: t('users.modal.bio') || 'Bio',
            accessor: 'bio',
            render: (row) => (
                <div style={{ maxWidth: '180px' }}>
                    <div className="text-truncate small text-muted" title={safeString(row.bio) || 'No bio'}>
                        {safeString(row.bio) || <span className="fst-italic opacity-50">No bio provided</span>}
                    </div>
                </div>
            )
        },
        {
            header: t('users.table.ratings') || 'Ratings',
            accessor: 'rating_avg',
            render: (row) => (
                <div className="d-flex align-items-center gap-1 small fw-bold">
                    <span className="text-warning">★ {row.rating_avg?.toFixed(1) || '0.0'}</span>
                    <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>({row.rating_count || 0} reviews)</span>
                </div>
            )
        },
        {
            header: t('users.table.network') || 'Network',
            accessor: 'followers_count',
            render: (row) => (
                <div className="small">
                    <div><span className="fw-bold">{row.followers_count || 0}</span> {t('users.table.followers') || 'Followers'}</div>
                    <div className="text-muted"><span className="fw-bold text-dark">{row.following_count || 0}</span> {t('users.table.following') || 'Following'}</div>
                </div>
            )
        },
        {
            header: t('users.table.joined') || 'Joined Date',
            accessor: 'created_at',
            render: (row) => (
                <div className="small">
                    <div>{new Date(row.created_at).toLocaleDateString()}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            header: t('users.table.updated') || 'Last Updated',
            accessor: 'updated_at',
            render: (row) => (
                <div className="small">
                    <div>{new Date(row.updated_at).toLocaleDateString()}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                        <div>
                            <h1 className="dashboard-title h3 mb-1 text-users">{t('users.title')}</h1>
                            <p className="text-muted small mb-0">{t('users.subtitle')}</p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setFormData({ username: '', email: '', password: '', status: 'Active', profile_image: null });
                                setShowAddModal(true);
                            }}
                            className="btn-admin-action"
                        >
                            <FaPlus /> {t('users.add_new')}
                        </Button>
                    </div>

                    <div className="d-flex gap-3 flex-wrap mb-4">
                        <div className="flex-grow-1" style={{ maxWidth: '350px' }}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={t('users.search_placeholder')}
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </InputGroup>
                        </div>
                        <div style={{ width: '200px' }}>
                            <Form.Select
                                value={userTypeFilter}
                                onChange={(e) => setUserTypeFilter(e.target.value)}
                                className="admin-filter-select"
                            >
                                <option value="all">{t('users.filter_all')}</option>
                                <option value="buyer">{t('dashboard.users.buyers')}</option>
                                <option value="seller">{t('dashboard.users.sellers')}</option>
                                <option value="today">{t('users.filter_today')}</option>
                            </Form.Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">{t('common.loading')}</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={users}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            pagination={true}
                            emptyMessage={t('common.no_data')}
                        />
                    )}
                </Card>

                {/* Add/Edit Modal */}
                <Modal
                    show={showAddModal || showEditModal}
                    onHide={() => { setShowAddModal(false); setShowEditModal(false); }}
                    title={showAddModal ? "Add New User" : "Edit User Profile"}
                    size="md"
                    footer={
                        <>
                            <Button variant="outline-secondary" className="btn-admin-outline" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveUser}
                                className="btn-admin-action"
                                disabled={saving}
                            >
                                {saving ? <Spinner size="sm" className="me-2" /> : null}
                                {showAddModal ? "Create User" : "Update User"}
                            </Button>
                        </>
                    }
                >
                    <Form className="admin-form">
                        <div className="row">
                            <div className="col-md-12 mb-3 text-center">
                                <div className="mb-2 d-flex justify-content-center">
                                    {formData.profile_image ? (
                                        <div className="rounded-circle border overflow-hidden shadow-sm" style={{ width: '80px', height: '80px' }}>
                                            <img src={URL.createObjectURL(formData.profile_image)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : selectedUser?.profile_image ? (
                                        <div className="rounded-circle border overflow-hidden shadow-sm" style={{ width: '80px', height: '80px' }}>
                                            <img src={getImageUrl(selectedUser.profile_image)} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                                        </div>
                                    ) : (
                                        <div className="rounded-circle border bg-light d-flex align-items-center justify-content-center shadow-sm" style={{ width: '80px', height: '80px' }}>
                                            <FaUserAlt className="text-muted fs-3" />
                                        </div>
                                    )}
                                </div>
                                <Form.Label className="btn btn-sm btn-outline-primary rounded-pill px-3 mt-1 cursor-pointer">
                                    <input type="file" hidden accept="image/*" onChange={(e) => setFormData({ ...formData, profile_image: e.target.files[0] })} />
                                    {showAddModal ? "Upload Profile Image" : "Change Profile Image"}
                                </Form.Label>
                            </div>

                            <div className="col-md-12">
                                <Form.Group className="mb-3">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="e.g. john_doe"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-12">
                                <Form.Group className="mb-3">
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="e.g. john@example.com"
                                        disabled={showEditModal}
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>{showEditModal ? "New Password (Optional)" : "Password"}</Form.Label>
                            <Form.Control
                                type="password"
                                value={formData.password || ''}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={showEditModal ? "Leave blank to keep current" : "Enter secure password"}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Bio (Description)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.bio || ''}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Enter user bio description..."
                            />
                        </Form.Group>

                        <div className="row">
                            <div className={showEditModal ? "col-md-6" : "col-md-12"}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Status (Active/Blocked)</Form.Label>
                                    <AdminSearchSelect
                                        options={[
                                            { value: 'Active', label: 'Active User' },
                                            { value: 'Inactive', label: 'Inactive / Blocked User' }
                                        ]}
                                        value={formData.status}
                                        onChange={(val) => setFormData({ ...formData, status: val })}
                                        placeholder="Select status..."
                                        searchPlaceholder="Search active/inactive..."
                                    />
                                </Form.Group>
                            </div>

                            {showEditModal && (
                                <div className="col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Verification Status</Form.Label>
                                        <AdminSearchSelect
                                            options={[
                                                { value: false, label: 'Unverified' },
                                                { value: true, label: 'Verified Account' }
                                            ]}
                                            value={formData.is_verified}
                                            onChange={(val) => setFormData({ ...formData, is_verified: val })}
                                            placeholder="Select status..."
                                            searchPlaceholder="Search verified..."
                                        />
                                    </Form.Group>
                                </div>
                            )}
                        </div>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default Users;
