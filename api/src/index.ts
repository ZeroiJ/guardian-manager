import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { getBungieConfig } from './config'

const app = new Hono<{ Bindings: Env }>()

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

export default app
