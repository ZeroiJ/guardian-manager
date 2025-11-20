require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { checkAndDownloadManifest } = require('./services/manifestService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/guardian-nexus')
    .then(() => {
        console.log('Connected to MongoDB');
        // Check manifest on startup
        checkAndDownloadManifest();
        // Schedule daily check (simple interval for now)
        setInterval(checkAndDownloadManifest, 24 * 60 * 60 * 1000);
    })
    .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.send('Guardian Nexus API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
