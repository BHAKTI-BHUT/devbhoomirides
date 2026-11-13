import type { H3Event } from 'nitro'
import { getIdentityEndpoint } from './identity-endpoint.ts'

const identityPath = '/.netlify/identity'
const allowedPaths = new Set(['/settings', '/signup', '/token', '/user', '/recover', '/verify', '/logout', '/authorize', '/callback'])

export default async function identityProxy(event: H3Event): Promise<Response> {
  const request = event.req
  const requestUrl = new URL(request.url)
  const path = requestUrl.pathname.slice(identityPath.length)
  if (!allowedPaths.has(path)) return new Response(null, { status: 404 })
  const endpoint = getIdentityEndpoint(request.url)
  if (!endpoint) {
    return Response.json({ error: 'Sign-in is not configured on this host.' }, { status: 503 })
  }
  const target = new URL(`${endpoint.pathname}${path}${requestUrl.search}`, endpoint.origin)
  const headers = new Headers()
  for (const name of ['authorization', 'content-type', 'accept']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const options: RequestInit & { duplex: 'half' } = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    duplex: 'half',
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  }
  try {
    const upstream = await fetch(target, options)
    const responseHeaders = new Headers({ 'cache-control': 'no-store' })
    for (const name of ['content-type', 'location']) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  } catch {
    return Response.json({ error: 'The sign-in service is unavailable.' }, { status: 502 })
  }
}
