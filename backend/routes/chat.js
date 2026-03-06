import express from 'express';
import { protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// @route   GET /api/chat/users
// @desc    Get all users (for contact list, excluding current user)
// @access  Private
router.get('/users', protect, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } })
            .select('name email role department profilePicture phone domain regNo')
            .sort({ name: 1 });

        // For each user, get the latest message and unread count
        const usersWithMeta = await Promise.all(users.map(async (u) => {
            const lastMessage = await Message.findOne({
                $or: [
                    { sender: req.user.id, receiver: u._id },
                    { sender: u._id, receiver: req.user.id },
                ],
            }).sort({ createdAt: -1 }).lean();

            const unreadCount = await Message.countDocuments({
                sender: u._id,
                receiver: req.user.id,
                read: false,
            });

            return {
                _id: u._id,
                name: u.name || u.email?.split('@')[0] || 'User',
                email: u.email,
                role: u.role,
                department: u.department,
                phone: u.phone,
                domain: u.domain,
                regNo: u.regNo,
                profilePicture: u.profilePicture,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    time: lastMessage.createdAt,
                    isMine: lastMessage.sender.toString() === req.user.id,
                } : null,
                unreadCount,
            };
        }));

        // Sort: users with messages first (by last message time), then others
        usersWithMeta.sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        res.json(usersWithMeta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/chat/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get('/messages/:userId', protect, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user.id },
            ],
        }).sort({ createdAt: 1 }).lean();

        // Mark received messages as read
        await Message.updateMany(
            { sender: req.params.userId, receiver: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/chat/messages
// @desc    Send a message
// @access  Private
router.post('/messages', protect, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        if (!receiverId || !content?.trim()) {
            return res.status(400).json({ message: 'Receiver and content required' });
        }

        const message = await Message.create({
            sender: req.user.id,
            receiver: receiverId,
            content: content.trim(),
        });

        res.status(201).json(message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
