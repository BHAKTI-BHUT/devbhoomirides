import { getUser, type User } from '@netlify/identity'
import { getCookie, getRequest } from '@tanstack/react-start/server'
import { getIdentityEndpoint } from './identity-endpoint'
import { AppError } from './errors'

export async function getIdentityUser(): Promise<User | null> {
  const runtime = globalThis as typeof globalThis & {
    Netlify?: { context?: unknown }
    netlifyIdentityContext?: unknown
  }
  if (runtime.Netlify?.context || runtime.netlifyIdentityContext) return getUser()
  const token = getCookie('nf_jwt')
  if (!token) return null
  const endpoint = getIdentityEndpoint(getRequest().url)
  if (!endpoint) throw new AppError('Sign-in is not configured on this host.', 'internal')
  let response: Response
  try {
    response = await fetch(`${endpoint.href}/user`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new AppError('The sign-in service is unavailable. Please try again.', 'internal')
  }
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new AppError('The sign-in service is unavailable. Please try again.', 'internal')
  const identity = await response.json()
  if (typeof identity.id !== 'string' || typeof identity.email !== 'string') {
    throw new AppError('The sign-in service returned an invalid session.', 'internal')
  }
  const metadata = identity.user_metadata ?? {}
  const roles = identity.app_metadata?.roles
  return {
    id: identity.id,
    email: identity.email,
    name: typeof metadata.full_name === 'string' ? metadata.full_name : typeof metadata.name === 'string' ? metadata.name : undefined,
    userMetadata: metadata,
    roles: Array.isArray(roles) && roles.every((role) => typeof role === 'string') ? roles : [],
  }
}
