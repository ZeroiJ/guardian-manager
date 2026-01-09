import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'
import { getBungieConfig, Env } from '../config'
import { getManifestMetadata, getManifestTablePath } from '../manifest'

const app = new Hono<{ Bindings: Env }>()

// Hardcoded credentials for debugging
const CLIENT_ID = '51042'
const CLIENT_SECRET = 'g4K4fPwbN0H-zewTWvAQPulHdB.yj7lx-UtJO6ZdIfE'

// DEBUG: Log all requests
app.use('*', async (c, next) => {
  console.log(`[Hono] Request: ${c.req.method} ${c.req.path}`)
  await next()
})

// Explicitly use /api prefix instead of basePath to avoid ambiguity
app.get('/api', (c) => {
  return c.text('Guardian Nexus API is running on Pages (Root)!')
})

app.get('/api/debug', (c) => {
  return c.json({
    message: 'Debug endpoint',
    path: c.req.path,
    url: c.req.url,
    method: c.req.method,
    client_id: CLIENT_ID // Echo back to verify
  })
})

app.get('/api/auth/login', (c) => {
  const config = getBungieConfig(c.env)
  const state = crypto.randomUUID()
  
  setCookie(c, 'oauth_state', state, {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 600, // 10 minutes
    sameSite: 'Lax',
  })

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    state: state,
    // NO redirect_uri - rely on Portal registration
  })

  return c.redirect(`${config.authUrl}?${params.toString()}`)
})

app.get('/api/auth/callback', async (c) => {
  console.log('[OAuth Callback] Starting callback handler...');
  
  const config = getBungieConfig(c.env)
  const code = c.req.query('code')
  const state = c.req.query('state')
  const storedState = getCookie(c, 'oauth_state')

  console.log('[OAuth Callback] Code received:', code ? 'YES' : 'NO');
  console.log('[OAuth Callback] State received:', state);
  console.log('[OAuth Callback] Stored state:', storedState);

  if (!code || !state || state !== storedState) {
    console.error('[OAuth Callback] Validation failed - Invalid state or missing code');
    return c.text('Invalid state or missing code', 400)
  }

  console.log('[OAuth Callback] Exchanging code for tokens...');
  
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      // No client_id/secret in body when using Basic Auth
      // No redirect_uri - rely on Portal default
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`[OAuth Callback] Token exchange failed: ${response.status} ${error}`)
    return c.text(`Token exchange failed [${response.status}]: ${error}`, 400)
  }

  const tokens = await response.json() as any
  console.log('[OAuth Callback] Tokens received successfully');
  console.log('[OAuth Callback] Token keys:', Object.keys(tokens));
  
  setCookie(c, 'bungie_auth', JSON.stringify(tokens), {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 3600 * 24 * 30, // 30 days
    sameSite: 'Lax',
  })

  console.log('[OAuth Callback] Cookie set, redirecting to /dashboard');
  return c.redirect('/dashboard')
})

