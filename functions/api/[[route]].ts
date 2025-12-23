import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'
import { getBungieConfig, Env } from '../config'
import { getManifestMetadata, getManifestTablePath } from '../manifest'

const app = new Hono<{ Bindings: Env }>()

// Define the production redirect URI - MUST match Bungie Portal EXACTLY
const REDIRECT_URI = 'https://guardian-manager.pages.dev/api/auth/callback'

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
    redirect_uri: REDIRECT_URI
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
    client_id: config.clientId,
    response_type: 'code',
    state: state,
    redirect_uri: REDIRECT_URI, // Explicitly send it
  })

  return c.redirect(`${config.authUrl}?${params.toString()}`)
})

app.get('/api/auth/callback', async (c) => {
  const config = getBungieConfig(c.env)
  const code = c.req.query('code')
  const state = c.req.query('state')
  const storedState = getCookie(c, 'oauth_state')

  if (!code || !state || state !== storedState) {
    return c.text('Invalid state or missing code', 400)
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: config.clientId.trim(), // Trim whitespace!
      client_secret: config.clientSecret.trim(), // Trim whitespace!
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`[Bungie Auth] Token exchange failed: ${response.status} ${error}`)
    return c.text(`Token exchange failed [${response.status}]: ${error}`, 400)
  }

  const tokens = await response.json() as any
  
  setCookie(c, 'bungie_auth', JSON.stringify(tokens), {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 3600 * 24 * 30, // 30 days
    sameSite: 'Lax',
  })

  return c.redirect('/dashboard')
})

app.get('/api/profile', async (c) => {
  const config = getBungieConfig(c.env)
  const authCookie = getCookie(c, 'bungie_auth')
  if (!authCookie) return c.text('Unauthorized', 401)

  const tokens = JSON.parse(authCookie)
  
  const membershipsRes = await fetch('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/', {
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  if (!membershipsRes.ok) return c.text('Failed to fetch memberships', membershipsRes.status as any)
  const membershipsData = await membershipsRes.json() as any
  
  if (!membershipsData.Response?.destinyMemberships?.length) {
    return c.text('No Destiny membership found', 404)
  }
  
  const destinyMembership = membershipsData.Response.destinyMemberships[0]
  const { membershipType, membershipId } = destinyMembership

  const profileUrl = `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,200,201,205,300`
  
  const profileRes = await fetch(profileUrl, {
    headers: {
      'X-API-Key': config.apiKey,
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  if (!profileRes.ok) return c.text('Failed to fetch profile', profileRes.status as any)
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
      expirationTtl: 3600
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
    }
  })
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
