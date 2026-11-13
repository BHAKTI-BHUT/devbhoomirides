// Browser auth state from Netlify Identity. Roles shown in the UI are hints only —
// every protected server function re-checks the role on the server.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getUser, logout as nlLogout, onAuthChange, type User } from '@netlify/identity'

type IdentityContextValue = { user: User | null; ready: boolean; logout: () => Promise<void> }

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getUser()
      .then((u) => setUser(u ?? null))
      .finally(() => setReady(true))
    return onAuthChange((_event, u) => setUser(u ?? null))
  }, [])

  return <IdentityContext.Provider value={{ user, ready, logout: nlLogout }}>{children}</IdentityContext.Provider>
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within an IdentityProvider')
  return ctx
}
