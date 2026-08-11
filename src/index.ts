import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { openApiJsonResponse } from './openapi.js'
import { swaggerUiResponse } from './swaggerUi.js'
import sightingsData from '../sightings.json'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

const IMG_BASE = 'https://snake-cdn.0xcucumbersalad.dev/img'

// Every sighting originates from this public Facebook group. The `source_url`
// links back to the exact post a record was identified from.
const FB_GROUP_BASE = 'https://facebook.com/groups/900072927547214'

// Flatten every province's photos once, keep only the admin-verified ones,
// and sort them stably (province, scientific name, key) so paging with
// limit/offset never skips or repeats a record between requests.
const ADMIN_SIGHTINGS: any[] = (() => {
  const provinces = (sightingsData as any).provinces || {}
  let all: any[] = []
  for (const prov of Object.keys(provinces)) {
    all = all.concat(provinces[prov].photos || [])
  }
  return all
    .filter(s => s.authority === 'admin' || s.admin === true)
    .sort((a, b) =>
      (a.location || '').localeCompare(b.location || '') ||
      (a.species || '').localeCompare(b.species || '') ||
      (a.key || '').localeCompare(b.key || '')
    )
})()

// Shape a raw record into the public API's Sighting object.
function toSighting(s: any) {
  return {
    key: s.key,
    species: s.species,
    common: s.common,
    venom: s.venom,
    family: s.family || null,
    endemic: s.endemic || null,
    province: s.location, // As requested by schema (fallback to location)
    location: s.location || null,
    authority: s.authority,
    shed: s.shed || false,
    image: `${IMG_BASE}/${s.key}`,
    post_id: s.post_id || null,
    source_url: s.post_id ? `${FB_GROUP_BASE}/${s.post_id}` : null,
    admin_comments: s.admin_comments || []
  }
}

app.get('/', (c) => c.redirect('/api/docs'))

app.get('/api/openapi.json', (c) => {
  return openApiJsonResponse(c.req.raw)
})

app.get('/api/docs', (c) => {
  return swaggerUiResponse('/api/openapi.json')
})

app.get('/api/terms', (c) => {
  return c.text("Terms of Service - Open Data API")
})

app.get('/api/sightings', (c) => {
  const qLimit = c.req.query('limit')
  const qOffset = c.req.query('offset')
  const province = c.req.query('province')
  const species = c.req.query('species')
  const venom = c.req.query('venom')
  const q = c.req.query('q')

  let filtered = ADMIN_SIGHTINGS

  if (province) {
    filtered = filtered.filter(s => s.location === province)
  }
  if (species) {
    filtered = filtered.filter(s => s.species === species)
  }
  if (venom) {
    filtered = filtered.filter(s => s.venom === venom)
  }
  if (q) {
    const qLower = q.toLowerCase()
    filtered = filtered.filter(s => 
      (s.common && s.common.toLowerCase().includes(qLower)) ||
      (s.species && s.species.toLowerCase().includes(qLower)) ||
      (s.location && s.location.toLowerCase().includes(qLower))
    )
  }

  const limit = Math.min(parseInt(qLimit || '50', 10), 200)
  const offset = Math.max(parseInt(qOffset || '0', 10), 0)
  
  const total = filtered.length
  const sightings = filtered.slice(offset, offset + limit).map(toSighting)

  return c.json({
    total,
    limit,
    offset,
    count: sightings.length,
    sightings
  })
})

app.get('/api/sightings/:key', (c) => {
  const key = c.req.param('key')

  const s = ADMIN_SIGHTINGS.find(x => x.key === key)
  if (!s) {
    return c.json({ error: "not found" }, 404)
  }

  return c.json(toSighting(s))
})

export default app
