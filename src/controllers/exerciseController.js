const db = require('../config/database');

class ExerciseController {
    /**
     * Get all exercises
     */
    async getAll(req, res, next) {
        try {
            const exercises = db.all('SELECT id, title, category, duration_seconds, description, icon, content_html FROM exercises ORDER BY id ASC');
            return res.json({
                success: true,
                count: exercises.length,
                exercises
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get exercise by ID
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const exercise = db.get('SELECT id, title, category, duration_seconds, description, icon, content_html FROM exercises WHERE id = ?', id);

            if (!exercise) {
                return res.status(404).json({
                    success: false,
                    error: 'Exercise not found.'
                });
            }

            return res.json({
                success: true,
                exercise
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Record exercise completion
     */
    async complete(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { duration_spent_seconds = 0 } = req.body;

            const exercise = db.get('SELECT id, title FROM exercises WHERE id = ?', id);
            if (!exercise) {
                return res.status(404).json({
                    success: false,
                    error: 'Exercise not found.'
                });
            }

            const insertRes = db.run(
                `INSERT INTO exercise_logs (user_id, exercise_id, duration_spent_seconds)
                 VALUES (?, ?, ?)`,
                userId,
                id,
                parseInt(duration_spent_seconds) || 0
            );

            const totalCompleted = db.get('SELECT COUNT(*) as count FROM exercise_logs WHERE user_id = ?', userId)?.count || 1;

            return res.status(201).json({
                success: true,
                message: `Well done! You completed the "${exercise.title}". 🎉`,
                logId: insertRes.lastInsertRowid,
                totalCompleted
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get exercise statistics for user
     */
    async getStats(req, res, next) {
        try {
            const userId = req.user.id;

            const summary = db.get(
                `SELECT 
                    COUNT(*) as total_completions,
                    SUM(duration_spent_seconds) as total_seconds
                 FROM exercise_logs
                 WHERE user_id = ?`,
                userId
            );

            const totalCompletions = summary?.total_completions || 0;
            const totalMinutes = Math.round((summary?.total_seconds || 0) / 60);

            const recentLogs = db.all(
                `SELECT el.id, el.exercise_id, e.title, e.icon, el.duration_spent_seconds, el.completed_at
                 FROM exercise_logs el
                 JOIN exercises e ON el.exercise_id = e.id
                 WHERE el.user_id = ?
                 ORDER BY el.completed_at DESC
                 LIMIT 10`,
                userId
            );

            return res.json({
                success: true,
                stats: {
                    totalCompletions,
                    totalMinutes,
                    recentLogs
                }
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new ExerciseController();
