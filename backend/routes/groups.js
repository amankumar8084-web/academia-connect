import express from 'express';
import { protect } from '../middleware/auth.js';
import Group from '../models/Group.js';
import GroupMessage from '../models/GroupMessage.js';
import User from '../models/User.js';

const router = express.Router();

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, description, memberIds } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        // Ensure creator is always in members
        const uniqueMembers = [...new Set([req.user.id, ...(memberIds || [])])];

        const group = await Group.create({
            name: name.trim(),
            description: description?.trim() || '',
            creator: req.user.id,
            members: uniqueMembers,
        });

        // Populate members for the response
        const populated = await Group.findById(group._id)
            .populate('members', 'name email profilePicture role department')
            .populate('creator', 'name email profilePicture');

        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/groups
// @desc    Get all groups the current user belongs to
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user.id })
            .populate('members', 'name email profilePicture role department')
            .populate('creator', 'name email profilePicture')
            .sort({ updatedAt: -1 });

        // For each group, get the last message
        const groupsWithMeta = await Promise.all(groups.map(async (g) => {
            const lastMessage = await GroupMessage.findOne({ group: g._id })
                .sort({ createdAt: -1 })
                .populate('sender', 'name')
                .lean();

            return {
                ...g.toObject(),
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    time: lastMessage.createdAt,
                    senderName: lastMessage.sender?.name || 'Unknown',
                } : null,
            };
        }));

        res.json(groupsWithMeta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/groups/:id/messages
// @desc    Get messages for a group
// @access  Private (must be a member)
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (!group.members.map(m => m.toString()).includes(req.user.id)) {
            return res.status(403).json({ message: 'Not a member of this group' });
        }

        const messages = await GroupMessage.find({ group: req.params.id })
            .populate('sender', 'name email profilePicture')
            .sort({ createdAt: 1 })
            .lean();

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/groups/:id/messages
// @desc    Send a message to a group
// @access  Private (must be a member)
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content?.trim()) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (!group.members.map(m => m.toString()).includes(req.user.id)) {
            return res.status(403).json({ message: 'Not a member of this group' });
        }

        const message = await GroupMessage.create({
            group: req.params.id,
            sender: req.user.id,
            content: content.trim(),
        });

        const populated = await GroupMessage.findById(message._id)
            .populate('sender', 'name email profilePicture')
            .lean();

        // Update group's updatedAt so it sorts to top
        group.updatedAt = new Date();
        await group.save();

        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
