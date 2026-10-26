const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../mindcare.db');

// Ensure parent directory exists
const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign key constraints
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
function initializeSchema() {
    db.exec(`
        -- Users Table
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            display_name TEXT,
            is_guest INTEGER DEFAULT 0,
            avatar TEXT DEFAULT '🧘‍♀️',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Chat Messages Table
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            session_id TEXT DEFAULT 'default',
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            sentiment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Journal Entries Table
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            prompt TEXT,
            content TEXT NOT NULL,
            mood_tag TEXT,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Mood Logs Table
        CREATE TABLE IF NOT EXISTS mood_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            mood_name TEXT NOT NULL,
            mood_value INTEGER NOT NULL CHECK(mood_value BETWEEN 1 AND 5),
            note TEXT,
            logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Wellness Exercises Catalog Table
        CREATE TABLE IF NOT EXISTS exercises (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            duration_seconds INTEGER DEFAULT 300,
            description TEXT,
            icon TEXT,
            content_html TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Exercise Completion Logs Table
        CREATE TABLE IF NOT EXISTS exercise_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            exercise_id TEXT NOT NULL,
            duration_spent_seconds INTEGER DEFAULT 0,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
        );

        -- Emergency / Trusted Contacts Table
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            relationship TEXT,
            phone TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Indices for fast querying
        CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_logs(user_id, logged_at);
        CREATE INDEX IF NOT EXISTS idx_exercise_logs_user ON exercise_logs(user_id, completed_at);
    `);

    seedDefaultExercises();
}

