import asyncHandler from 'express-async-handler';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

const participantsPopulate = {
    path: 'participants.user',
    select: 'name username profile_image last_login'
};

const getConversations = asyncHandler(async (req, res) => {
    const identifier = req.user._id;
    console.log(`[Admin getConversations] identifier: ${identifier}`);

    // Fetch all conversations for the admin view
    const query = {}; 

    const conversations = await Conversation.find(query)
        .populate(participantsPopulate)
        .populate('item_id', 'title price images')
        .sort({ last_message_at: -1 });
    
    console.log(`[Admin getConversations] Found: ${conversations.length}`);

    res.status(200).json(conversations);
});

const getMessages = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id)
        .populate(participantsPopulate);

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    // Admin override: Admins can view any conversation
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.isAdmin === true);

    const isParticipant = isAdmin || conversation.participants.some(p => {
        const pId = p.user._id ? p.user._id.toString() : (p.user ? p.user.toString() : null);
        return pId === req.user._id.toString();
    });

    if (!isParticipant) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const messages = await Message.find({ conversation_id: req.params.id })
        .populate('sender_id', 'name username profile_image')
        .sort({ created_at: 1 });

    res.status(200).json({
        conversation,
        messages
    });
});

const sendMessage = asyncHandler(async (req, res) => {
    const { receiver_id, receiver_model = 'User', message, item_id } = req.body;

    if (!receiver_id || !message) {
        res.status(400);
        throw new Error('Please add receiver and message');
    }

    const sender_id = req.user._id;
    const sender_model = req.user.role === 'admin' ? 'Admin' : 'User';

    let conversation = await Conversation.findOne({
        participants: {
            $all: [
                { $elemMatch: { user: sender_id, on_model: sender_model } },
                { $elemMatch: { user: receiver_id, on_model: receiver_model } }
            ]
        },
    });

    let isNewRequest = false;

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [
                { user: sender_id, on_model: sender_model },
                { user: receiver_id, on_model: receiver_model }
            ],
            item_id: item_id,
            status: sender_model === 'Admin' ? 'accepted' : 'pending',
            initiator_id: sender_id,
            initiator_model: sender_model,
            last_message: message,
            last_message_at: Date.now(),
        });
        isNewRequest = true;
    } else {
        if (conversation.blocked_by && conversation.blocked_by.length > 0) {
            res.status(403);
            throw new Error('This conversation is blocked.');
        }

        if (conversation.status === 'rejected') {
            res.status(403);
            throw new Error('This message request was declined.');
        }

        conversation.last_message = message;
        conversation.last_message_at = Date.now();
        await conversation.save();
    }

    const newMessage = await Message.create({
        conversation_id: conversation._id,
        sender_id: sender_id,
        sender_model: sender_model,
        receiver_id: receiver_id,
        receiver_model: receiver_model,
        message: message,
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender_id', 'name username profile_image');

    // Handle Notifications
    if (isNewRequest) {
        await Notification.create({
            user_id: receiver_id,
            on_model: receiver_model,
            title: 'New Message Request',
            message: `${req.user.role === 'admin' ? 'Admin' : (req.user.username || req.user.name)} wants to start a conversation with you.`,
            type: 'request',
            link: receiver_model === 'Admin' ? `/messages` : `/profile?tab=messages&conversation=${conversation._id}`,
        });
    } else if (conversation.status === 'accepted') {
        await Notification.create({
            user_id: receiver_id,
            on_model: receiver_model,
            title: 'New Message',
            message: `You have a new message from ${req.user.role === 'admin' ? 'Admin' : (req.user.username || req.user.name)}`,
            type: 'message',
            link: receiver_model === 'Admin' ? `/messages` : `/profile?tab=messages&conversation=${conversation._id}`,
        });
    }

    res.status(201).json({ message: populatedMessage, conversation });
});

const getMessageCount = asyncHandler(async (req, res) => {
    // Count unread messages received by the admin across all conversations
    const count = await Message.countDocuments({
        receiver_id: req.user._id,
        receiver_model: 'Admin',
        is_read: false
    });
    res.json({ count });
});

export {
    getConversations,
    getMessages,
    sendMessage,
    getMessageCount
};
