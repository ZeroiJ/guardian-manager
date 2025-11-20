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
    }

    try {
        const tokenData = await getTokensFromCode(code);

        // Store tokens in session
        req.session.accessToken = tokenData.access_token;
        req.session.refreshToken = tokenData.refresh_token;
        req.session.membershipId = tokenData.membership_id;
        req.session.expiresAt = Date.now() + (tokenData.expires_in * 1000);

        // Redirect to frontend
        res.redirect('http://localhost:5173/dashboard');
    } catch (error) {
        res.status(500).send('Authentication failed');
    }
});

// Status Route - Check if user is logged in
router.get('/status', (req, res) => {
    if (req.session.accessToken) {
        res.json({
            isAuthenticated: true,
            membershipId: req.session.membershipId
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

module.exports = router;
