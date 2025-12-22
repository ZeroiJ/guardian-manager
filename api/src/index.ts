import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Guardian Nexus API is running!')
})

export default app