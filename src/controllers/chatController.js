const db = require('../config/database');
const aiChatService = require('../services/aiChatService');

class ChatController {
    /**
     * Get chat messages for user
     */
    async getMessages(req, res, next) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 100;

            const messages = db.all(
                `SELECT id, role, content, sentiment, created_at 
                 FROM chat_messages 
                 WHERE user_id = ? 
                 ORDER BY created_at ASC 
                 LIMIT ?`,
                userId,
                limit
            );

            // If user has no messages yet, provide an initial welcoming message
            if (messages.length === 0) {
                const welcomeText = `Hello ${req.user.display_name || 'friend'}! 🌿 I'm your MindCare companion. I'm here to listen, offer gentle reflections, and support your mental wellness journey. How are you feeling today?`;
                
                const insertRes = db.run(
                    `INSERT INTO chat_messages (user_id, role, content, sentiment) 
                     VALUES (?, 'assistant', ?, 'positive')`,
                    userId,
                    welcomeText
                );

                const welcomeMsg = db.get('SELECT id, role, content, sentiment, created_at FROM chat_messages WHERE id = ?', insertRes.lastInsertRowid);
                return res.json({
                    success: true,
                    messages: [welcomeMsg]
                });
            }

            return res.json({
                success: true,
                messages
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Send a user message and get AI response
     */
    async sendMessage(req, res, next) {
        try {
            const userId = req.user.id;
            const { content, session_id = 'default' } = req.body;

            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Message content cannot be empty.'
                });
            }

            const cleanContent = content.trim();

            // 1. Save user message to database
            const userMsgRes = db.run(
                `INSERT INTO chat_messages (user_id, session_id, role, content)
                 VALUES (?, ?, 'user', ?)`,
                userId,
                session_id,
                cleanContent
            );

            const userMessage = db.get('SELECT id, role, content, created_at FROM chat_messages WHERE id = ?', userMsgRes.lastInsertRowid);

            // 2. Fetch last 6 messages for conversation context
            const recentHistory = db.all(
                `SELECT role, content FROM chat_messages 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 6`,
                userId
            ).reverse();

            // 3. Generate empathetic AI response
            const aiResult = await aiChatService.generateResponse(
                cleanContent,
                recentHistory,
                req.user.display_name || req.user.username || 'friend'
            );

            // 4. Save AI assistant message to database
            const aiMsgRes = db.run(
                `INSERT INTO chat_messages (user_id, session_id, role, content, sentiment)
                 VALUES (?, ?, 'assistant', ?, ?)`,
                userId,
                session_id,
                aiResult.reply,
                aiResult.sentiment
            );

            const assistantMessage = db.get('SELECT id, role, content, sentiment, created_at FROM chat_messages WHERE id = ?', aiMsgRes.lastInsertRowid);

            return res.json({
                success: true,
                userMessage,
                assistantMessage,
                isCrisis: aiResult.isCrisis
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Clear user's chat history
     */
    async clearMessages(req, res, next) {
        try {
            const userId = req.user.id;
            db.run('DELETE FROM chat_messages WHERE user_id = ?', userId);

            return res.json({
                success: true,
                message: 'Chat history cleared successfully.'
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new ChatController();
