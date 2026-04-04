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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUser(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile) setUser(profile)
      } else if (event === 'SIGNED_OUT' && intendedSignOut.current) {
        // Only clear user on an intentional logout, not on spurious SIGNED_OUT
        // (e.g. from a failed token refresh in CI / unstable networks).
        setUser(null)
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
