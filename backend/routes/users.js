import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Department from '../models/Department.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Notification from '../models/Notification.js';
import StudentUpdate from '../models/StudentUpdate.js';
import { protect, authorize } from '../middleware/auth.js';
import { sendCredentialsEmail } from '../utils/mailer.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to generate random password
const generateRandomPassword = () => {
    return crypto.randomBytes(8).toString('hex');
};

// Helper to validate department and domain
const validateDeptDomain = async (departmentName, domainName) => {
    if (!departmentName) return { valid: false, message: 'Department is required' };
    
    const dept = await Department.findOne({ name: departmentName });
    if (!dept) {
        return { valid: false, message: `Department '${departmentName}' does not exist` };
    }
    
    if (domainName && !dept.domains.includes(domainName)) {
        return { valid: false, message: `Domain '${domainName}' is not valid for department '${departmentName}'` };
    }
    
    return { valid: true };
};

// Helper: get all assignments for a faculty user
const getFacultyAssignments = async (facultyId) => {
    return FacultyAssignment.find({ faculty: facultyId }).lean();
};

// Helper: build student query from all faculty assignments
const buildStudentQueryFromAssignments = (assignments) => {
    if (!assignments || assignments.length === 0) return null;

    const orConditions = assignments.map(a => {
        const cond = { department: a.department };
        if (a.domain) cond.domain = { $regex: a.domain.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' };
        return cond;
    });

    return { role: 'student', $or: orConditions };
};

// Helper: check if a faculty has authority over a student (via any assignment)
const facultyOwnsStudent = async (facultyId, student) => {
    const assignments = await getFacultyAssignments(facultyId);
    if (!assignments || assignments.length === 0) return false;

    for (const a of assignments) {
        // Department must match
        if (a.department && student.department && a.department.toLowerCase() === student.department.toLowerCase()) {
            // If assignment has a domain, check domain overlap
            if (a.domain && student.domain) {
                const sDomains = student.domain.split(',').map(d => d.trim().toLowerCase());
                if (sDomains.includes(a.domain.toLowerCase())) return true;
            } else if (!a.domain) {
                // Assignment has no domain — department-level access
                return true;
            }
        }
    }
    return false;
};

// ═══════════════════════════════════════════════════════════════════
// FACULTY (ADMIN) CREATION — handles duplicate-email-as-new-assignment
// ═══════════════════════════════════════════════════════════════════

// @route   POST /api/users/admin
// @desc    Create an admin user OR add a new assignment to existing admin
// @access  Private / Super-Admin
router.post('/admin', protect, authorize('super-admin'), async (req, res) => {
    try {
        const { email, name, department, phone, domain } = req.body;

        // Validate department/domain
        const validation = await validateDeptDomain(department, domain);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const existingUser = await User.findOne({ email });

        // ─── Case 1: User already exists ───
        if (existingUser) {
            // Only allow adding assignments to admin users
            if (existingUser.role !== 'admin') {
                return res.status(400).json({ message: `A user with this email already exists with role '${existingUser.role}'` });
            }

            // Check if this exact assignment already exists
            const existingAssignment = await FacultyAssignment.findOne({
                faculty: existingUser._id,
                department,
                domain: domain || '',
            });

            if (existingAssignment) {
                return res.status(400).json({ message: `This faculty is already assigned to ${department}${domain ? ' → ' + domain : ''}` });
            }

            // Create new assignment for existing faculty
            await FacultyAssignment.create({
                faculty: existingUser._id,
                department,
                domain: domain || '',
            });

            // Auto-create notification
            await Notification.create({
                type: 'user_created',
                message: `Faculty ${existingUser.name || email} assigned to new department: ${department}${domain ? ' → ' + domain : ''}`,
                actorName: 'Super Admin',
                actorRole: 'super-admin',
            });

            // Fetch complete assignments list
            const allAssignments = await getFacultyAssignments(existingUser._id);

            res.status(200).json({
                _id: existingUser._id,
                email: existingUser.email,
                role: existingUser.role,
                assignments: allAssignments,
                isNewAssignment: true,
                message: `New assignment added for existing faculty. No new credentials generated.`,
            });
            return;
        }

        // ─── Case 2: Brand new user ───
        const unhashedPassword = generateRandomPassword();        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(unhashedPassword, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            role: 'admin',
            name,
            department,
            phone,
            domain: domain || '',
        });

        if (user) {
            // Create initial FacultyAssignment entry
            await FacultyAssignment.create({
                faculty: user._id,
                department,
                domain: domain || '',
            });

            // Send credentials email
            await sendCredentialsEmail(email, 'Admin', email, unhashedPassword, department, domain, name);

            // Auto-create notification
            await Notification.create({
                type: 'user_created',
                message: `New faculty member ${name || email} has been added`,
                actorName: 'Super Admin',
                actorRole: 'super-admin',
            });

            const allAssignments = await getFacultyAssignments(user._id);

            res.status(201).json({
                _id: user._id,
                email: user.email,
                role: user.role,
                assignments: allAssignments,
                isNewAssignment: false,
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

// ═══════════════════════════════════════════════════════════════════
// FACULTY ASSIGNMENT CRUD
// ═══════════════════════════════════════════════════════════════════

// @route   GET /api/users/admin/:id/assignments
// @desc    Get all assignments for a faculty
// @access  Private / Super-Admin & Admin (self)
router.get('/admin/:id/assignments', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        // Admin can only view their own assignments
        if (req.user.role === 'admin' && req.user.id !== req.params.id) {
            return res.status(403).json({ message: 'You can only view your own assignments' });
        }

        const assignments = await FacultyAssignment.find({ faculty: req.params.id })
            .populate('faculty', 'name email')
            .lean();

        res.json(assignments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/admin/:id/assignments
// @desc    Add a new assignment to an existing faculty
// @access  Private / Super-Admin
router.post('/admin/:id/assignments', protect, authorize('super-admin'), async (req, res) => {
    try {
        const faculty = await User.findById(req.params.id);
        if (!faculty || faculty.role !== 'admin') {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        const { department, domain } = req.body;

        const validation = await validateDeptDomain(department, domain);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        // Check for duplicate
        const existing = await FacultyAssignment.findOne({
            faculty: faculty._id,
            department,
            domain: domain || '',
        });

        if (existing) {
            return res.status(400).json({ message: `This assignment already exists` });
        }

        const assignment = await FacultyAssignment.create({
            faculty: faculty._id,
            department,
            domain: domain || '',
        });

        await Notification.create({
            type: 'user_created',
            message: `Faculty ${faculty.name || faculty.email} assigned to ${department}${domain ? ' → ' + domain : ''}`,
            actorName: 'Super Admin',
            actorRole: 'super-admin',
        });

        const allAssignments = await getFacultyAssignments(faculty._id);
        res.status(201).json({ assignment, allAssignments, message: 'Assignment added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/users/admin/:id/assignments/:assignmentId
// @desc    Remove an assignment from a faculty
// @access  Private / Super-Admin
router.delete('/admin/:id/assignments/:assignmentId', protect, authorize('super-admin'), async (req, res) => {
    try {
        const assignment = await FacultyAssignment.findById(req.params.assignmentId);
        if (!assignment || assignment.faculty.toString() !== req.params.id) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if this is the last assignment — warn but still allow
        const count = await FacultyAssignment.countDocuments({ faculty: req.params.id });

        await FacultyAssignment.findByIdAndDelete(req.params.assignmentId);

        const remaining = await getFacultyAssignments(req.params.id);

        res.json({
            message: count === 1
                ? 'Last assignment removed. Faculty has no remaining assignments.'
                : 'Assignment removed successfully',
            remainingAssignments: remaining,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// STUDENT CREATION
// ═══════════════════════════════════════════════════════════════════

// @route   POST /api/users/student
// @desc    Create a student user
// @access  Private / Admin
router.post('/student', protect, authorize('admin'), async (req, res) => {
    try {
        const { email, name, phone, department, year, regNo, domain } = req.body;

        // Validate department/domain
        const validation = await validateDeptDomain(department, domain);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

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
            addedBy: req.user.id,
        });

        if (user) {
            // Await email sending to guarantee delivery on serverless
            await sendCredentialsEmail(email, 'Student', email, unhashedPassword, department, domain, name);

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

// ═══════════════════════════════════════════════════════════════════
// PROFILE & STATS
// ═══════════════════════════════════════════════════════════════════

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').populate('addedBy', 'name email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userObj = user.toObject();

        // Attach assignments for admin users
        if (user.role === 'admin') {
            userObj.assignments = await getFacultyAssignments(user._id);
        }

        res.json(userObj);
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

        // Count all departments from the Department collection (not just those with users)
        const departmentCount = await Department.countDocuments();

        // Real activity count from StudentUpdate collection
        const activityCount = await StudentUpdate.countDocuments();

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

// @route   GET /api/users/admin/analytics/daily-trend
// @desc    Aggregated daily activity trend grouped by date, department, and domain
// @access  Private / Super-Admin
router.get('/admin/analytics/daily-trend', protect, authorize('super-admin'), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 14;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD

        const pipeline = [
            // 1. Filter to recent entries
            { $match: { date: { $gte: cutoffStr } } },
            // 2. Join with User to get department & domain
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            // 3. Group by date + department + domain
            {
                $group: {
                    _id: {
                        date: '$date',
                        department: '$studentInfo.department',
                        domain: '$studentInfo.domain'
                    },
                    count: { $sum: 1 }
                }
            },
            // 4. Reshape output
            {
                $project: {
                    _id: 0,
                    date: '$_id.date',
                    department: '$_id.department',
                    domain: '$_id.domain',
                    count: 1
                }
            },
            { $sort: { date: 1, count: -1 } }
        ];

        const results = await StudentUpdate.aggregate(pipeline);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/admin/analytics/dept-performance
// @desc    Department-wise total activity count, ranked descending
// @access  Private / Super-Admin
router.get('/admin/analytics/dept-performance', protect, authorize('super-admin'), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const pipeline = [
            { $match: { date: { $gte: cutoffStr } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $group: {
                    _id: '$studentInfo.department',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    department: '$_id',
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ];

        const results = await StudentUpdate.aggregate(pipeline);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/admin/activities/all
// @desc    List all activities with optional department/domain filters + pagination
// @access  Private / Super-Admin
router.get('/admin/activities/all', protect, authorize('super-admin'), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const { department, domain, search } = req.query;

        // Build a match for students first (to filter by dept/domain)
        const studentMatch = { role: 'student' };
        if (department) studentMatch.department = department;
        if (domain) studentMatch.domain = { $regex: domain.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' };

        // Get matching student IDs
        const studentIds = (await User.find(studentMatch).select('_id').lean()).map(s => s._id);

        // Build update query
        const updateQuery = {};
        if (department || domain) {
            updateQuery.student = { $in: studentIds };
        }

        // Get total count for pagination
        const total = await StudentUpdate.countDocuments(updateQuery);

        // Fetch activities
        let activities = await StudentUpdate.find(updateQuery)
            .populate('student', 'name email regNo department domain profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Server-side search filter (student name, type, or value)
        if (search) {
            const q = search.toLowerCase();
            activities = activities.filter(a =>
                (a.student?.name || '').toLowerCase().includes(q) ||
                (a.student?.email || '').toLowerCase().includes(q) ||
                (a.type || '').toLowerCase().includes(q) ||
                (a.value || '').toLowerCase().includes(q)
            );
        }

        res.json({
            activities,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   GET /api/users/role/:role
// @desc    Get users by role
// @access  Private / Super-Admin, Admin & Student
router.get('/role/:role', protect, authorize('super-admin', 'admin', 'student'), async (req, res) => {
    try {
        const users = await User.find({ role: req.params.role }).select('-password').lean();

        // Attach assignments for admin users
        if (req.params.role === 'admin') {
            for (const u of users) {
                u.assignments = await getFacultyAssignments(u._id);
            }
        }

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/faculty/student-progress
// @desc    Get daily progress updates for all students assigned to the logged-in faculty
// @access  Private / Admin (Faculty)
router.get('/faculty/student-progress', protect, authorize('admin'), async (req, res) => {
    try {
        const { studentId, startDate, endDate, search } = req.query;

        // 1. Get faculty assignments → build student query
        const assignments = await getFacultyAssignments(req.user.id);
        const studentQuery = buildStudentQueryFromAssignments(assignments);

        if (!studentQuery) {
            return res.json([]);
        }

        // 2. Find all assigned student IDs
        let studentFilter = studentQuery;
        if (studentId) {
            // If filtering by a specific student, verify they're in the assigned set
            studentFilter = { ...studentQuery, _id: studentId };
        }

        const assignedStudents = await User.find(studentFilter).select('_id').lean();
        const studentIds = assignedStudents.map(s => s._id);

        if (studentIds.length === 0) {
            return res.json([]);
        }

        // 3. Build the StudentUpdate query
        const updateQuery = { student: { $in: studentIds } };

        // Date range filter
        if (startDate) {
            updateQuery.date = updateQuery.date || {};
            updateQuery.date.$gte = startDate;
        }
        if (endDate) {
            updateQuery.date = updateQuery.date || {};
            updateQuery.date.$lte = endDate;
        }

        // 4. Fetch updates with populated student info
        let updates = await StudentUpdate.find(updateQuery)
            .populate('student', 'name email regNo department domain profilePicture')
            .sort({ createdAt: -1 })
            .lean();

        // 5. Server-side search filter (student name or update value)
        if (search) {
            const q = search.toLowerCase();
            updates = updates.filter(u =>
                (u.student?.name || '').toLowerCase().includes(q) ||
                (u.value || '').toLowerCase().includes(q)
            );
        }

        res.json(updates);
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
        const user = await User.findById(req.params.id).select('-password').populate('addedBy', 'name email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userObj = user.toObject();

        // Attach assignments for admin users
        if (user.role === 'admin') {
            userObj.assignments = await getFacultyAssignments(user._id);
        }

        res.json(userObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/:id/faculty
// @desc    Get the faculty member assigned to a student (by domain/department)
// @access  Private / Super-Admin & Admin
router.get('/:id/faculty', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const student = await User.findById(req.params.id).select('-password');
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Find faculty via FacultyAssignment
        const matchConditions = [];
        if (student.department) {
            if (student.domain) {
                const domains = student.domain.split(',').map(d => d.trim()).filter(Boolean);
                domains.forEach(d => {
                    matchConditions.push({ department: student.department, domain: d });
                });
            } else {
                matchConditions.push({ department: student.department });
            }
        }

        if (matchConditions.length === 0) {
            return res.json([]);
        }

        const assignments = await FacultyAssignment.find({ $or: matchConditions }).lean();
        const facultyIds = [...new Set(assignments.map(a => a.faculty.toString()))];

        const faculty = await User.find({ _id: { $in: facultyIds } }).select('-password').sort({ name: 1 }).lean();
        
        // Attach assignments to each faculty
        for (const f of faculty) {
            f.assignments = await getFacultyAssignments(f._id);
        }

        res.json(faculty);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/:id/students
// @desc    Get students managed by a faculty member (all assigned dept/domains)
// @access  Private / Super-Admin & Admin
router.get('/:id/students', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const faculty = await User.findById(req.params.id).select('-password');
        if (!faculty || faculty.role !== 'admin') {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        // Use FacultyAssignment to find all relevant students
        const assignments = await getFacultyAssignments(faculty._id);
        const query = buildStudentQueryFromAssignments(assignments);

        if (!query) {
            return res.json([]);
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
        const { dept } = req.query;

        const query = { domain };
        if (dept) {
            query.department = dept;
        }

        // Students assigned to this domain
        const students = await User.find({
            role: 'student',
            ...query
        }).select('-password');

        // Faculty assigned to this domain — via FacultyAssignment
        const assignmentQuery = { domain };
        if (dept) assignmentQuery.department = dept;
        const assignments = await FacultyAssignment.find(assignmentQuery).lean();
        const facultyIds = [...new Set(assignments.map(a => a.faculty.toString()))];
        const faculty = await User.find({ _id: { $in: facultyIds } }).select('-password').lean();
        
        for (const f of faculty) {
            f.assignments = await getFacultyAssignments(f._id);
        }

        res.json({ students, faculty });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE USER
// ═══════════════════════════════════════════════════════════════════

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private / Super-Admin & Admin
router.delete('/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'super-admin') {
            return res.status(403).json({ message: 'Cannot delete super-admin' });
        }

        // Admin (Faculty) authorization check
        if (req.user.role === 'admin') {
            if (user.role !== 'student') {
                return res.status(403).json({ message: 'You can only delete students' });
            }

            const allowed = await facultyOwnsStudent(req.user.id, user);
            if (!allowed) {
                return res.status(403).json({ message: 'You cannot delete a student outside of your assigned domains' });
            }
        }

        // If the user being deleted is an admin (faculty), delete their assignments and assigned students
        if (user.role === 'admin') {
            const assignments = await getFacultyAssignments(user._id);
            const studentQuery = buildStudentQueryFromAssignments(assignments);

            if (studentQuery) {
                await User.deleteMany(studentQuery);
            }

            // Delete all assignments
            await FacultyAssignment.deleteMany({ faculty: user._id });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// UPDATE USER
// ═══════════════════════════════════════════════════════════════════

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Private / Super-Admin & Admin
router.put('/:id', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Admin (Faculty) authorization check
        if (req.user.role === 'admin') {
            if (user.role !== 'student') return res.status(403).json({ message: 'You can only modify students' });

            const allowed = await facultyOwnsStudent(req.user.id, user);
            if (!allowed) return res.status(403).json({ message: 'You cannot edit a student outside of your assigned domains' });
        }

        const { name, email, phone, year, regNo, department, domain } = req.body;

        // If department or domain is updated, ensure they are valid together
        if (department || domain) {
            const validation = await validateDeptDomain(department || user.department, domain || user.domain);
            if (!validation.valid) {
                return res.status(400).json({ message: validation.message });
            }
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (year) user.year = year;
        if (regNo) user.regNo = regNo;
        if (department) user.department = department;
        if (domain) user.domain = domain;

        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// REPLACE USER
// ═══════════════════════════════════════════════════════════════════

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

        // Validate department/domain
        const validation = await validateDeptDomain(department, domain);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Get old assignments to transfer
        const oldAssignments = await getFacultyAssignments(oldUser._id);

        // Delete old faculty and their assignments
        await FacultyAssignment.deleteMany({ faculty: oldUser._id });
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
            domain: domain || '',
        });

        if (newUser) {
            // Re-create all old assignments for the new user, plus the new one
            const assignmentSet = new Set();

            // Transfer old assignments
            for (const a of oldAssignments) {
                const key = `${a.department}|||${a.domain || ''}`;
                if (!assignmentSet.has(key)) {
                    assignmentSet.add(key);
                    try {
                        await FacultyAssignment.create({
                            faculty: newUser._id,
                            department: a.department,
                            domain: a.domain || '',
                        });
                    } catch (e) { if (e.code !== 11000) throw e; }
                }
            }

            // Add the new assignment (if different from old ones)
            const newKey = `${department}|||${domain || ''}`;
            if (!assignmentSet.has(newKey)) {
                try {
                    await FacultyAssignment.create({
                        faculty: newUser._id,
                        department,
                        domain: domain || '',
                    });
                } catch (e) { if (e.code !== 11000) throw e; }
            }

            await sendCredentialsEmail(email, 'Admin', email, unhashedPassword, department, domain, name);

            await Notification.create({
                type: 'user_created',
                message: `Faculty ${oldUser.name || oldUser.email} replaced by ${name || email}`,
                actorName: 'Super Admin',
                actorRole: 'super-admin',
            });

            const allAssignments = await getFacultyAssignments(newUser._id);

            res.status(201).json({
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                assignments: allAssignments,
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

// @route   POST /api/users/student/:id/replace
// @desc    Replace a student — delete old, create new
// @access  Private / Super-Admin & Admin
router.post('/student/:id/replace', protect, authorize('super-admin', 'admin'), async (req, res) => {
    try {
        const oldUser = await User.findById(req.params.id);
        if (!oldUser || oldUser.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Admin authorization check
        if (req.user.role === 'admin') {
            const allowed = await facultyOwnsStudent(req.user.id, oldUser);
            if (!allowed) return res.status(403).json({ message: 'Cannot replace a student outside your domains' });
        }

        const { email, name, department, phone, domain, year, regNo } = req.body;

        // Validate department/domain
        const validation = await validateDeptDomain(department, domain);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        await User.findByIdAndDelete(req.params.id);

        const unhashedPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(unhashedPassword, salt);

        const newUser = await User.create({
            email,
            password: hashedPassword,
            role: 'student',
            name,
            department,
            phone,
            domain,
            year,
            regNo
        });

        if (newUser) {
            await sendCredentialsEmail(email, 'Student', email, unhashedPassword, department, domain, name);

            const creator = await User.findById(req.user.id).select('name role');
            await Notification.create({
                type: 'user_created',
                message: `Student ${oldUser.name || oldUser.email} replaced by ${name || email}`,
                actorName: creator?.name || 'Admin',
                actorRole: creator?.role || 'admin',
            });

            res.status(201).json({
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                message: 'Student replaced. Credentials email is being sent to the new member.',
            });
        } else {
            res.status(400).json({ message: 'Failed to create replacement' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/public/stats
// @desc    Get counts of students and faculty
// @access  Private
router.get('/public/stats', protect, async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'student' });
        const facultyCount = await User.countDocuments({ role: 'admin' });
        res.json({ students: studentCount, faculty: facultyCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH /api/users/profile/status
// @desc    Toggle user active status
// @access  Private
router.patch('/profile/status', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ isActive: user.isActive, message: `Profile ${user.isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



// @route   GET /api/users/student/updates/my
// @desc    Get all progress updates for the logged-in student
// @access  Private / Student
router.get('/student/updates/my', protect, authorize('student'), async (req, res) => {
    try {
        const updates = await StudentUpdate.find({ student: req.user.id })
            .sort({ createdAt: -1 });
        res.json(updates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/student/updates
// @desc    Submit a daily progress update
// @access  Private / Student
router.post('/student/updates', protect, authorize('student'), async (req, res) => {
    try {
        const { date, type, value } = req.body;
        
        // Create a new update instead of upserting to allow multiple entries per day
        const update = await StudentUpdate.create({
            student: req.user.id,
            date,
            type,
            value
        });

        res.status(201).json(update);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/users/student/updates/:id
// @desc    Update a specific progress entry
// @access  Private / Student
router.put('/student/updates/:id', protect, authorize('student'), async (req, res) => {
    try {
        let update = await StudentUpdate.findById(req.params.id);
        if (!update) return res.status(404).json({ message: 'Update not found' });
        
        // Ensure user owns the update
        if (update.student.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { value, date } = req.body;
        if (value) update.value = value;
        if (date) update.date = date;

        await update.save();
        res.json(update);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/users/student/updates/:id
// @desc    Delete a specific progress entry
// @access  Private / Student
router.delete('/student/updates/:id', protect, authorize('student'), async (req, res) => {
    try {
        const update = await StudentUpdate.findById(req.params.id);
        if (!update) return res.status(404).json({ message: 'Update not found' });

        // Ensure user owns the update
        if (update.student.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await StudentUpdate.findByIdAndDelete(req.params.id);
        res.json({ message: 'Update removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
