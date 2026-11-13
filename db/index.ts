// Server-only database client. Never import this from browser code — only from
// server functions, API routes or Netlify Functions.
import { drizzle } from 'drizzle-orm/netlify-db'
import * as schema from './schema.js'

const createDatabase = () => {
  if (!process.env.NETLIFY_DB_URL) {
    throw new Error('Database access is not configured on this host.')
  }
  return drizzle({ schema })
}

let database: ReturnType<typeof createDatabase> | undefined

export const db = new Proxy({} as ReturnType<typeof createDatabase>, {
  get(_target, property) {
    database ??= createDatabase()
    const value = Reflect.get(database, property, database)
    return typeof value === 'function' ? value.bind(database) : value
  },
})
export { schema }
