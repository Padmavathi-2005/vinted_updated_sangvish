import { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import AuthContext from '../../context/AuthContext';
import NotificationContext from '../../context/NotificationContext';
import CurrencyContext from '../../context/CurrencyContext';
import { useTranslation } from 'react-i18next';
import { FaPaperPlane, FaUser, FaClock, FaCheck, FaTimes, FaInbox, FaBan, FaEllipsisV, FaEnvelope, FaShoppingBag, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { getImageUrl, safeString } from '../../utils/constants';
import '../../styles/Messaging.css';
import { io as socketIO } from 'socket.io-client';

const socket = socketIO('/', {
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5
});

const getMarketplaceName = (siteNameStrOrObj) => {
    return safeString(siteNameStrOrObj) || 'Marketplace';
};

const MessagesContent = () => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const { notifications, markAsRead } = useContext(NotificationContext);
    const { formatPrice } = useContext(CurrencyContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [settings, setSettings] = useState(null);
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const chatEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const initialLoadRef = useRef(true);

    const handleImageError = (e) => {
        e.target.style.display = 'none';
    };

    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchAllUsers();
            fetchSettings();
        }
    }, [user]);

    // Socket: Join Conversation Room
    useEffect(() => {
        if (activeConv && activeConv._id !== 'new') {
            socket.emit('join_conversation', activeConv._id);
        }
    }, [activeConv]);

    // Socket: Listen for Messages
    useEffect(() => {
        const handleReceiveMessage = (data) => {
            const { message, conversation } = data;

            // Update conversations list (sidebar)
            setConversations(prev => {
                const exists = prev.find(c => c._id === conversation._id);
                let newList = [];
                if (exists) {
                    newList = prev.map(c => c._id === conversation._id ? conversation : c);
                } else {
                    newList = [conversation, ...prev];
                }
                // Sort by last message time
                return newList.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
            });

            // Update messages in current chat if it is active
            if (message && activeConv && activeConv._id === (message.conversation_id?._id || message.conversation_id)) {
                setMessages(prev => {
                    if (prev.find(m => m._id === message._id)) return prev; // Avoid duplicate
                    return [...prev, message];
                });
            }
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [activeConv]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    // Auto-open user picker if no conversations yet
    useEffect(() => {
        if (!loading && conversations.length === 0) {
            setShowUserPicker(true);
        }
    }, [loading, conversations.length]);

    // Handle ?user= param — auto-open conversation window with that user
    useEffect(() => {
        if (!allUsers.length) return;
        const queryParams = new URLSearchParams(location.search);
        const targetUserId = queryParams.get('user');
        if (!targetUserId) return;

        // Check if existing conversation with this user
        const existingConv = conversations.find(c =>
            c.participants?.some(p => (p.user?._id || p.user) === targetUserId)
        );

        if (existingConv) {
            setActiveConv(existingConv);
            setShowUserPicker(false);
        } else {
            // No existing — find them in allUsers and open a new chat window
            const targetUser = allUsers.find(u => u._id === targetUserId);
            if (targetUser) {
                handleStartChat(targetUser);
            }
        }
    }, [allUsers, location.search]);

    useEffect(() => {
        if (activeConv) {
            initialLoadRef.current = true;
            fetchMessages(activeConv._id);
        }
    }, [activeConv]);

    useEffect(() => {
        if (initialLoadRef.current) {
            if (messages.length > 0) {
                // Instantly scroll to bottom on first load
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
                initialLoadRef.current = false;
            }
            return;
        }

        // Smooth scroll for subsequent messages (like new replies)
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await axios.get('/api/messages/conversations', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            if (Array.isArray(res.data)) {
                setConversations(res.data);
                if (res.data.length > 0 && !activeConv) {
                    const queryParams = new URLSearchParams(location.search);
                    const convId = queryParams.get('conversation');

                    if (convId) {
                        const found = res.data.find(c => c._id === convId);
                        if (found) {
                            setActiveConv(found);
                        } else {
                            setActiveConv(res.data[0]);
                        }
                    } else {
                        setActiveConv(res.data[0]);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get('/api/users', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            if (Array.isArray(res.data)) {
                setAllUsers(res.data);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchMessages = async (id) => {
        setMessagesLoading(true);
        try {
            const res = await axios.get(`/api/messages/${id}`);
            if (res.data && Array.isArray(res.data.messages)) {
                setMessages(res.data.messages);
            }
            // Update active conversation status locally if it changed
            if (res.data.conversation.status !== activeConv?.status) {
                setActiveConv(res.data.conversation);
                setConversations(prev =>
                    prev.map(c => c._id === id ? res.data.conversation : c)
                );
            }
            // Auto-mark any unread notifications linked to this conversation
            const related = notifications.filter(
                n => !n.is_read && n.link && n.link.includes(id)
            );
            related.forEach(n => markAsRead(n._id));
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleStartChat = async (targetUser) => {
        const existing = conversations.find(c =>
            c.participants.some(p => (p.user?._id || p.user) === targetUser._id)
        );

        if (existing) {
            setActiveConv(existing);
            setShowUserPicker(false);
        } else {
            setActiveConv({
                _id: 'new',
                participants: [
                    { user: user, on_model: 'User' },
                    { user: targetUser, on_model: 'User' }
                ],
                status: 'pending',
                initiator_id: user.id
            });
            setMessages([]);
            setShowUserPicker(false);
        }
    };

    const handleSendMessage = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const isCustom = e && e.custom;
        const msgText = isCustom ? e.message : newMessage;
        const otherParticipant = activeConv?.participants?.find(p => (p.user?._id || p.user)?.toString() !== (user.id || user._id)?.toString());
        const targetReceiverId = isCustom ? e.receiver_id : (otherParticipant?.user?._id || otherParticipant?.user);
        const targetModel = isCustom ? (e.receiver_model || 'User') : (otherParticipant?.on_model || 'User');

        if (!msgText.trim() || !targetReceiverId) return;

        try {
            const res = await axios.post('/api/messages', {
                receiver_id: targetReceiverId,
                receiver_model: targetModel,
                message: msgText,
                conversation_id: isCustom ? undefined : (activeConv?._id === 'new' ? undefined : activeConv?._id)
            });

            const returnedConv = res.data.conversation;
            const returnedMsg = res.data.message || res.data;

            if (!isCustom) {
                setMessages(prev => [...prev, returnedMsg]);
                setNewMessage('');
            }

            if (returnedConv) {
                setActiveConv(returnedConv);
                setConversations(prev => {
                    const exists = prev.find(c => c._id === returnedConv._id);
                    if (exists) return prev.map(c => c._id === returnedConv._id ? returnedConv : c);
                    return [returnedConv, ...prev];
                });
            }

            if (isCustom) fetchConversations();
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const handleRespond = async (status) => {
        if (!activeConv) return;
        try {
            const res = await axios.patch(`/api/messages/respond/${activeConv._id}`, { status });
            const updatedConv = res.data;
            setActiveConv(updatedConv);
            setConversations(prev => prev.map(c => c._id === activeConv._id ? updatedConv : c));
            fetchMessages(activeConv._id);
        } catch (err) {
            console.error('Error responding to request:', err);
        }
    };

    const handleRespondToOffer = async (id, status) => {
        try {
            await axios.patch(`/api/messages/offer/${id}`, { status });
            if (activeConv) fetchMessages(activeConv._id);
        } catch (err) {
            console.error('Error responding to offer:', err);
            alert(err.response?.data?.message || 'Error responding to offer');
        }
    };

    const handleToggleBlock = async () => {
        if (!activeConv) return;

        const isBlocked = activeConv.blocked_by?.includes(user.id || user._id);
        const confirmMsg = isBlocked
            ? t('profile.confirm_unblock', 'Are you sure you want to unblock this conversation?')
            : t('profile.confirm_block', 'Are you sure you want to block this user? They will not be able to send you messages.');

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await axios.patch(`/api/messages/block/${activeConv._id}`);
            setActiveConv(res.data);
            setConversations(prev => prev.map(c => c._id === activeConv._id ? res.data : c));
        } catch (err) {
            console.error('Error toggling block:', err);
        }
    };

    const getOtherParticipant = (conv) => {
        if (!conv || !conv.participants) return null;
        const currentUserId = (user.id || user._id)?.toString();
        return conv.participants.find(p => (p.user?._id || p.user)?.toString() !== currentUserId);
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatLastSeen = (date) => {
        if (!date) return 'a long time ago';
        const now = new Date();
        const then = new Date(date);
        const diffMs = now - then;

        // Handle future timestamps (clock skew) — treat as online now
        if (diffMs < 0) return 'Active now';

        const diffSecs = Math.floor(diffMs / 1000);
        if (diffSecs < 30) return 'Active now';
        if (diffSecs < 90) return 'Just now';

        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks < 5) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;

        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;

        // Older than a year — show the actual date
        return then.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const filteredUsers = allUsers.filter(u =>
        u.username?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    const filteredConversations = conversations.filter(conv => {
        const otherData = getOtherParticipant(conv);
        const other = otherData?.user;
        const nameToSearch = (otherData?.on_model === 'Admin' ? 'Admin' : (other?.username || other?.name || ''))?.toLowerCase();
        return nameToSearch.includes(searchTerm.toLowerCase());
    });

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    // Handle empty state inside the chat area, but always show the sidebar

    return (
        <div className="pd-messages-container">
            {/* User Picker Overlay */}
            {showUserPicker && (
                <div className="pd-user-picker-overlay" onClick={() => { setShowUserPicker(false); setUserSearchTerm(''); }}>
                    <div className="pd-user-picker-panel" onClick={e => e.stopPropagation()}>
                        <div className="pd-user-picker-header">
                            <span>{t('profile.new_message', 'New Message')}</span>
                            <button className="pd-user-picker-close" onClick={() => { setShowUserPicker(false); setUserSearchTerm(''); }}>✕</button>
                        </div>
                        <div className="pd-user-picker-search">
                            <input
                                type="text"
                                autoFocus
                                placeholder={t('profile.search_users', 'Search users...')}
                                className="pd-msg-search-input"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="pd-user-picker-list">
                            {filteredUsers.length > 0 ? filteredUsers.map(u => {
                                const existingConv = conversations.find(c =>
                                    c.participants.some(p => (p.user?._id || p.user) === u._id)
                                );
                                const isPending = existingConv && existingConv.status === 'pending';
                                return (
                                    <div key={u._id} className="pd-user-picker-item">
                                        <div className="pd-avatar-wrapper-mini" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', width: '36px', height: '36px' }}>
                                            <div className="pd-avatar-placeholder-mini" style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>
                                                {safeString(u.username)?.charAt(0).toUpperCase()}
                                            </div>
                                            {u.profile_image && (
                                                <img
                                                    src={getImageUrl(u.profile_image)}
                                                    alt={u.username}
                                                    className="pd-msg-user-avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                    onError={handleImageError}
                                                />
                                            )}
                                        </div>
                                        <div className="pd-msg-user-info flex-grow-1">
                                            <span className="pd-msg-user-name">{safeString(u.username)}</span>
                                        </div>
                                        {isPending ? (
                                            <span className="pd-picker-status-pill pending">{t('profile.pending', 'Pending')}</span>
                                        ) : existingConv ? (
                                            <button
                                                className="pd-picker-action-btn open"
                                                onClick={() => { setActiveConv(existingConv); setShowUserPicker(false); setUserSearchTerm(''); }}
                                            >
                                                {t('profile.open', 'Open')}
                                            </button>
                                        ) : (
                                            <button
                                                className="pd-picker-action-btn request"
                                                onClick={() => {
                                                    handleSendMessage({
                                                        preventDefault: () => { },
                                                        custom: true,
                                                        receiver_id: u._id,
                                                        receiver_model: u.on_model || 'User',
                                                        message: 'Hello! I would like to start a conversation.'
                                                    });
                                                    setShowUserPicker(false);
                                                    setUserSearchTerm('');
                                                }}
                                            >
                                                {t('profile.send_request', 'Message')}
                                            </button>
                                        )}
                                    </div>
                                );
                            }) : <div className="p-4 text-center text-muted small">No users found</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Chat List Sidebar */}
            <div className={`pd-msg-sidebar ${mobileChatOpen ? 'mobile-hidden' : ''}`}>
                <div className="pd-msg-sidebar-header">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3>{t('user_menu.messages', 'Messages')}</h3>
                        <button
                            className="pd-msg-new-btn"
                            title={t('profile.new_message', 'New message')}
                            onClick={() => setShowUserPicker(true)}
                        >
                            <FaPlus size={14} />
                        </button>
                    </div>
                    <div className="pd-msg-search-box">
                        <input
                            type="text"
                            placeholder={t('profile.search_chats', 'Search chats...')}
                            className="pd-msg-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="pd-msg-user-list">
                    {activeConv?._id === 'new' && (
                        <div className="pd-msg-user-item active draft">
                            <div className="pd-avatar-wrapper-mini" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', width: '36px', height: '36px' }}>
                                {(() => {
                                    const otherData = getOtherParticipant(activeConv);
                                    const other = otherData?.user;
                                    return (
                                        <>
                                            <div className="pd-avatar-placeholder-mini" style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>
                                                {safeString(other?.username || other?.name)?.charAt(0).toUpperCase()}
                                            </div>
                                            {other?.profile_image && (
                                                <img
                                                    src={getImageUrl(other.profile_image)}
                                                    alt=""
                                                    className="pd-msg-user-avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                    onError={handleImageError}
                                                />
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="pd-msg-user-info">
                                <div className="pd-msg-user-top">
                                    <span className="pd-msg-user-name">
                                        {(() => {
                                            const otherData = getOtherParticipant(activeConv);
                                            return otherData?.on_model === 'Admin' ? 'Admin' : (safeString(otherData?.user?.username || otherData?.user?.name) || 'New Chat');
                                        })()}
                                    </span>
                                </div>
                                <div className="pd-msg-last-text text-primary small">Starting new chat...</div>
                            </div>
                        </div>
                    )}
                    {filteredConversations.length > 0 ? filteredConversations.map(conv => {
                        const otherData = getOtherParticipant(conv);
                        const other = otherData?.user;
                        const lm = conv.last_message || '';
                        const isSystemConv = otherData?.on_model === 'Admin' || (!other && lm.includes('ORDER_NOTIFICATION'));
                        const marketplaceName = getMarketplaceName(settings?.site_name);
                        const displayName = otherData?.on_model === 'Admin' ? marketplaceName : (safeString(other?.username) || marketplaceName);
                        const siteLogo = settings?.site_favicon || settings?.site_logo;
                        const siteInitial = marketplaceName.charAt(0).toUpperCase();
                        return (
                            <div
                                key={conv._id}
                                className={`pd-msg-user-item ${activeConv?._id === conv._id ? 'active' : ''}`}
                                onClick={() => { setActiveConv(conv); setMobileChatOpen(true); }}
                            >
                                <div className="pd-avatar-wrapper-mini" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', width: '36px', height: '36px' }}>
                                    {isSystemConv ? (
                                        siteLogo ? (
                                            <img src={getImageUrl(siteLogo)} alt={displayName} className="pd-msg-user-avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="pd-avatar-placeholder-mini" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary-color, #0ea5e9)', color: 'white' }}>{siteInitial}</div>
                                        )
                                    ) : (
                                        <>
                                            <div className="pd-avatar-placeholder-mini" style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>
                                                {safeString(other?.username)?.charAt(0).toUpperCase()}
                                            </div>
                                            {other?.profile_image && (
                                                <img
                                                    src={getImageUrl(other.profile_image)}
                                                    alt={other.username}
                                                    className="pd-msg-user-avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                    onError={handleImageError}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="pd-msg-user-info">
                                    <div className="pd-msg-user-top">
                                        <span className="pd-msg-user-name" style={{ fontWeight: conv.unread_count > 0 ? '800' : '700' }}>{displayName}</span>
                                        <span className="pd-msg-last-time" style={{ color: conv.unread_count > 0 ? 'var(--primary-color, #3b82f6)' : '#94a3b8' }}>{conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div className="pd-msg-last-text">
                                        {(() => {
                                            const lm = conv.last_message || '';
                                            if (lm.startsWith('WITHDRAWAL_REQUEST::')) {
                                                try {
                                                    const data = JSON.parse(lm.replace('WITHDRAWAL_REQUEST::', ''));
                                                    return `Withdrawal Request: ${data.amount}`;
                                                } catch (e) { return 'Withdrawal Request'; }
                                            }
                                            if (lm.startsWith('ORDER_NOTIFICATION::')) {
                                                try {
                                                    const data = JSON.parse(lm.replace('ORDER_NOTIFICATION::', ''));
                                                    return data.type === 'order_delivered' ? `Delivered: ${data.item_title}` : `New Order: ${data.item_title}`;
                                                } catch (e) { return 'Order Notification'; }
                                            }
                                            return safeString(lm);
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {conv.status !== 'accepted' && (
                                            <span className={`pd-msg-status ${conv.status}`}>{conv.status.toUpperCase()}</span>
                                        )}
                                        {conv.unread_count > 0 && <div className="pd-msg-unread-dot" />}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="pd-msg-empty-chats">
                            <div className="pd-msg-empty-icon">💬</div>
                            <p>{t('profile.no_chats', 'No conversations yet')}</p>
                            <button className="pd-msg-start-btn" onClick={() => setShowUserPicker(true)}>
                                + {t('profile.start_chat', 'Start a chat')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={`pd-msg-chat-window ${mobileChatOpen ? 'mobile-visible' : ''}`}>
                {activeConv ? (
                    <>
                        {/* Chat Header */}
                        {(() => {
                            const hasSystemMsgs = messages.some(m => m.message_type === 'system');
                            const headerSiteName = getMarketplaceName(settings?.site_name);
                            const headerSiteLogo = settings?.site_favicon || settings?.site_logo;
                            const headerOtherData = getOtherParticipant(activeConv);
                            const headerOther = headerOtherData?.user;
                            const headerOtherOnModel = headerOtherData?.on_model;
                            const isMarketplace = headerOtherOnModel === 'Admin' || (!headerOther && hasSystemMsgs);
                            const headerSiteInitial = headerSiteName.charAt(0).toUpperCase();

                            return (
                                <div className="pd-msg-chat-header">
                                    <button className="pd-msg-back-btn" onClick={() => { setMobileChatOpen(false); setActiveConv(null); }}>
                                        <FaArrowLeft />
                                    </button>
                                    <div className="pd-avatar-wrapper-mini" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '50%', overflow: 'hidden', width: '36px', height: '36px' }}>
                                        {isMarketplace ? (
                                            headerSiteLogo ? (
                                                <img src={getImageUrl(headerSiteLogo)} alt={headerSiteName} className="pd-msg-user-avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div className="pd-avatar-placeholder-mini" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary-color, #0ea5e9)', color: 'white', fontSize: '14px' }}>
                                                    {headerSiteInitial}
                                                </div>
                                            )
                                        ) : (
                                            <>
                                                <div className="pd-avatar-placeholder-mini" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>
                                                    {safeString(headerOther?.username)?.charAt(0).toUpperCase()}
                                                </div>
                                                {headerOther?.profile_image && (
                                                    <img
                                                        src={getImageUrl(headerOther.profile_image)}
                                                        alt=""
                                                        className="pd-msg-user-avatar"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                                        onError={handleImageError}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="pd-msg-user-meta">
                                        <div className="fw-bold">{isMarketplace ? headerSiteName : safeString(headerOther?.username)}</div>
                                        {isMarketplace ? (
                                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{headerOtherOnModel === 'Admin' ? 'Official Support' : 'Order Notifications'}</div>
                                        ) : (
                                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                {t('profile.last_seen', 'Last seen')}: {formatLastSeen(headerOther?.last_login)}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`pd-msg-status ${activeConv.status} ms-3`}>
                                        {hasSystemMsgs
                                            ? (headerOtherOnModel === 'Admin' ? 'OFFICIAL SUPPORT' : 'ORDER UPDATES')
                                            : activeConv.status === 'accepted' ? 'DIRECT MESSAGE' : `REQUEST: ${activeConv.status.toUpperCase()}`}
                                    </div>

                                    {!hasSystemMsgs && (
                                        <div className="ms-auto d-flex align-items-center gap-2">
                                            <button
                                                className={`pd-msg-header-btn ${activeConv.blocked_by?.includes(user.id || user._id) ? 'text-danger' : 'text-muted'}`}
                                                onClick={handleToggleBlock}
                                                title={activeConv.blocked_by?.includes(user.id || user._id) ? 'Unblock' : 'Block'}
                                            >
                                                <FaBan />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Request Banner — pending, recipient sees Accept/Reject */}
                        {activeConv.status === 'pending' &&
                            (activeConv.initiator_id?._id || activeConv.initiator_id)?.toString() !== (user._id || user.id)?.toString() && (
                                <div className="pd-msg-request-bar">
                                    <div className="pd-msg-request-text">
                                        <strong>{safeString(getOtherParticipant(activeConv)?.username)}</strong> sent you a message request.
                                    </div>
                                    <div className="pd-msg-action-btns">
                                        <button className="pd-msg-btn accept" onClick={() => handleRespond('accepted')}><FaCheck /> Accept</button>
                                        <button className="pd-msg-btn reject" onClick={() => handleRespond('rejected')}><FaTimes /> Decline</button>
                                    </div>
                                </div>
                            )}

                        {/* Rejected Banner — different UI for initiator vs recipient */}
                        {activeConv.status === 'rejected' && (() => {
                            const isInitiator = (activeConv.initiator_id?._id || activeConv.initiator_id)?.toString() === (user._id || user.id)?.toString();
                            return isInitiator ? (
                                <div className="pd-msg-rejected-banner initiator">
                                    <div className="pd-rejected-icon">✗</div>
                                    <div className="pd-rejected-body">
                                        <p className="pd-rejected-title">Your request was declined</p>
                                        <p className="pd-rejected-sub">{safeString(getOtherParticipant(activeConv)?.username)} declined your message request. Only they can accept the conversation now.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="pd-msg-rejected-banner recipient">
                                    <div className="pd-rejected-icon">✗</div>
                                    <div className="pd-rejected-body">
                                        <p className="pd-rejected-title">You declined this request</p>
                                        <p className="pd-rejected-sub">You can change your mind and accept the conversation.</p>
                                        <button className="pd-rejected-accept-btn" onClick={() => handleRespond('accepted')}>
                                            <FaCheck /> Accept Conversation
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Blocked Alert */}
                        {activeConv.blocked_by?.length > 0 && (
                            <div className="pd-msg-blocked-bar">
                                <FaBan />
                                <span>
                                    {activeConv.blocked_by.some(id => id?.toString() === (user._id || user.id)?.toString())
                                        ? 'You have blocked this conversation.'
                                        : 'This conversation is blocked by the other user.'}
                                </span>
                            </div>
                        )}

                        {/* Messages List */}
                        <div className="pd-msg-chat-messages" ref={messagesContainerRef}>
                            {messagesLoading ? (
                                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                            ) : (
                                <>
                                    {messages.map(msg => {
                                        const isSystem = msg.message_type === 'system';
                                        const senderId = msg.sender_id?._id || msg.sender_id;
                                        const isSent = senderId?.toString() === (user.id || user._id)?.toString();

                                        if (isSystem) {
                                            const siteName = getMarketplaceName(settings?.site_name);
                                            const siteLogo = settings?.site_favicon || settings?.site_logo;
                                            const siteInitial = siteName.charAt(0).toUpperCase();

                                            // Try parsing rich order notification
                                            let msgContent = null;
                                            const isRichOrder = msg.message.startsWith('ORDER_NOTIFICATION::');
                                            if (isRichOrder) {
                                                try {
                                                    const jsonStr = msg.message.replace('ORDER_NOTIFICATION::', '');
                                                    const data = JSON.parse(jsonStr);
                                                    msgContent = (
                                                        <>
                                                            {data.type === 'order_delivered' ? (
                                                                <>
                                                                    <div className="pd-sys-msg-line"><strong>✅ {data.is_bundle ? 'Bundle Delivered' : 'Order Delivered'}</strong></div>
                                                                    <div className="pd-sys-msg-line">
                                                                        {data.is_bundle ? (
                                                                            <span>Bundle of <strong>{data.item_count} items</strong></span>
                                                                        ) : (
                                                                            <span>Item: <strong>{safeString(data.item_title)}</strong></span>
                                                                        )}
                                                                    </div>
                                                                    <div className="pd-sys-msg-line">Order: <span className="pd-sys-msg-code">{data.order_id}</span></div>
                                                                    <div className="pd-sys-msg-line">Your order has been delivered successfully! ⭐ Please rate your experience.</div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="pd-sys-msg-line"><strong>🛒 {data.is_bundle ? 'New Bundle Order' : 'New Order Placed'}</strong></div>
                                                                    <div className="pd-sys-msg-line">
                                                                        {data.is_bundle ? (
                                                                            <span>Bundle of <strong>{data.item_count} items</strong></span>
                                                                        ) : (
                                                                            <span>Item: <strong>{safeString(data.item_title)}</strong></span>
                                                                        )}
                                                                    </div>
                                                                    {data.buyer_name && <div className="pd-sys-msg-line">Buyer: <strong>{safeString(data.buyer_name)}</strong></div>}
                                                                    <div className="pd-sys-msg-line">Order ID: <span className="pd-sys-msg-code">{data.order_id}</span></div>
                                                                    {data.total_amount && <div className="pd-sys-msg-line">Total: <strong>₹{data.total_amount?.toLocaleString()}</strong></div>}
                                                                    {data.payment_method && <div className="pd-sys-msg-line">Payment: {data.payment_method === 'wallet' ? 'Wallet' : 'Card'} ✅</div>}
                                                                </>
                                                            )}
                                                            <button
                                                                className="pd-sys-msg-link"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate('/profile?tab=orders');
                                                                }}
                                                            >
                                                                View Order →
                                                            </button>
                                                        </>
                                                    );
                                                } catch (e) { /* fall through */ }
                                            }

                                            // Withdrawal Request parsing
                                            const isWithdrawal = msg.message.startsWith('WITHDRAWAL_REQUEST::');
                                            if (isWithdrawal && !msgContent) {
                                                try {
                                                    const jsonStr = msg.message.replace('WITHDRAWAL_REQUEST::', '');
                                                    const data = JSON.parse(jsonStr);
                                                    msgContent = (
                                                        <>
                                                            <div className="pd-sys-msg-line"><strong>💰 Withdrawal Request</strong></div>
                                                            <div className="pd-sys-msg-line">Amount: <strong>{formatPrice(data.amount, data.currency_id || data.currency)}</strong></div>
                                                            {data.payout_type && <div className="pd-sys-msg-line">Method: <span className="text-capitalize">{data.payout_type.replace('_', ' ')}</span></div>}
                                                            <div className="pd-sys-msg-line">Request ID: <span className="pd-sys-msg-code">{data.request_id || data._id}</span></div>
                                                            <div className="pd-sys-msg-line mt-2 text-muted small">Your request is being processed.</div>
                                                            <button
                                                                className="pd-sys-msg-link"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate('/profile?tab=wallet');
                                                                }}
                                                            >
                                                                View Wallet →
                                                            </button>
                                                        </>
                                                    );
                                                } catch (e) { /* fall through */ }
                                            }

                                            // Legacy plain-text system messages
                                            if (!msgContent) {
                                                const itemMatch = msg.message.match(/Item "([^"]+)"/);
                                                const orderIdMatch = msg.message.match(/Order ID: (ORD-[\w-]+)/);
                                                const purchasedMatch = msg.message.match(/purchased by ([^.]+)/);
                                                msgContent = (
                                                    <>
                                                        {itemMatch && <div className="pd-sys-msg-line"><strong>🛒 {safeString(itemMatch[1])}</strong></div>}
                                                        {purchasedMatch?.[1] && <div className="pd-sys-msg-line">Buyer: {safeString(purchasedMatch[1])}</div>}
                                                        {orderIdMatch && <div className="pd-sys-msg-line">Order: <span className="pd-sys-msg-code">{orderIdMatch[1]}</span></div>}
                                                        {!itemMatch && <div className="pd-sys-msg-line">{safeString(msg.message)}</div>}
                                                        {orderIdMatch && (
                                                            <button
                                                                className="pd-sys-msg-link"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate('/profile?tab=orders');
                                                                }}
                                                            >
                                                                View Order →
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            }

                                            return (
                                                <div key={msg._id} className="pd-sys-msg-wrapper">
                                                    <div className="pd-sys-msg-avatar">
                                                        {siteLogo ? (
                                                            <img src={getImageUrl(siteLogo)} alt={siteName} className="pd-sys-msg-avatar-img" />
                                                        ) : (
                                                            <div className="pd-sys-msg-avatar-placeholder">{siteInitial}</div>
                                                        )}
                                                    </div>
                                                    <div className="pd-sys-msg-content">
                                                        <div className="pd-sys-msg-sender">{siteName}</div>
                                                        <div className="pd-sys-msg-bubble">
                                                            {msgContent}
                                                            <div className="pd-sys-msg-time">{formatTime(msg.created_at)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (msg.message_type === 'offer') {
                                            return (
                                                <div key={msg._id} className={`pd-msg-bubble offer-bubble ${isSent ? 'sent' : 'received'}`}>
                                                    <div className="offer-bubble-header">
                                                        <strong>{isSent ? 'You made an offer' : 'Offer received'}</strong>
                                                    </div>
                                                    <div className="offer-bubble-price">
                                                        {formatPrice(msg.offer_amount || 0, activeConv?.item_id?.currency_id || activeConv?.item_id)}
                                                    </div>
                                                    {msg.message && !msg.message.startsWith('💰 Offer:') && (
                                                        <div className="offer-bubble-text">"{safeString(msg.message)}"</div>
                                                    )}

                                                    <div className="offer-bubble-status mt-2">
                                                        {msg.offer_status === 'pending' ? (
                                                            isSent ? (
                                                                <span className="text-muted small">Awaiting response...</span>
                                                            ) : (
                                                                <div className="offer-action-btns d-flex gap-2 mt-2">
                                                                    <button className="btn btn-sm btn-success" onClick={() => handleRespondToOffer(msg._id, 'accepted')}>Accept</button>
                                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleRespondToOffer(msg._id, 'declined')}>Decline</button>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className={`offer-status-badge ${msg.offer_status}`}>
                                                                {msg.offer_status === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="pd-msg-bubble-time">{formatTime(msg.created_at)}</div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={msg._id} className={`pd-msg-bubble ${isSent ? 'sent' : 'received'}`}>
                                                {safeString(msg.message)}
                                                <div className="pd-msg-bubble-time">{formatTime(msg.created_at)}</div>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area — only when accepted, not blocked, and NOT a system/marketplace conversation */}
                        {activeConv.status === 'accepted' &&
                            !(activeConv.blocked_by?.length > 0) &&
                            !messages.some(m => m.message_type === 'system') && (
                                <div className="pd-msg-input-area">
                                    <form className="pd-msg-form" onSubmit={handleSendMessage}>
                                        <input
                                            type="text"
                                            className="pd-msg-input"
                                            placeholder={t('profile.type_message', 'Type a message...')}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                        />
                                        <button type="submit" className="pd-msg-send-btn" disabled={!newMessage.trim()}>
                                            <FaPaperPlane />
                                        </button>
                                    </form>
                                </div>
                            )}
                    </>
                ) : (
                    <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted">
                        <FaEnvelope size={48} className="mb-3 opacity-25" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesContent;
