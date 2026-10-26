const db = require('../config/database');

class MoodController {
    /**
     * Get mood check-in logs
     */
    async getLogs(req, res, next) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;

            const logs = db.all(
                `SELECT id, mood_name, mood_value, note, logged_at 
                 FROM mood_logs 
                 WHERE user_id = ? 
                 ORDER BY logged_at DESC 
                 LIMIT ?`,
                userId,
                limit
            );

            return res.json({
                success: true,
                count: logs.length,
                logs
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Log a new mood check-in
     */
    async logMood(req, res, next) {
        try {
            const userId = req.user.id;
            const { mood_name, mood_value, note = null } = req.body;

            if (!mood_name || mood_value === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'Mood name and mood value (1-5) are required.'
                });
            }

            const val = parseInt(mood_value);
            if (isNaN(val) || val < 1 || val > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Mood value must be an integer between 1 and 5.'
                });
            }

            const insertRes = db.run(
                `INSERT INTO mood_logs (user_id, mood_name, mood_value, note)
                 VALUES (?, ?, ?, ?)`,
                userId,
                mood_name.trim(),
                val,
                note ? note.trim() : null
            );

            const newLog = db.get(
                `SELECT id, mood_name, mood_value, note, logged_at 
                 FROM mood_logs 
                 WHERE id = ?`,
                insertRes.lastInsertRowid
            );

            // Compute companion reflection message
            let supportiveMessage = '';
            if (val >= 4) {
                supportiveMessage = `I'm delighted you're feeling ${mood_name}! ✨ Savor this positive energy and notice what made you feel good today.`;
            } else if (val === 3) {
                supportiveMessage = `Thanks for checking in. Feeling ${mood_name} is a balanced, centered space to be. How can we make today a little more gentle?`;
            } else {
                supportiveMessage = `I see that you're feeling ${mood_name}. Thank you for honoring your truth. Remember you don't have to carry it alone. Try the grounding or breathing exercises if you'd like some calm.`;
            }

            return res.status(201).json({
                success: true,
                message: 'Mood logged successfully!',
                log: newLog,
                supportiveMessage
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Compute comprehensive mood analytics & statistics
     */
    async getAnalytics(req, res, next) {
        try {
            const userId = req.user.id;

            // Total check-ins and average score
            const summary = db.get(
                `SELECT 
                    COUNT(*) as total_checkins,
                    AVG(mood_value) as average_score,
                    MIN(mood_value) as min_score,
                    MAX(mood_value) as max_score
                 FROM mood_logs 
                 WHERE user_id = ?`,
                userId
            );

            const total = summary?.total_checkins || 0;
            const avgScore = total > 0 ? parseFloat(summary.average_score.toFixed(1)) : 0;

            // Mood breakdown distribution
            const distributionRows = db.all(
                `SELECT mood_name, mood_value, COUNT(*) as count 
                 FROM mood_logs 
                 WHERE user_id = ? 
                 GROUP BY mood_name, mood_value 
                 ORDER BY mood_value DESC`,
                userId
            );

            const distribution = {
                'Joyful': 0,
                'Content': 0,
                'Neutral': 0,
                'Down': 0,
                'Distressed': 0
            };

            for (const row of distributionRows) {
                if (distribution[row.mood_name] !== undefined) {
                    distribution[row.mood_name] = row.count;
                }
            }

            // Recent 10 timeline entries
            const recentTimeline = db.all(
                `SELECT id, mood_name, mood_value, note, logged_at 
                 FROM mood_logs 
                 WHERE user_id = ? 
                 ORDER BY logged_at DESC 
                 LIMIT 10`,
                userId
            );

            // Daily average over the last 7 days
            const last7Days = db.all(
                `SELECT 
                    DATE(logged_at) as date,
                    AVG(mood_value) as avg_value,
                    COUNT(*) as count
                 FROM mood_logs
                 WHERE user_id = ? AND logged_at >= datetime('now', '-7 days')
                 GROUP BY DATE(logged_at)
                 ORDER BY date ASC`,
                userId
            );

            return res.json({
                success: true,
                analytics: {
                    totalCheckins: total,
                    wellbeingScore: avgScore,
                    distribution,
                    recentTimeline,
                    last7Days
                }
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Delete a mood log entry
     */
    async deleteLog(req, res, next) {
        try {
            const userId = req.user.id;
            const logId = req.params.id;

            const result = db.run('DELETE FROM mood_logs WHERE id = ? AND user_id = ?', logId, userId);

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Mood log entry not found.'
                });
            }

            return res.json({
                success: true,
                message: 'Mood entry deleted.'
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new MoodController();
