import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import type { User } from '../types'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfile(userId: string): Promise<User | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .single()
  return data ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Track intentional sign-out so we can distinguish it from spurious SIGNED_OUT
  // events that Supabase fires when a token refresh fails (common in CI/preview).
  const intendedSignOut = useRef(false)
  // Monotonically increasing counter – used to ignore stale fetchProfile results
  // when multiple auth-state-change events fire in rapid succession.
  const authSeqRef = useRef(0)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
        }
      } catch {
        // getSession or fetchProfile threw – treat as no session
      } finally {
        setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const seq = ++authSeqRef.current
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        // Ignore stale results if a newer auth event has already taken effect
        if (seq === authSeqRef.current && profile) setUser(profile)
      } else if (event === 'SIGNED_OUT') {
        if (intendedSignOut.current) {
          // Intentional logout – clear user immediately
          setUser(null)
        } else {
          // Spurious SIGNED_OUT (e.g. failed token refresh in CI).
          // Re-check the actual session: if it's gone, clear user; otherwise keep it.
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (!currentSession) setUser(null)
          // else: session is still valid – keep the current user state as-is
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return !error
  }

  const logout = async () => {
    intendedSignOut.current = true
    await supabase.auth.signOut()
    // Fallback: ensure user is cleared even if the SIGNED_OUT event already did it.
    setUser(null)
    intendedSignOut.current = false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
