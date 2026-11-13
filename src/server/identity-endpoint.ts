export function getIdentityEndpoint(requestUrl: string): URL | null {
  const configured = process.env.NETLIFY_IDENTITY_URL ?? process.env.URL
  if (!configured) return null
  try {
    const endpoint = new URL('/.netlify/identity', configured)
    if (endpoint.protocol !== 'https:' || endpoint.origin === new URL(requestUrl).origin) return null
    return endpoint
  } catch {
    return null
  }
}
