const db = require('../config/database');

const DEFAULT_PROMPTS = [
    "What made you smile today?",
    "What are three things you're grateful for right now?",
    "How are you really feeling in this present moment?",
    "What would make today even 1% better?",
    "What's one thing you learned or appreciated about yourself recently?",
    "Who or what brought you comfort and warmth today?",
    "What challenge are you facing, and what is one gentle step forward?",
    "What does self-care and kindness look like for you today?",
    "What's a small victory or effort you are proud of yourself for?",
    "If you spoke to yourself like your closest friend, what would you say?"
];

class JournalController {
    /**
     * Get all journal entries for user
     */
    async getAll(req, res, next) {
        try {
            const userId = req.user.id;
            const search = req.query.q?.trim();

            let entries;
            if (search) {
                const searchPattern = `%${search}%`;
                entries = db.all(
                    `SELECT id, prompt, content, mood_tag, tags, created_at, updated_at 
                     FROM journal_entries 
                     WHERE user_id = ? AND (content LIKE ? OR prompt LIKE ? OR tags LIKE ?)
                     ORDER BY created_at DESC`,
                    userId,
                    searchPattern,
                    searchPattern,
                    searchPattern
                );
            } else {
                entries = db.all(
                    `SELECT id, prompt, content, mood_tag, tags, created_at, updated_at 
                     FROM journal_entries 
                     WHERE user_id = ? 
                     ORDER BY created_at DESC`,
                    userId
                );
            }

            return res.json({
                success: true,
                count: entries.length,
                entries
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get single journal entry
     */
    async getById(req, res, next) {
        try {
            const userId = req.user.id;
            const entryId = req.params.id;

            const entry = db.get(
                `SELECT id, prompt, content, mood_tag, tags, created_at, updated_at 
                 FROM journal_entries 
                 WHERE id = ? AND user_id = ?`,
                entryId,
                userId
            );

            if (!entry) {
                return res.status(404).json({
                    success: false,
                    error: 'Journal entry not found.'
                });
            }

            return res.json({
                success: true,
                entry
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Create new journal entry
     */
    async create(req, res, next) {
        try {
            const userId = req.user.id;
            const { prompt = "Free Reflection", content, mood_tag = null, tags = null } = req.body;

            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Journal entry content cannot be empty.'
                });
            }

            const insertRes = db.run(
                `INSERT INTO journal_entries (user_id, prompt, content, mood_tag, tags)
                 VALUES (?, ?, ?, ?, ?)`,
                userId,
                prompt.trim(),
                content.trim(),
                mood_tag,
                tags ? (Array.isArray(tags) ? tags.join(',') : tags) : null
            );

            const newEntry = db.get(
                `SELECT id, prompt, content, mood_tag, tags, created_at, updated_at 
                 FROM journal_entries 
                 WHERE id = ?`,
                insertRes.lastInsertRowid
            );

            return res.status(201).json({
                success: true,
                message: 'Journal entry saved successfully! 📝',
                entry: newEntry
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update existing journal entry
     */
    async update(req, res, next) {
        try {
            const userId = req.user.id;
            const entryId = req.params.id;
            const { prompt, content, mood_tag, tags } = req.body;

            const existing = db.get('SELECT id FROM journal_entries WHERE id = ? AND user_id = ?', entryId, userId);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Journal entry not found.'
                });
            }

            if (content !== undefined && !content.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Journal content cannot be empty.'
                });
            }

            db.run(
                `UPDATE journal_entries 
                 SET prompt = COALESCE(?, prompt),
                     content = COALESCE(?, content),
                     mood_tag = COALESCE(?, mood_tag),
                     tags = COALESCE(?, tags),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?`,
                prompt?.trim() || null,
                content?.trim() || null,
                mood_tag || null,
                tags ? (Array.isArray(tags) ? tags.join(',') : tags) : null,
                entryId,
                userId
            );

            const updatedEntry = db.get(
                `SELECT id, prompt, content, mood_tag, tags, created_at, updated_at 
                 FROM journal_entries 
                 WHERE id = ?`,
                entryId
            );

            return res.json({
                success: true,
                message: 'Journal entry updated successfully.',
                entry: updatedEntry
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Delete journal entry
     */
    async delete(req, res, next) {
        try {
            const userId = req.user.id;
            const entryId = req.params.id;

            const result = db.run('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', entryId, userId);

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Journal entry not found.'
                });
            }

            return res.json({
                success: true,
                message: 'Journal entry deleted successfully.'
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get randomized prompt or all prompts
     */
    async getPrompts(req, res, next) {
        try {
            const randomPrompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];
            return res.json({
                success: true,
                prompt: randomPrompt,
                prompts: DEFAULT_PROMPTS
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new JournalController();