app.get('/api/profile', async (c) => {
  console.log('[Profile API] Starting profile fetch...');
  
  const config = getBungieConfig(c.env)
  const authCookie = getCookie(c, 'bungie_auth')
  
  if (!authCookie) {
    console.error('[Profile API] No auth cookie found');
    return c.text('Unauthorized', 401)
  }

  let tokens;
  try {
    tokens = JSON.parse(authCookie)
    console.log('[Profile API] Auth cookie parsed successfully');
  } catch (err) {
    console.error('[Profile API] Failed to parse auth cookie:', err);
    return c.text('Invalid auth cookie', 401)
  }
  
  console.log('[Profile API] Fetching memberships...');
  const membershipsRes = await fetch('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/', {
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  if (!membershipsRes.ok) {
    const errorText = await membershipsRes.text();
    console.error(`[Profile API] Failed to fetch memberships: ${membershipsRes.status} - ${errorText}`);
    return c.text(`Failed to fetch memberships: ${errorText}`, membershipsRes.status as any)
  }
  
  const membershipsData = await membershipsRes.json() as any
  console.log('[Profile API] Memberships fetched:', membershipsData.Response?.destinyMemberships?.length || 0);
  
  if (!membershipsData.Response?.destinyMemberships?.length) {
    console.error('[Profile API] No Destiny membership found');
    return c.text('No Destiny membership found', 404)
  }
  
  const destinyMembership = membershipsData.Response.destinyMemberships[0]
  const { membershipType, membershipId } = destinyMembership
  console.log(`[Profile API] Using membership: Type=${membershipType}, ID=${membershipId}`);

  const profileUrl = `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,104,200,201,205,300,1200`
  console.log(`[Profile API] Fetching profile data from: ${profileUrl}`);
  
  const profileRes = await fetch(profileUrl, {
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  if (!profileRes.ok) {
    const errorText = await profileRes.text();
    console.error(`[Profile API] Failed to fetch profile: ${profileRes.status} - ${errorText}`);
    return c.text(`Failed to fetch profile: ${errorText}`, profileRes.status as any)
  }
  
  const profileData = await profileRes.json() as any
  console.log('[Profile API] Profile data fetched successfully');

  // DEBUG: Titan Data Verification
  const characters = profileData.Response?.characters?.data || {};
  const titan = Object.values(characters).find((c: any) => c.classType === 0);
  if (titan) {
    console.log('[Profile API] Titan Found:', (titan as any).characterId);
    console.log('[Profile API] Titan Emblem:', `https://www.bungie.net${(titan as any).emblemPath}`);
  }

  console.log('[Profile API] Returning profile response');
  return c.json(profileData.Response)
})

app.get('/api/manifest/version', async (c) => {
  const config = getBungieConfig(c.env)
  const cacheKey = 'manifest_version'
  const cached = await c.env.guardian_kv.get(cacheKey)
  
  if (cached) {
    return c.json(JSON.parse(cached))
  }

  try {
    const manifest = await getManifestMetadata(config.apiKey)
    await c.env.guardian_kv.put(cacheKey, JSON.stringify(manifest), {
      expirationTtl: 3600
    })
    return c.json(manifest)
  } catch (error) {
    return c.text('Failed to fetch manifest', 500)
  }
})

app.get('/api/manifest/definitions/:table', async (c) => {
  const config = getBungieConfig(c.env)
  const table = c.req.param('table')
  const path = await getManifestTablePath(table, config.apiKey)

  if (!path) {
    return c.text('Table not found', 404)
  }

  const fullUrl = `https://www.bungie.net${path}`
  
  const response = await fetch(fullUrl)

  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
    }
  })
})

app.post('/api/actions/transfer', async (c) => {
  const config = getBungieConfig(c.env)
  const authCookie = getCookie(c, 'bungie_auth')
  if (!authCookie) return c.text('Unauthorized', 401)

  const tokens = JSON.parse(authCookie)
  const body = await c.req.json() as any

  const response = await fetch('https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/', {
    method: 'POST',
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    return c.text(errorText, response.status as any)
  }

  const data = await response.json()
  return c.json(data)
})

app.get('/api/metadata', async (c) => {
  const authCookie = getCookie(c, 'bungie_auth')
  if (!authCookie) return c.json({ tags: {}, notes: {} })

  const tokens = JSON.parse(authCookie)
  const membershipId = tokens.membership_id

  const metadata = await c.env.guardian_db.prepare(
    'SELECT tags, notes FROM UserMetadata WHERE bungieMembershipId = ?'
  ).bind(membershipId).first()

  if (!metadata) {
    return c.json({ tags: {}, notes: {} })
  }

  return c.json({
    tags: JSON.parse((metadata.tags as string) || '{}'),
    notes: JSON.parse((metadata.notes as string) || '{}')
  })
})

app.post('/api/metadata', async (c) => {
  const authCookie = getCookie(c, 'bungie_auth')
  if (!authCookie) return c.text('Unauthorized', 401)

  const tokens = JSON.parse(authCookie)
  const membershipId = tokens.membership_id
  const { itemId, type, value } = await c.req.json() as any

  // 1. Get existing metadata
  const existing = await c.env.guardian_db.prepare(
    'SELECT tags, notes FROM UserMetadata WHERE bungieMembershipId = ?'
  ).bind(membershipId).first()

  let tags = JSON.parse((existing?.tags as string) || '{}')
  let notes = JSON.parse((existing?.notes as string) || '{}')

  // 2. Update specific field
  if (type === 'tag') {
    if (value) tags[itemId] = value; else delete tags[itemId];
  } else if (type === 'note') {
    if (value) notes[itemId] = value; else delete notes[itemId];
  }

  // 3. Save back to D1
  if (!existing) {
    await c.env.guardian_db.prepare(
      'INSERT INTO UserMetadata (bungieMembershipId, tags, notes) VALUES (?, ?, ?)'
    ).bind(membershipId, JSON.stringify(tags), JSON.stringify(notes)).run()
  } else {
    await c.env.guardian_db.prepare(
      'UPDATE UserMetadata SET tags = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE bungieMembershipId = ?'
    ).bind(JSON.stringify(tags), JSON.stringify(notes), membershipId).run()
  }

  return c.json({ success: true })
})

// Catch-all 404 handler
app.all('*', (c) => {
    return c.json({
        error: 'Not Found (Hono Catch-All)',
        path: c.req.path,
        method: c.req.method
    }, 404)
})

export const onRequest = handle(app)
