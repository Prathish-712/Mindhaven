const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mindcare_super_secret_jwt_key_2026_change_in_production';

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please log in or continue as guest.'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from DB to verify existence
        const user = db.get('SELECT id, username, email, display_name, is_guest, avatar, created_at FROM users WHERE id = ?', decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found or session expired.'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired authentication token.'
        });
    }
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = db.get('SELECT id, username, email, display_name, is_guest, avatar, created_at FROM users WHERE id = ?', decoded.id);
            if (user) {
                req.user = user;
            }
        } catch (err) {
            // Ignore token error for optional auth
        }
    }
    next();
}

module.exports = {
    requireAuth,
    optionalAuth,
    JWT_SECRET
};
