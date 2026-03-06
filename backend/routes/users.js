import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { sendCredentialsEmailAsync } from '../utils/mailer.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to generate random password
const generateRandomPassword = () => {
    return crypto.randomBytes(8).toString('hex');
};

// @route   POST /api/users/admin
// @desc    Create an admin user
// @access  Private / Super-Admin
router.post('/admin', protect, authorize('super-admin'), async (req, res) => {
    try {
        const { email, name, department, phone, domain } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const unhashedPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(unhashedPassword, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            role: 'admin',
            name,
            department,
            phone,
            domain,
        });

        if (user) {
            // Send email in background — don't block the response
            sendCredentialsEmailAsync(email, 'Admin', email, unhashedPassword);

            // Auto-create notification
            await Notification.create({
                type: 'user_created',
                message: `New faculty member ${name || email} has been added`,
                actorName: 'Super Admin',
                actorRole: 'super-admin',
            });

            res.status(201).json({
                _id: user._id,
                email: user.email,
                role: user.role,
                message: 'Admin account created. Credentials email is being sent.',
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/student
// @desc    Create a student user
// @access  Private / Admin
router.post('/student', protect, authorize('admin'), async (req, res) => {
    try {
        const { email, name, phone, department, year, regNo, domain } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const unhashedPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(unhashedPassword, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            role: 'student',
            name,
            phone,
            department,
            year,
            regNo,
            domain,
        });

        if (user) {
            // Send email in background — don't block the response
            sendCredentialsEmailAsync(email, 'Student', email, unhashedPassword);

            // Auto-create notification
            const creator = await User.findById(req.user.id).select('name');
            await Notification.create({
                type: 'user_created',
                message: `New student ${email} has been added by ${creator?.name || 'faculty'}`,
                actorName: creator?.name || 'Faculty',
                actorRole: 'admin',
            });

            res.status(201).json({
                _id: user._id,
                email: user.email,
                role: user.role,
                message: 'Student account created. Credentials email is being sent.',
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/stats
// @desc    Get dashboard stats
// @access  Private / Super-Admin
router.get('/stats', protect, authorize('super-admin'), async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'student' });
        const facultyCount = await User.countDocuments({ role: 'admin' });

        // Count unique departments
        const departments = await User.distinct('department', { department: { $ne: null, $ne: '' } });
        const departmentCount = departments.length;

        // Activities could be anything, but for now we'll return a placeholder or 0
        const activityCount = 0;

        res.json({
            students: studentCount,
            faculty: facultyCount,
            departments: departmentCount,
            activities: activityCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/role/:role
// @desc    Get users by role
// @access  Private / Super-Admin & Admin
router.get('/role/:role', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const users = await User.find({ role: req.params.role }).select('-password');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/:id/students
// @desc    Get students managed by a faculty member (same dept & domain)
// @access  Private / Super-Admin & Admin
router.get('/:id/students', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const faculty = await User.findById(req.params.id).select('-password');
        if (!faculty || faculty.role !== 'admin') {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        const query = { role: 'student' };
        // Match students by domain if faculty has one
        if (faculty.domain) {
            const domains = faculty.domain.split(',').map(d => d.trim()).filter(Boolean);
            if (domains.length > 0) {
                // Escape special Regex characters for each domain and join with OR pattern
                const escapedDomains = domains.map(d => d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
                query.domain = { $regex: escapedDomains.join('|'), $options: 'i' };
            } else {
                // Fallback to strict match if parsing fails
                query.domain = faculty.domain;
            }
        } else if (faculty.department) {
            query.department = faculty.department;
        }

        const students = await User.find(query).select('-password').sort({ name: 1 });
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/departments/all
// @desc    Get all departments with their domains
// @access  Private / Super-Admin
router.get('/departments/all', protect, authorize('super-admin'), async (req, res) => {
    try {
        const departmentsWithDomains = await User.aggregate([
            { $match: { department: { $ne: null, $ne: '' } } },
            {
                $group: {
                    _id: "$department",
                    domains: { $addToSet: "$domain" }
                }
            },
            {
                $project: {
                    name: "$_id",
                    domains: {
                        $filter: {
                            input: "$domains",
                            as: "domain",
                            cond: { $and: [{ $ne: ["$$domain", null] }, { $ne: ["$$domain", ""] }] }
                        }
                    },
                    _id: 0
                }
            }
        ]);
        res.json(departmentsWithDomains);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/domain/:domain
// @desc    Get students and faculty for a specific domain
// @access  Private / Super-Admin
router.get('/domain/:domain', protect, authorize('super-admin'), async (req, res) => {
    try {
        const domain = req.params.domain;

        // Students assigned to this domain
        const students = await User.find({
            role: 'student',
            domain: domain
        }).select('-password');

        // Faculty assigned to this domain
        const faculty = await User.find({
            role: 'admin',
            domain: domain
        }).select('-password');

        res.json({ students, faculty });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private / Super-Admin
router.delete('/:id', protect, authorize('super-admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'super-admin') {
            return res.status(403).json({ message: 'Cannot delete super-admin' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/admin/:id/replace
// @desc    Replace a faculty member — delete old, create new
// @access  Private / Super-Admin
router.post('/admin/:id/replace', protect, authorize('super-admin'), async (req, res) => {
    try {
        const oldUser = await User.findById(req.params.id);
        if (!oldUser || oldUser.role !== 'admin') {
            return res.status(404).json({ message: 'Faculty member not found' });
        }

        const { email, name, department, phone, domain } = req.body;

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Delete old faculty
        await User.findByIdAndDelete(req.params.id);

        // Create replacement
        const unhashedPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(unhashedPassword, salt);

        const newUser = await User.create({
            email,
            password: hashedPassword,
            role: 'admin',
            name,
            department,
            phone,
            domain,
        });

        if (newUser) {
            sendCredentialsEmailAsync(email, 'Admin', email, unhashedPassword);

            await Notification.create({
                type: 'user_created',
                message: `Faculty ${oldUser.name || oldUser.email} replaced by ${name || email}`,
                actorName: 'Super Admin',
                actorRole: 'super-admin',
            });

            res.status(201).json({
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                message: 'Faculty replaced. Credentials email is being sent to the new member.',
            });
        } else {
            res.status(400).json({ message: 'Failed to create replacement' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