function seedDefaultExercises() {
    const checkCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get();
    if (checkCount && checkCount.count > 0) {
        return;
    }

    const defaultExercises = [
        {
            id: 'breathing',
            title: 'Box Breathing Exercise',
            category: 'Breathing & Calm',
            duration_seconds: 240,
            description: 'Calm your mind with balanced 4-count square breathing',
            icon: '🧘',
            content_html: `
                <h2>🧘 Box Breathing Technique</h2>
                <p>This technique helps reset your autonomic nervous system. Follow these four phases:</p>
                <div class="exercise-steps-visual">
                    <div class="step-badge">1. Inhale for 4s</div>
                    <div class="step-badge">2. Hold for 4s</div>
                    <div class="step-badge">3. Exhale for 4s</div>
                    <div class="step-badge">4. Hold for 4s</div>
                </div>
                <p style="margin-top: 16px;">Repeat this cycle 5 to 10 times. Focus on the gentle movement of your lungs and belly.</p>
                <div class="exercise-tip-box">
                    <p>💡 <strong>Tip:</strong> Keep your shoulders relaxed and breathe deeply through your diaphragm.</p>
                </div>
            `
        },
        {
            id: 'grounding',
            title: '5-4-3-2-1 Grounding',
            category: 'Anxiety Relief',
            duration_seconds: 300,
            description: 'Ground yourself in the present moment through your senses',
            icon: '🎯',
            content_html: `
                <h2>🎯 5-4-3-2-1 Sensory Grounding</h2>
                <p>Anchor your mind into the present moment by observing your environment:</p>
                <ul class="grounding-list">
                    <li>👀 <strong>5 things</strong> you can SEE right now</li>
                    <li>✋ <strong>4 things</strong> you can physically TOUCH or feel</li>
                    <li>👂 <strong>3 things</strong> you can HEAR in the room or outside</li>
                    <li>👃 <strong>2 things</strong> you can SMELL</li>
                    <li>👅 <strong>1 thing</strong> you can TASTE</li>
                </ul>
                <div class="exercise-tip-box">
                    <p>💡 <strong>Why this works:</strong> Engaging multiple senses pulls your nervous system out of fight-or-flight and into safety.</p>
                </div>
            `
        },
        {
            id: 'relaxation',
            title: 'Progressive Muscle Relaxation',
            category: 'Stress Release',
            duration_seconds: 400,
            description: 'Release deep muscular tension from head to toe',
            icon: '💆',
            content_html: `
                <h2>💆 Progressive Muscle Relaxation</h2>
                <p>Tense each muscle group for 5 seconds, then completely release and feel the warmth:</p>
                <ol class="relaxation-steps">
                    <li><strong>Feet & Toes:</strong> Curl tight for 5s... then completely release.</li>
                    <li><strong>Calves & Thighs:</strong> Tighten leg muscles... then let go.</li>
                    <li><strong>Stomach & Chest:</strong> Contract core gently... and breathe out ease.</li>
                    <li><strong>Hands & Arms:</strong> Make tight fists... and let fingers open loose.</li>
                    <li><strong>Shoulders & Neck:</strong> Shrug up to ears... and let shoulders drop down.</li>
                    <li><strong>Face & Jaw:</strong> Clench lightly... then soften all facial muscles.</li>
                </ol>
            `
        },
        {
            id: 'affirmations',
            title: 'Positive Affirmations',
            category: 'Mindset & Self-Love',
            duration_seconds: 180,
            description: 'Strengthen your inner voice with self-compassion',
            icon: '✨',
            content_html: `
                <h2>✨ Daily Self-Compassion Affirmations</h2>
                <p>Read each affirmation slowly, breathing deeply between each statement:</p>
                <div class="affirmations-list">
                    <div class="affirmation-card">💜 <em>I am worthy of peace, kindness, and love.</em></div>
                    <div class="affirmation-card">🌟 <em>I am doing my best today, and my best is enough.</em></div>
                    <div class="affirmation-card">🌈 <em>I give myself permission to rest and recharge.</em></div>
                    <div class="affirmation-card">💪 <em>I have survived difficult days before, and I will get through today.</em></div>
                    <div class="affirmation-card">🌸 <em>I am gentle with myself as I heal and grow.</em></div>
                </div>
            `
        },
        {
            id: 'visualization',
            title: 'Peaceful Sanctuary Visualization',
            category: 'Meditation',
            duration_seconds: 360,
            description: 'Create and explore your inner calm sanctuary',
            icon: '🌅',
            content_html: `
                <h2>🌅 Peaceful Sanctuary Visualization</h2>
                <p>Close your eyes or soften your gaze. Picture a place where you feel 100% secure and tranquil:</p>
                <ul class="visualization-guide">
                    <li>🏖️ <em>A warm, sunlit beach with gentle rhythmic waves...</em></li>
                    <li>🌲 <em>A quiet pine forest with soft morning sunlight filtering through...</em></li>
                    <li>🏡 <em>A cozy room with a warm fireplace and rain tapping on the window...</em></li>
                </ul>
                <p style="margin-top: 16px;">Notice the soothing temperature, the colors, and the calm atmosphere. This sanctuary lives inside you anytime you need to visit.</p>
            `
        },
        {
            id: 'gratitude',
            title: 'Gratitude Practice',
            category: 'Positive Psychology',
            duration_seconds: 240,
            description: 'Focus your awareness on the positive aspects of life',
            icon: '📝',
            content_html: `
                <h2>📝 3-Minute Gratitude Reflection</h2>
                <p>Reflect on these 4 pillars of gratitude:</p>
                <div class="gratitude-prompts">
                    <p>💛 <strong>A Person:</strong> Someone who showed kindness, support, or made you smile.</p>
                    <p>🏡 <strong>A Comfort:</strong> A warm cup of tea, a cozy bed, or clean water.</p>
                    <p>🌟 <strong>A Personal Quality:</strong> Your resilience, empathy, curiosity, or humor.</p>
                    <p>🍃 <strong>A Simple Pleasure:</strong> Birds chirping, good music, fresh air, or sunlight.</p>
                </div>
            `
        }
    ];

    const insertStmt = db.prepare(`
        INSERT INTO exercises (id, title, category, duration_seconds, description, icon, content_html)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ex of defaultExercises) {
        insertStmt.run(ex.id, ex.title, ex.category, ex.duration_seconds, ex.description, ex.icon, ex.content_html);
    }
}

// Run schema initialization
initializeSchema();

// Helper database interface
module.exports = {
    db,
    prepare: (sql) => db.prepare(sql),
    exec: (sql) => db.exec(sql),
    get: (sql, ...params) => db.prepare(sql).get(...params),
    all: (sql, ...params) => db.prepare(sql).all(...params),
    run: (sql, ...params) => db.prepare(sql).run(...params)
};
