import { handle } from 'hono/vercel'
import app from '../src/index.js'

// Node.js runtime, not Edge: the bundled sightings dataset (~7 MB) exceeds the
// Edge function size limit, and Node has no such constraint.
export const config = {
  runtime: 'nodejs'
}

export default handle(app)
