import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'
import {
  getCurrentUser,
  login as authLogin,
  logout as authLogout,
  seedDefaultAdmin,
} from '../services/auth'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    seedDefaultAdmin().then(() => {
      setUser(getCurrentUser())
      setLoading(false)
    })
  }, [])

  const login = async (email: string, password: string) => {
    const u = await authLogin(email, password)
    if (u) {
      setUser(u)
      return true
    }
    return false
  }

  const logout = () => {
    authLogout()
    setUser(null)
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
