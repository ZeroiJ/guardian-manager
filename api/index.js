require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieSession = require('cookie-session');
const { checkAndDownloadManifest } = require('./services/manifestService');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Cookie Session (Stateless)
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'guardian_nexus_secret'],
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/api', (req, res) => {
    res.send('Guardian Nexus API is running');
});

// Vercel Serverless Entry Point
// We do NOT call app.listen() here. Vercel handles it.
module.exports = app;

// Attempt to check manifest on cold start (might timeout, but worth a try)
// In a real serverless app, you might trigger this via a cron job or check lazily.
checkAndDownloadManifest().catch(err => console.error("Manifest check failed:", err));
