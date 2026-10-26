const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, is_guest: user.is_guest },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

class AuthController {
    /**
     * User registration
     */
    async register(req, res, next) {
        try {
            const { username, email, password, display_name } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username, email, and password are required.'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters.'
                });
            }

            // Check if username or email already exists
            const existingUser = db.get(
                'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
                username.trim(),
                email.trim()
            );

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'A user with this username or email already exists.'
                });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const userId = crypto.randomUUID();
            const displayName = display_name?.trim() || username.trim();

            db.run(
                `INSERT INTO users (id, username, email, password_hash, display_name, is_guest)
                 VALUES (?, ?, ?, ?, ?, 0)`,
                userId,
                username.trim(),
                email.trim().toLowerCase(),
                passwordHash,
                displayName
            );

            const newUser = db.get('SELECT id, username, email, display_name, is_guest, avatar, created_at FROM users WHERE id = ?', userId);
            const token = generateToken(newUser);

            return res.status(201).json({
                success: true,
                message: 'Account created successfully! Welcome to MindCare.',
                token,
                user: newUser
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * User login
     */
    async login(req, res, next) {
        try {
            const { usernameOrEmail, password } = req.body;

            if (!usernameOrEmail || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username/email and password are required.'
                });
            }

            const user = db.get(
                'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
                usernameOrEmail.trim(),
                usernameOrEmail.trim()
            );

            if (!user || !user.password_hash) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials. Please check your username and password.'
                });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials. Please check your username and password.'
                });
            }

            const safeUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                display_name: user.display_name,
                is_guest: user.is_guest,
                avatar: user.avatar,
                created_at: user.created_at
            };

            const token = generateToken(safeUser);

            return res.json({
                success: true,
                message: 'Logged in successfully.',
                token,
                user: safeUser
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Guest user instant login / session
     */
    async guest(req, res, next) {
        try {
            const { guestId } = req.body;

            if (guestId) {
                const existingGuest = db.get('SELECT id, username, email, display_name, is_guest, avatar, created_at FROM users WHERE id = ? AND is_guest = 1', guestId);
                if (existingGuest) {
                    const token = generateToken(existingGuest);
                    return res.json({
                        success: true,
                        token,
                        user: existingGuest
                    });
                }
            }

            // Create new guest user
            const id = 'guest_' + crypto.randomBytes(6).toString('hex');
            const username = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
            const displayName = 'Guest Friend';

            db.run(
                `INSERT INTO users (id, username, email, display_name, is_guest)
                 VALUES (?, ?, ?, ?, 1)`,
                id,
                username,
                `${id}@mindcare.local`,
                displayName
            );

            const guestUser = db.get('SELECT id, username, email, display_name, is_guest, avatar, created_at FROM users WHERE id = ?', id);
            const token = generateToken(guestUser);

            return res.status(201).json({
                success: true,
                message: 'Guest session created.',
                token,
                user: guestUser
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get current user profile and summary stats
     */
    async getMe(req, res, next) {
        try {
            const user = req.user;

            const journalCount = db.get('SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?', user.id)?.count || 0;
            const moodCount = db.get('SELECT COUNT(*) as count FROM mood_logs WHERE user_id = ?', user.id)?.count || 0;
            const exerciseCount = db.get('SELECT COUNT(*) as count FROM exercise_logs WHERE user_id = ?', user.id)?.count || 0;

            return res.json({
                success: true,
                user,
                stats: {
                    journalCount,
                    moodCount,
                    exerciseCount
                }
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update user profile (display name, avatar)
     */
    async updateProfile(req, res, next) {
        try {
            const { display_name, avatar } = req.body;
            const userId = req.user.id;

            if (display_name) {
                db.run('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', display_name.trim(), userId);
            }
            if (avatar) {
                db.run('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', avatar.trim(), userId);
            }

            const updatedUser = db.get('SELECT id, username, email, display_name, is_guest, avatar, created_at FROM users WHERE id = ?', userId);

            return res.json({
                success: true,
                message: 'Profile updated.',
                user: updatedUser
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();
