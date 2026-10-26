const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Initialize database schema
require('./src/config/database');

const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const journalRoutes = require('./src/routes/journalRoutes');
const moodRoutes = require('./src/routes/moodRoutes');
const exerciseRoutes = require('./src/routes/exerciseRoutes');
const emergencyRoutes = require('./src/routes/emergencyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MindCare Mental Wellness Backend',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
    });
});

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/emergency', emergencyRoutes);

// Fallback to index.html for SPA navigation
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'Endpoint not found.' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized error handling
app.use(errorHandler);

// Start server if not running inside a test runner
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🌿 MindCare Fullstack Server running at: http://localhost:${PORT}`);
        console.log(`📊 SQLite Database loaded & initialized.`);
        console.log(`💬 AI Chat service ready.`);
        console.log(`======================================================\n`);
    });
}

module.exports = app;
