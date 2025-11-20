const express = require('express');
const router = express.Router();
const { getProfile } = require('../services/bungieService');
const { refreshAccessToken } = require('../services/authService');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.accessToken && req.session.membershipId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const profileData = await getProfile(
            req.session.accessToken,
            req.session.membershipId,
            req.session.refreshToken
        );
        res.json(profileData);
    } catch (error) {
        // Handle Token Refresh Logic if service throws specific error
        // Ideally, this logic should be more robust (e.g., using axios interceptors)
        // But for now, if we catch a 401, we try to refresh and retry.

        if (error.status === 401 && error.message === 'TokenExpired') {
            // This block is tricky without passing the req/res to the service or having the service return the new tokens.
            // Let's rely on the service throwing if it fails, but we need to update the session if it succeeds.
            // Actually, let's keep it simple: If 401, frontend should redirect to login or we handle refresh here.

            // Attempt refresh here if we have a refresh token
            if (req.session.refreshToken) {
                try {
                    const newTokens = await refreshAccessToken(req.session.refreshToken);
                    req.session.accessToken = newTokens.access_token;
                    req.session.refreshToken = newTokens.refresh_token;
                    req.session.expiresAt = Date.now() + (newTokens.expires_in * 1000);

                    // Retry the profile fetch
                    const profileData = await getProfile(
                        req.session.accessToken,
                        req.session.membershipId,
                        null // Don't pass refresh token to avoid infinite loop
                    );
                    return res.json(profileData);
                } catch (refreshErr) {
                    return res.status(401).json({ error: 'Session expired, please login again' });
                }
            }
        }

        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
