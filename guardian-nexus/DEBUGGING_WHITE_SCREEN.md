# White Screen After OAuth Login - Debugging Guide

## Problem
After logging in via Bungie's OAuth, the website shows a white/blank screen instead of the dashboard.

## Root Causes (Possible)
1. **JavaScript Error in React Component** - An uncaught error in ArsenalPage or its child components
2. **API Authentication Failure** - The auth cookie isn't being set or read correctly
3. **Profile Fetch Failure** - The /api/profile endpoint is returning an error
4. **Missing Data** - The profile data structure doesn't match what the frontend expects
5. **CORS/Cookie Issues** - Cookies aren't being sent with credentials

## Changes Made to Help Debug

### 1. Error Boundary Added
- **File**: `guardian-nexus/src/pages/ErrorBoundary.tsx`
- **Purpose**: Catches React rendering errors and displays them instead of white screen
- **What to look for**: If you see an error boundary screen instead of white screen, it will show the exact error message and stack trace

### 2. Enhanced Logging - Frontend

#### API Client (`guardian-nexus/src/services/api/client.ts`)
- Logs every API request: `[APIClient] Requesting: GET /api/profile`
- Logs response status: `[APIClient] Response status: 200`
- Logs error bodies when requests fail
- Logs successful responses

#### useProfile Hook (`guardian-nexus/src/hooks/useProfile.ts`)
- Logs when profile fetch starts: `[useProfile] Starting profile fetch...`
- Logs success/failure for both profile and metadata
- Provides detailed error messages

### 3. Enhanced Logging - Backend

#### OAuth Callback (`guardian-nexus/functions/api/[[route]].ts`)
- `[OAuth Callback] Starting callback handler...`
- Shows if code and state were received
- Shows token exchange status
- Confirms cookie is set before redirect

#### Profile API (`guardian-nexus/functions/api/[[route]].ts`)
- `[Profile API] Starting profile fetch...`
- Shows each step: auth cookie, memberships, profile data
- Logs errors with full details

### 4. 404 Catch-All Route
- **File**: `guardian-nexus/src/App.tsx`
- **Purpose**: Shows a user-friendly page if someone lands on a non-existent route
- **What to look for**: If you see "PAGE NOT FOUND" instead of white screen, the route doesn't exist

## How to Debug

### Step 1: Open Browser DevTools
1. Press `F12` or right-click → Inspect
2. Go to the **Console** tab
3. Clear the console
4. Try logging in again
5. Watch for log messages in this order:

#### Expected Login Flow Logs:
```
[OAuth Callback] Starting callback handler...
[OAuth Callback] Code received: YES
[OAuth Callback] State received: [some-uuid]
[OAuth Callback] Stored state: [same-uuid]
[OAuth Callback] Exchanging code for tokens...
[OAuth Callback] Tokens received successfully
[OAuth Callback] Token keys: ["access_token", "token_type", ...]
[OAuth Callback] Cookie set, redirecting to /dashboard
```

#### Expected Dashboard Load Logs:
```
[useProfile] Starting profile fetch...
[APIClient] Requesting: GET /api/profile
[APIClient] Response status: 200
[Profile API] Starting profile fetch...
[Profile API] Auth cookie parsed successfully
[Profile API] Fetching memberships...
[Profile API] Memberships fetched: 1
[Profile API] Using membership: Type=3, ID=...
[Profile API] Fetching profile data from: https://...
[Profile API] Profile data fetched successfully
[useProfile] Profile fetched successfully
[APIClient] Requesting: GET /api/metadata
[useProfile] Metadata fetched successfully
```

### Step 2: Check for Errors
Look for RED error messages in console:
- `[APIClient] Error response body: ...` - Shows what the API returned
- `[Profile API] Failed to fetch profile: ...` - Backend error
- `[useProfile] Error in refresh: ...` - Frontend error
- Any uncaught errors or stack traces

### Step 3: Check Network Tab
1. Go to **Network** tab in DevTools
2. Try logging in again
3. Look for these requests:
   - `/api/auth/callback?code=...&state=...` - Should return 302 redirect
   - `/api/profile` - Should return 200 with JSON data
   - `/api/metadata` - Should return 200 with JSON data

4. Click on any failed request (red) and check:
   - **Response** tab - What error did the server return?
   - **Cookies** tab - Is `bungie_auth` cookie present?

### Step 4: Check Application Tab
1. Go to **Application** tab
2. Expand **Cookies** in left sidebar
3. Click on your site's URL
4. Look for `bungie_auth` cookie:
   - Is it there?
   - What's its value? (Should be a JSON string)
   - Is it HttpOnly?
   - Is the Path set to `/`?

### Step 5: Common Issues & Fixes

#### Issue: No `bungie_auth` cookie
**Fix**: Check OAuth callback logs. Token exchange might be failing.

#### Issue: Cookie exists but `/api/profile` returns 401
**Fix**: The cookie might be malformed or expired. Check the cookie value.

#### Issue: `/api/profile` returns 500 or error
**Fix**: Check backend logs. Might be a Bungie API issue or missing API key.

#### Issue: Error Boundary shows "Cannot read property 'data' of undefined"
**Fix**: Profile data structure doesn't match expectations. Check:
- `profileData.Response?.characters?.data`
- `profileData.Response?.profileInventory?.data`

#### Issue: White screen with no errors
**Fix**: This is unusual with our logging. Check:
1. Are logs disabled? (Check browser console settings)
2. Is JavaScript blocked?
3. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Quick Fixes to Try

### Fix 1: Clear Cookies and Try Again
```javascript
// Run in browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
location.reload();
```

### Fix 2: Check if Already Logged In
```javascript
// Run in browser console
console.log('Auth Cookie:', document.cookie);
```

### Fix 3: Manual Redirect Test
```javascript
// Run in browser console after login
window.location.href = '/dashboard';
```

## Files Modified
- ✅ `guardian-nexus/src/pages/ErrorBoundary.tsx` - NEW
- ✅ `guardian-nexus/src/App.tsx` - Added ErrorBoundary wrapper + 404 route
- ✅ `guardian-nexus/src/services/api/client.ts` - Enhanced logging
- ✅ `guardian-nexus/src/hooks/useProfile.ts` - Enhanced logging + error handling
- ✅ `guardian-nexus/functions/api/[[route]].ts` - Enhanced logging for OAuth + Profile

## Next Steps After Finding Error

Once you identify the error from logs:

1. **If 401 Unauthorized**: Cookie isn't being sent or is invalid
2. **If 404 Not Found**: API route doesn't exist or wrong path
3. **If 500 Server Error**: Backend crash - check Cloudflare logs
4. **If React Error**: Component rendering issue - fix the component
5. **If Network Error**: CORS or connection issue

Share the console logs and I can provide specific fixes!