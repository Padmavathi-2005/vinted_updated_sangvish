import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Spinner, Form, Button, Modal } from 'react-bootstrap';
import { FaUser, FaSearch, FaPaperPlane, FaEllipsisV, FaImage, FaSmile, FaCheckDouble, FaEnvelope, FaExclamationCircle, FaPlus } from 'react-icons/fa';
import axios from '../utils/axios';
import { getAdminInfo } from '../utils/auth';
import { getImageUrl, safeString } from '../utils/constants';
import '../styles/AdminMessages.css';

const Messages = () => {
    const navigate = useNavigate();
    const adminInfo = getAdminInfo();
    const adminId = adminInfo?._id || adminInfo?.id;

    const handleImageError = (e) => {
        e.target.style.display = 'none';
    };

    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef(null);

    // New conversation states
    const [allUsers, setAllUsers] = useState([]);
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [usersLoading, setUsersLoading] = useState(false);

    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const fetchConversations = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get('/api/admin-messages/conversations');
            setConversations(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setLoading(false);
        }
    };

    const fetchMessages = async (convId, silent = false) => {
        if (!silent) setMsgLoading(true);
        try {
            const res = await axios.get(`/api/admin-messages/${convId}`);
            setSelectedConv(res.data.conversation);
            setMessages(res.data.messages);
            setMsgLoading(false);
            if (!silent) {
                setTimeout(() => scrollToBottom("auto"), 50);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMsgLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await axios.get('/api/admin/users');
            setAllUsers(res.data);
            setUsersLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
        fetchAllUsers();
        // Polling every 10 seconds for new messages
        const interval = setInterval(() => {
            fetchConversations(true);
            if (activeConvIdRef.current) {
                fetchMessages(activeConvIdRef.current, true);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Keep track of active ID for polling
    const activeConvIdRef = useRef(null);
    useEffect(() => {
        activeConvIdRef.current = selectedConv?._id;
    }, [selectedConv]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageInput.trim() || !selectedConv) return;

        const otherParticipant = getOtherParticipant(selectedConv);
        const targetId = otherParticipant?.user?._id || otherParticipant?.user;
        const targetModel = otherParticipant?.on_model || 'User';

        if (!targetId) return;

        try {
            const res = await axios.post('/api/admin-messages', {
                receiver_id: targetId,
                receiver_model: targetModel,
                message: messageInput
            });

            // Update conversation state
            if (selectedConv._id === 'new') {
                setSelectedConv(res.data.conversation);
            }
            
            setMessages(prev => [...prev, res.data.message]);
            setMessageInput('');
            fetchConversations(true);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getOtherParticipant = (conv) => {
        if (!conv || !conv.participants) return null;
        return conv.participants.find(p => {
            const userId = p.user?._id || p.user || p._id;
            return userId && userId.toString() !== (adminId || '').toString();
        });
    };

    const renderMessageContent = (messageStr) => {
        if (!messageStr) return '';

        // Handle Order Notifications
        if (messageStr.startsWith('ORDER_NOTIFICATION::')) {
            try {
                const jsonStr = messageStr.replace('ORDER_NOTIFICATION::', '');
                const data = JSON.parse(jsonStr);
                return (
                    <div className="rich-notification order">
                        <div className="rich-notif-header">
                            {data.type === 'order_delivered' ? '✅ Order Delivered' : '🛒 New Order'}
                        </div>
                        <div className="rich-notif-body">
                            {data.is_bundle ? (
                                <div>Bundle of <strong>{data.item_count} items</strong></div>
                            ) : (
                                <div>Item: <strong>{safeString(data.item_title)}</strong></div>
                            )}
                            <div className="text-muted small">ID: {data.order_id}</div>
                        </div>
                    </div>
                );
            } catch (e) {
                return messageStr;
            }
        }

        // Handle Withdrawal Requests
        if (messageStr.startsWith('WITHDRAWAL_REQUEST::')) {
            try {
                const jsonStr = messageStr.replace('WITHDRAWAL_REQUEST::', '');
                const data = JSON.parse(jsonStr);
                return (
                    <div className="rich-notification withdrawal">
                        <div className="rich-notif-header">💰 Withdrawal Request</div>
                        <div className="rich-notif-body">
                            <div>Amount: <strong>{data.amount}</strong></div>
                            <div>Method: {data.method}</div>
                        </div>
                    </div>
                );
            } catch (e) {
                return messageStr;
            }
        }

        return messageStr;
    };

    const filteredConversations = conversations.filter(c => {
        const other = getOtherParticipant(c);
        const name = safeString(other?.user?.username || other?.user?.name) || 'User';
        return name.toLowerCase().includes(search.toLowerCase());
    });

    const filteredUsers = allUsers.filter(u =>
        (u.username || u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    const startNewChat = (user) => {
        // Check if conversation already exists
        const existing = conversations.find(c => {
            const other = getOtherParticipant(c);
            const otherId = other?.user?._id || other?.user;
            return otherId && user._id && otherId.toString() === user._id.toString();
        });

        if (existing) {
            fetchMessages(existing._id);
        } else {
            // Setup a "pseudo" conversation object for the UI
            setSelectedConv({
                _id: 'new',
                participants: [
                    { user: adminId, on_model: 'Admin' },
                    { user: user, on_model: 'User' }
                ],
                status: 'accepted'
            });
            setMessages([]);
        }
        setShowUserPicker(false);
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <div className="admin-messages-container">
            {/* Sidebar */}
            <aside className="messages-sidebar">
                <div className="messages-sidebar-header">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2>Messages</h2>
                        <button className="input-action-btn" onClick={() => setShowUserPicker(true)}>
                            <FaPlus />
                        </button>
                    </div>

                    <div className="compose-btn-wrapper">
                        <button className="sidebar-compose-btn" onClick={() => setShowUserPicker(true)}>
                            <FaPlus /> Start New Chat
                        </button>
                    </div>

                    <div className="search-wrapper">
                        <FaSearch className="search-icon-inside" />
                        <input
                            placeholder="Search conversation..."
                            className="sidebar-search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="conversations-list scroll-premium">
                    {filteredConversations.map((c) => {
                        const otherParticipant = getOtherParticipant(c);
                        const other = otherParticipant?.user;
                        const isOnline = other?.last_login && (new Date() - new Date(other.last_login)) < 5 * 60000;
                        const isActive = selectedConv?._id === c._id;

                        return (
                            <div
                                key={c._id}
                                className={`conv-item ${isActive ? 'active-conv' : ''}`}
                                onClick={() => fetchMessages(c._id)}
                            >
                                <div className="conv-avatar-wrapper" style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                                    <div className="conv-avatar-circle" style={{ position: 'relative', width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="conv-avatar-placeholder" style={{ fontSize: '1rem', fontWeight: '800', color: '#94a3b8' }}>
                                            {(other?.username || other?.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        {other?.profile_image && (
                                            <img 
                                                src={getImageUrl(other.profile_image)} 
                                                className="conv-avatar" 
                                                alt={other.name} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                onError={handleImageError} 
                                            />
                                        )}
                                    </div>
                                    {isOnline && <div className="online-status-dot" style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', background: '#10b981', border: '2px solid white', borderRadius: '50%', zIndex: 2 }}></div>}
                                </div>
                                <div className="conv-info">
                                    <div className="conv-header">
                                        <span className="conv-name">{safeString(other?.username || other?.name) || 'User'}</span>
                                        <span className="conv-time">
                                            {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <p className="conv-last-msg">
                                            {(() => {
                                                const lm = c.last_message || '';
                                                if (lm.startsWith('ORDER_NOTIFICATION::')) return 'Order Update';
                                                if (lm.startsWith('WITHDRAWAL_REQUEST::')) return 'Withdrawal Request';
                                                return safeString(lm) || 'No messages yet';
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredConversations.length === 0 && (
                        <div className="p-5 text-center text-muted">
                            <FaExclamationCircle size={30} className="mb-3 opacity-25" />
                            <p className="small mb-0">No conversations found</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Chat Main Area */}
            <main className="chat-main">
                {selectedConv ? (
                    <>
                        <header className="chat-header">
                            {(() => {
                                const otherData = getOtherParticipant(selectedConv);
                                const other = otherData?.user || {};
                                const isOnline = other?.last_login && (new Date() - new Date(other.last_login)) < 5 * 60000;
                                return (
                                    <>
                                        <div className="chat-header-info">
                                            <div className="conv-avatar-wrapper" style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                                                <div className="conv-avatar-circle" style={{ position: 'relative', width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div className="conv-avatar-placeholder" style={{ width: '44px', height: '44px', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                        {(other?.username || other?.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    {other?.profile_image && (
                                                        <img 
                                                            src={getImageUrl(other.profile_image)} 
                                                            className="conv-avatar" 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                            alt="" 
                                                            onError={handleImageError} 
                                                        />
                                                    )}
                                                </div>
                                                {isOnline && <div className="online-status-dot" style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', background: '#10b981', border: '2px solid white', borderRadius: '50%', zIndex: 2 }}></div>}
                                            </div>
                                            <div>
                                                <h4 className="chat-header-name">{safeString(other?.username || other?.name) || 'User'}</h4>
                                                <span className="chat-header-status" style={{ color: isOnline ? '#10b981' : '#94a3b8' }}>
                                                    {isOnline ? 'Active Now' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            <div className="chat-header-actions">
                                {selectedConv?.item_id && (
                                    <div className="chat-item-context-mini">
                                        <div className="text-muted small text-end">Regarding item:</div>
                                        <div className="fw-bold small">{safeString(selectedConv.item_id?.title)}</div>
                                    </div>
                                )}
                                <button className="input-action-btn ms-2"><FaEllipsisV /></button>
                            </div>
                        </header>

                        {selectedConv?.item_id && (
                            <div className="chat-item-banner">
                                <div className="d-flex align-items-center gap-3">
                                    <img 
                                        src={getImageUrl(selectedConv.item_id.images?.[0])} 
                                        className="item-banner-img" 
                                        alt="" 
                                        onError={(e) => { e.target.src = '/images/placeholder.png'; }}
                                    />
                                    <div className="flex-grow-1">
                                        <div className="item-banner-title">{safeString(selectedConv.item_id.title)}</div>
                                        <div className="item-banner-price">Price: ₹{(selectedConv.item_id.price || 0).toLocaleString()}</div>
                                    </div>
                                    <button 
                                        className="btn btn-sm btn-outline-primary rounded-pill"
                                        onClick={() => navigate('/listings')}
                                    >
                                        View Item
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="chat-messages-area scroll-premium">
                            {msgLoading ? (
                                <div className="d-flex justify-content-center p-5"><Spinner animation="border" size="sm" /></div>
                            ) : (
                                <>
                                    {messages.length === 0 && selectedConv._id === 'new' && (
                                        <div className="text-center py-5 opacity-50">
                                            <FaEnvelope size={40} className="mb-3" />
                                            <p>Send a message to start this conversation</p>
                                        </div>
                                    )}
                                    {messages.map((m) => {
                                        const senderId = m.sender_id?._id || m.sender_id;
                                        const isMe = m.sender_model === 'Admin' && senderId?.toString() === (adminId || '').toString();
                                        return (
                                            <div key={m._id} className={`message-wrapper ${isMe ? 'sent' : 'received'}`}>
                                                <div className={`message-bubble ${m.message?.startsWith('ORDER_NOTIFICATION::') || m.message?.startsWith('WITHDRAWAL_REQUEST::') ? 'rich' : ''}`}>
                                                    {renderMessageContent(m.message)}
                                                    <div className="message-time-meta">
                                                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && <FaCheckDouble size={10} />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        <div className="chat-input-wrapper">
                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <button type="button" className="input-action-btn"><FaImage /></button>
                                <button type="button" className="input-action-btn"><FaSmile /></button>
                                <input
                                    placeholder="Type a message..."
                                    className="chat-input-field"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="send-btn-primary"
                                    disabled={!messageInput.trim()}
                                >
                                    <FaPaperPlane />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="messages-empty-state">
                        <div className="empty-state-illustration">
                            <FaEnvelope />
                        </div>
                        <h3>Select a Conversation</h3>
                        <p>Choose a user from the list on the left to start a real-time conversation.</p>
                        <Button variant="primary" className="mt-4 rounded-pill px-4" onClick={() => setShowUserPicker(true)}>
                            Start New Chat
                        </Button>
                    </div>
                )}
            </main>

            {/* User Picker Modal */}
            <Modal
                show={showUserPicker}
                onHide={() => setShowUserPicker(false)}
                centered
                size="md"
                className="user-picker-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>New Message</Modal.Title>
                </Modal.Header>
                <div className="user-picker-search-container">
                    <div className="user-picker-search-wrapper">
                        <FaSearch className="text-muted" />
                        <input
                            className="user-picker-search-input"
                            placeholder="Search users by name or email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="user-picker-list scroll-premium">
                    {usersLoading ? (
                        <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>
                    ) : (
                        filteredUsers.map(u => (
                            <div key={u._id} className="user-picker-item" onClick={() => startNewChat(u)}>
                                <div className="conv-avatar-wrapper" style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                                    <div className="conv-avatar-circle" style={{ position: 'relative', width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="conv-avatar-placeholder" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#94a3b8' }}>
                                            {(u.username || u.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        {u.profile_image && (
                                            <img 
                                                src={getImageUrl(u.profile_image)} 
                                                className="conv-avatar" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                                alt="" 
                                                onError={handleImageError} 
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="user-picker-info">
                                    <h6 className="user-picker-name">{safeString(u.username || u.name)}</h6>
                                    <p className="user-picker-email">{u.email}</p>
                                </div>
                                <div className="user-picker-action">Message</div>
                            </div>
                        ))
                    )}
                    {!usersLoading && filteredUsers.length === 0 && (
                        <div className="text-center p-5 text-muted">No users found</div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Messages;
