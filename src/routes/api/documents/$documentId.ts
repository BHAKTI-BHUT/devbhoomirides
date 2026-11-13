// Streams an uploaded driver document. Only admins and the driver who uploaded it may view it.
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '../../../../db/index.js'
import { driverDocuments, driverProfiles } from '../../../../db/schema.js'
import { documentStore } from '@/server/drivers'
import { AppError } from '@/server/errors'
import { requireUser } from '@/server/session'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/api/documents/$documentId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const user = await requireUser()
          if (!UUID.test(params.documentId)) return new Response('Not found', { status: 404 })
          const [doc] = await db
            .select({ d: driverDocuments, ownerId: driverProfiles.userId })
            .from(driverDocuments)
            .innerJoin(driverProfiles, eq(driverProfiles.id, driverDocuments.driverId))
            .where(eq(driverDocuments.id, params.documentId))
            .limit(1)
          if (!doc || (user.role !== 'admin' && doc.ownerId !== user.id)) return new Response('Not found', { status: 404 })
          const body = await documentStore().get(doc.d.blobKey, { type: 'arrayBuffer' })
          if (!body) return new Response('Not found', { status: 404 })
          return new Response(body, {
            headers: {
              'Content-Type': doc.d.contentType,
              'Content-Disposition': `inline; filename="${doc.d.fileName.replace(/[^\w.\- ]/g, '_')}"`,
              'Cache-Control': 'private, no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (err) {
          const status = err instanceof AppError && err.code === 'unauthenticated' ? 401 : err instanceof AppError ? 403 : 500
          if (status === 500) console.error('[documents]', err)
          return new Response(status === 401 ? 'Please sign in to continue.' : 'Not available', { status })
        }
      },
    },
  },
})
