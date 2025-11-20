require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const { checkAndDownloadManifest } = require('./services/manifestService');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true
}));
app.use(express.json());

// Session Setup
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: path.join(__dirname, 'data')
    }),
    secret: process.env.SESSION_SECRET || 'guardian_nexus_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('Guardian Nexus API is running');
});

// Initialize
const dataDir = path.join(__dirname, 'data');
const fs = require('fs');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Check manifest on startup
    checkAndDownloadManifest();
});
