import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { setCookie, getCookie } from 'hono/cookie'
import { getBungieConfig } from './config'
import { getManifestMetadata, getManifestTablePath } from './manifest'

const app = new Hono<{ Bindings: Env }>()

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: (origin) => {
    // Allow localhost (dev) and production domains
    return origin; 
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/', (c) => {
  return c.text('Guardian Nexus API is running!')
})

app.get('/auth/login', (c) => {
  const config = getBungieConfig(c.env)
  const state = crypto.randomUUID()
  
  // Set state in a secure cookie for validation in callback
  setCookie(c, 'oauth_state', state, {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 600, // 10 minutes
    sameSite: 'Lax',
  })

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    state: state,
  })

  return c.redirect(`${config.authUrl}?${params.toString()}`)
})

app.get('/auth/callback', async (c) => {
  const config = getBungieConfig(c.env)
  const code = c.req.query('code')
  const state = c.req.query('state')
  const storedState = getCookie(c, 'oauth_state')

  if (!code || !state || state !== storedState) {
    return c.text('Invalid state or missing code', 400)
  }

  // Exchange code for tokens
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return c.text(`Token exchange failed: ${error}`, 400)
  }

  const tokens = await response.json() as any
  
  // Store tokens in a secure session cookie
  setCookie(c, 'bungie_auth', JSON.stringify(tokens), {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 3600 * 24 * 30, // 30 days
    sameSite: 'Lax',
  })

  return c.text('Authenticated successfully! You can close this tab.')
})

app.get('/api/profile', async (c) => {
  const config = getBungieConfig(c.env)
  const authCookie = getCookie(c, 'bungie_auth')
  if (!authCookie) return c.text('Unauthorized', 401)

  const tokens = JSON.parse(authCookie)
  
  // 1. Get Membership Data for Current User
  const membershipsRes = await fetch('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/', {
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  if (!membershipsRes.ok) return c.text('Failed to fetch memberships', membershipsRes.status)
  const membershipsData = await membershipsRes.json() as any
  
  const destinyMembership = membershipsData.Response.destinyMemberships[0]
  if (!destinyMembership) return c.text('No Destiny membership found', 404)

  const { membershipType, membershipId } = destinyMembership

  // 2. Get Profile Data (Components: 100, 102, 200, 201, 205, 300)
  const profileUrl = `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,200,201,205,300`
  
  const profileRes = await fetch(profileUrl, {
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  if (!profileRes.ok) return c.text('Failed to fetch profile', profileRes.status)
  const profileData = await profileRes.json() as any

  return c.json(profileData.Response)
})

app.get('/api/manifest/version', async (c) => {
  const cacheKey = 'manifest_version'
  const cached = await c.env.guardian_kv.get(cacheKey)
  
  if (cached) {
    return c.json(JSON.parse(cached))
  }

  try {
    const manifest = await getManifestMetadata()
    await c.env.guardian_kv.put(cacheKey, JSON.stringify(manifest), {
      expirationTtl: 3600 // 1 hour
    })
    return c.json(manifest)
  } catch (error) {
    return c.text('Failed to fetch manifest', 500)
  }
})

app.get('/api/manifest/definitions/:table', async (c) => {
  const table = c.req.param('table')
  const path = await getManifestTablePath(table)

  if (!path) {
    return c.text('Table not found', 404)
  }

  const fullUrl = `https://www.bungie.net${path}`
  
  const response = await fetch(fullUrl)

  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    }
  })
})

export default app
