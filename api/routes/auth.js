const express = require('express');
const router = express.Router();
const { getTokensFromCode } = require('../services/authService');

// Login Route - Redirects to Bungie
router.get('/login', (req, res) => {
    const authUrl = `${process.env.BUNGIE_AUTH_URL}?client_id=${process.env.BUNGIE_CLIENT_ID}&response_type=code`;
    res.redirect(authUrl);
});

// Callback Route - Handles the response from Bungie
router.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('No code provided');
        res.json({ isAuthenticated: false });
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

module.exports = router;
